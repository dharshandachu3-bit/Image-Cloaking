import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Session signing secret: reads from server env with ephemeral random fallback
const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET && process.env.AUTH_SESSION_SECRET.length >= 16
    ? process.env.AUTH_SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface StoredUser {
  id: string;
  email: string;
  name: string;
  institution: string;
  role: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  saveHistoryByDefault: boolean;
}

interface HistoryEntry {
  id: string;
  userId: string;
  createdAt: string;
  fileName: string;
  model: string;
  attack: string;
  protectionMode: string;
  strength: number;
  epsilon: number;
  originalClass: string;
  cloakedClass: string;
  originalConfidence: number;
  cloakedConfidence: number;
  confidenceDrop: number;
  ssim: number;
  processingTimeMs: number;
  width: number;
  height: number;
  misclassified: boolean;
  status: 'completed' | 'failed';
  originalThumbnail?: string;
  cloakedThumbnail?: string;
  diffThumbnail?: string;
  activationMapOriginal?: number[][];
  activationMapCloaked?: number[][];
}

interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  token?: string;
}

// In-memory development auth store (reset on server restart; privacy-preserving by default)
const usersByEmail = new Map<string, StoredUser>();
const usersById = new Map<string, StoredUser>();
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();
const historyByUser = new Map<string, HistoryEntry[]>();
const passwordResetRequests = new Map<string, { email: string; expiresAt: number }>();

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const MAX_HISTORY_PER_USER = 30;

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

