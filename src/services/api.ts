import type {
  AttackMethod,
  BackendHealth,
  CloakResult,
  HistoryItem,
  ModelCatalogItem,
  ModelId,
  ProtectionMode,
  TransferabilityResult,
  UserProfile,
} from '../types';

export const DEFAULT_FASTAPI_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://localhost:8000';

export function normalizeBackendUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) {
    throw new Error('Backend URL cannot be empty.');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Please enter a valid http:// or https:// URL (for example http://localhost:8000).');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// backend URLs are permitted.');
  }
  return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === 'string') return data.detail;
    if (typeof data?.error === 'string') return data.error;
    if (Array.isArray(data?.detail) && data.detail[0]?.msg) {
      return String(data.detail[0].msg);
    }
  } catch {
    // Non-JSON response
  }
  return `${fallback} (HTTP ${response.status})`;
}

// ============================================================
// Express Server — Development Auth & Opt-in Session History
// ============================================================

export async function devRegister(payload: {
  name: string;
  email: string;
  password: string;
  institution?: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Registration failed'));
  }
  return res.json();
}

export async function devLogin(payload: {
  email: string;
  password: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Sign-in failed'));
  }
  return res.json();
}

export async function devLogout(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function devForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Password reset request failed'));
  }
  return res.json();
}

export async function devUpdateProfile(
  token: string,
  updates: Partial<Pick<UserProfile, 'name' | 'institution' | 'role' | 'saveHistoryByDefault'>>
): Promise<{ user: UserProfile }> {
  const res = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not update profile'));
  }
  return res.json();
}

export async function fetchServerHistory(token: string): Promise<HistoryItem[]> {
  const res = await fetch('/api/history', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not fetch history'));
  }
  const data = await res.json();
  return Array.isArray(data?.entries) ? data.entries : [];
}

export async function saveServerHistory(
  token: string,
  entry: Omit<HistoryItem, 'id' | 'createdAt'>
): Promise<HistoryItem> {
  const res = await fetch('/api/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not save history record'));
  }
  const data = await res.json();
  return data.entry;
}

export async function deleteServerHistoryEntry(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not delete history record'));
  }
}

export async function clearServerHistory(token: string): Promise<void> {
  const res = await fetch('/api/history', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not clear history'));
  }
}

// ============================================================
// Python FastAPI + PyTorch Cloaking Engine Endpoints
// ============================================================

export async function checkFastApiHealth(baseUrl: string): Promise<BackendHealth> {
  const safeBase = normalizeBackendUrl(baseUrl);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${safeBase}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Backend health check failed'));
    }
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Health check timed out after 5 seconds for ${safeBase}.`);
    }
    if (err instanceof TypeError) {
      throw new Error(
        `Cannot reach FastAPI backend at ${safeBase}. Ensure the Python server is running and CORS allows this origin.`
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchFastApiModels(baseUrl: string): Promise<ModelCatalogItem[]> {
  const safeBase = normalizeBackendUrl(baseUrl);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${safeBase}/models`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Failed to fetch model catalog'));
    }
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models : [];
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestImageCloaking(params: {
  baseUrl: string;
  file: File;
  originalDataUrl: string;
  model: ModelId;
  attack: AttackMethod;
  protectionMode: ProtectionMode;
  strength: number;
  timeoutMs?: number;
}): Promise<CloakResult> {
  const safeBase = normalizeBackendUrl(params.baseUrl);
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('model', params.model);
  formData.append('attack', params.attack);
  formData.append('protection_mode', params.protectionMode);
  formData.append('strength', String(params.strength));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), params.timeoutMs ?? 120000);

  try {
    const res = await fetch(`${safeBase}/cloak`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('Image exceeds the 10 MB upload size or maximum safe pixel count.');
      }
      if (res.status === 415) {
        throw new Error('Unsupported image format. Please upload a valid PNG, JPEG, or WebP file.');
      }
      if (res.status === 507) {
        throw new Error('Backend reported insufficient memory for this image. Try a smaller resolution.');
      }
      throw new Error(await parseErrorMessage(res, 'Adversarial cloaking request failed'));
    }

    const data = await res.json();
    return {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      fileName: params.file.name,
      originalDataUrl: params.originalDataUrl,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'Processing timed out after 120 seconds. ViT-B/16 with 10-step PGD on CPU can take longer on large images.'
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        `FastAPI PyTorch backend is unreachable at ${safeBase}. Start the Python server (cd backend && uvicorn main:app --port 8000) or update the API Base URL in Settings.`
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function requestTransferabilityEvaluation(params: {
  baseUrl: string;
  file: File;
  sourceModel: ModelId;
  attack: AttackMethod;
  protectionMode: ProtectionMode;
  strength: number;
}): Promise<TransferabilityResult> {
  const safeBase = normalizeBackendUrl(params.baseUrl);
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('source_model', params.sourceModel);
  formData.append('attack', params.attack);
  formData.append('protection_mode', params.protectionMode);
  formData.append('strength', String(params.strength));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(`${safeBase}/evaluate/transferability`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Transferability evaluation failed'));
    }
    return await res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Transferability evaluation timed out after 180 seconds.');
    }
    if (err instanceof TypeError) {
      throw new Error(
        `FastAPI PyTorch backend is unreachable at ${safeBase}. Ensure the Python server is running.`
      );
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

/**
 * Downscale a data URI into a compact thumbnail strictly when the user explicitly opts in
 * to saving an entry to session history.
 */
export async function createThumbnailDataUrl(dataUrl: string, maxEdge = 280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('Failed to render thumbnail'));
    img.src = dataUrl;
  });
}