function issueToken(userId: string): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${userId}.${nonce}`)
    .digest('hex');
  const token = `${nonce}.${sig}`;
  activeSessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    institution: user.institution,
    role: user.role,
    createdAt: user.createdAt,
    saveHistoryByDefault: user.saveHistoryByDefault,
    authMode: 'development' as const,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const user = usersById.get(session.userId);
  if (!user) {
    activeSessions.delete(token);
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }

  req.user = user;
  req.token = token;
  next();
}

async function startServer() {
  const app = express();

  // Security headers compatible with iframe preview
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Limit JSON payload size (thumbnails only saved when user explicitly opts in)
  app.use(express.json({ limit: '6mb' }));

  // --- Auth Status ---
  app.get('/api/auth/status', (_req, res) => {
    res.json({
      mode: 'development',
      registeredUsersCount: usersById.size,
      note: 'Development Auth Mode is active because Firebase credentials are not configured. Passwords are salted and hashed with scrypt in server memory.',
    });
  });

  // --- Register ---
  app.post('/api/auth/register', (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const institution =
      typeof req.body?.institution === 'string'
        ? req.body.institution.trim().slice(0, 120)
        : 'AI & ML Research Lab';

    if (!isValidEmail(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      return;
    }
    if (usersByEmail.has(rawEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email: rawEmail,
      name,
      institution: institution || 'AI & ML Research Lab',
      role: 'ML Researcher',
      salt,
      passwordHash: hashPassword(password, salt),
      createdAt: new Date().toISOString(),
      saveHistoryByDefault: false, // Privacy-first default
    };

    usersByEmail.set(rawEmail, user);
    usersById.set(user.id, user);
    const token = issueToken(user.id);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  });

  // --- Login ---
  app.post('/api/auth/login', (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(rawEmail) || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = usersByEmail.get(rawEmail);
    if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = issueToken(user.id);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // --- Logout ---
  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.token) {
      activeSessions.delete(req.token);
    }
    res.json({ ok: true });
  });

  // --- Current User ---
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  // --- Update Profile ---
  app.patch('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.user!;
    if (typeof req.body?.name === 'string') {
      const trimmed = req.body.name.trim();
      if (trimmed.length < 2 || trimmed.length > 80) {
        res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
        return;
      }
      user.name = trimmed;
    }
    if (typeof req.body?.institution === 'string') {
      user.institution = req.body.institution.trim().slice(0, 120);
    }
    if (typeof req.body?.role === 'string') {
      user.role = req.body.role.trim().slice(0, 80);
    }
    if (typeof req.body?.saveHistoryByDefault === 'boolean') {
      user.saveHistoryByDefault = req.body.saveHistoryByDefault;
    }

    res.json({ user: sanitizeUser(user) });
  });

  // --- Forgot Password (Dev Mode) ---
  app.post('/api/auth/forgot-password', (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!isValidEmail(rawEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    // Do not reveal account existence; create an internal token if user exists
    if (usersByEmail.has(rawEmail)) {
      const resetToken = crypto.randomBytes(16).toString('hex');
      passwordResetRequests.set(resetToken, {
        email: rawEmail,
        expiresAt: Date.now() + 1000 * 60 * 15,
      });
    }

    res.json({
      ok: true,
      message:
        'If an account exists for that address, password recovery has been logged. In Development Auth Mode (without Firebase SMTP), configure Firebase Authentication in .env for automated email delivery.',
    });
  });

  // --- Opt-In Image History (Strictly User-Scoped) ---
  app.get('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const entries = historyByUser.get(req.user!.id) ?? [];
    res.json({ entries });
  });

  app.post('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const body = req.body;

    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid history payload.' });
      return;
    }

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
      fileName: String(body.fileName || 'image.png').slice(0, 180),
      model: String(body.model || 'resnet50').slice(0, 64),
      attack: String(body.attack || 'FGSM').slice(0, 32),
      protectionMode: String(body.protectionMode || 'standard').slice(0, 32),
      strength: Number(body.strength) || 0,
      epsilon: Number(body.epsilon) || 0,
      originalClass: String(body.originalClass || 'Unknown').slice(0, 120),
      cloakedClass: String(body.cloakedClass || 'Unknown').slice(0, 120),
      originalConfidence: Number(body.originalConfidence) || 0,
      cloakedConfidence: Number(body.cloakedConfidence) || 0,
      confidenceDrop: Number(body.confidenceDrop) || 0,
      ssim: Number(body.ssim) || 0,
      processingTimeMs: Number(body.processingTimeMs) || 0,
      width: Number(body.width) || 0,
      height: Number(body.height) || 0,
      misclassified: Boolean(body.misclassified),
      status: body.status === 'failed' ? 'failed' : 'completed',
      originalThumbnail:
        typeof body.originalThumbnail === 'string' &&
        body.originalThumbnail.startsWith('data:image/')
          ? body.originalThumbnail
          : undefined,
      cloakedThumbnail:
        typeof body.cloakedThumbnail === 'string' &&
        body.cloakedThumbnail.startsWith('data:image/')
          ? body.cloakedThumbnail
          : undefined,
      diffThumbnail:
        typeof body.diffThumbnail === 'string' &&
        body.diffThumbnail.startsWith('data:image/')
          ? body.diffThumbnail
          : undefined,
      activationMapOriginal: Array.isArray(body.activationMapOriginal)
        ? body.activationMapOriginal
        : undefined,
      activationMapCloaked: Array.isArray(body.activationMapCloaked)
        ? body.activationMapCloaked
        : undefined,
    };

    const existing = historyByUser.get(userId) ?? [];
    const updated = [entry, ...existing].slice(0, MAX_HISTORY_PER_USER);
    historyByUser.set(userId, updated);

    res.status(201).json({ entry });
  });

  app.delete('/api/history/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const entryId = req.params.id;
    const existing = historyByUser.get(userId) ?? [];
    const next = existing.filter((item) => item.id !== entryId);
    if (next.length === existing.length) {
      res.status(404).json({ error: 'History record not found.' });
      return;
    }
    historyByUser.set(userId, next);
    res.json({ ok: true });
  });

  app.delete('/api/history', requireAuth, (req: AuthenticatedRequest, res) => {
    historyByUser.set(req.user!.id, []);
    res.json({ ok: true });
  });

  // --- Vite Middleware (Dev) or Static Assets (Prod) ---
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
