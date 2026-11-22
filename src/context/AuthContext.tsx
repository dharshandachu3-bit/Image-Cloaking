import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  BackendHealth,
  CloakResult,
  HistoryItem,
  ModelCatalogItem,
  ModelId,
  TransferabilityResult,
  UserProfile,
} from '../types';
import { MODEL_CATALOG } from '../data/researchData';
import {
  DEFAULT_FASTAPI_URL,
  checkFastApiHealth,
  clearServerHistory,
  createThumbnailDataUrl,
  deleteServerHistoryEntry,
  devForgotPassword,
  devLogin,
  devLogout,
  devRegister,
  devUpdateProfile,
  fetchFastApiModels,
  fetchServerHistory,
  normalizeBackendUrl,
  saveServerHistory,
} from '../services/api';
import {
  createUserWithEmailAndPassword,
  firebaseSignOut,
  getFirebaseAuth,
  isFirebaseConfigured,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from '../services/firebase';

interface AppContextValue {
  user: UserProfile | null;
  authReady: boolean;
  authMode: 'firebase' | 'development';
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, institution?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  updateUserProfile: (
    updates: Partial<Pick<UserProfile, 'name' | 'institution' | 'role' | 'saveHistoryByDefault'>>
  ) => Promise<void>;

  // Backend connection state
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
  backendStatus: 'checking' | 'connected' | 'offline';
  backendHealth: BackendHealth | null;
  backendError: string | null;
  backendModels: ModelCatalogItem[];
  refreshBackendHealth: (overrideUrl?: string) => Promise<boolean>;

  // Live session cloaking results & opt-in history
  selectedModel: ModelId;
  setSelectedModel: (model: ModelId) => void;
  latestResult: CloakResult | null;
  setLatestResult: (result: CloakResult | null) => void;
  latestFile: File | null;
  setLatestFile: (file: File | null) => void;
  latestTransferability: TransferabilityResult | null;
  setLatestTransferability: (res: TransferabilityResult | null) => void;
  sessionRuns: CloakResult[];
  recordCompletedRun: (result: CloakResult, saveToHistory: boolean) => Promise<void>;

  historyItems: HistoryItem[];
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  // Bearer token held strictly in React memory (never persisted to localStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!isFirebaseConfigured);

  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(DEFAULT_FASTAPI_URL);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendModels, setBackendModels] = useState<ModelCatalogItem[]>(MODEL_CATALOG);

  const [selectedModel, setSelectedModel] = useState<ModelId>('resnet50');
  const [latestResult, setLatestResult] = useState<CloakResult | null>(null);
  const [latestFile, setLatestFile] = useState<File | null>(null);
  const [latestTransferability, setLatestTransferability] = useState<TransferabilityResult | null>(null);
  const [sessionRuns, setSessionRuns] = useState<CloakResult[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Subscribe to Firebase Auth if configured
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({
          id: fbUser.uid,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Researcher',
          institution: 'AI & ML Research Lab',
          role: 'ML Researcher',
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          saveHistoryByDefault: false,
          authMode: 'firebase',
        });
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const refreshBackendHealth = useCallback(
    async (overrideUrl?: string): Promise<boolean> => {
      const target = overrideUrl ?? apiBaseUrl;
      setBackendStatus('checking');
      setBackendError(null);

      try {
        const health = await checkFastApiHealth(target);
        setBackendHealth(health);
        setBackendStatus('connected');

        try {
          const models = await fetchFastApiModels(target);
          if (models.length > 0) {
            setBackendModels(models);
          }
        } catch {
          // Keep static model specifications if /models temporarily fails
        }
        return true;
      } catch (err) {
        setBackendHealth(null);
        setBackendStatus('offline');
        setBackendError(err instanceof Error ? err.message : 'Unable to reach FastAPI backend.');
        return false;
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    void refreshBackendHealth(apiBaseUrl);
  }, [apiBaseUrl, refreshBackendHealth]);

  const setApiBaseUrl = useCallback((url: string) => {
    const clean = normalizeBackendUrl(url);
    setApiBaseUrlState(clean);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (isFirebaseConfigured) {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase Auth is not initialized.');
      await signInWithEmailAndPassword(auth, email, password);
      return;
    }

    const { token, user: loggedInUser } = await devLogin({ email, password });
    setAuthToken(token);
    setUser(loggedInUser);
    try {
      const entries = await fetchServerHistory(token);
      setHistoryItems(entries);
    } catch {
      setHistoryItems([]);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, institution?: string) => {
      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Firebase Auth is not initialized.');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        setUser({
          id: cred.user.uid,
          email: cred.user.email || email,
          name,
          institution: institution || 'AI & ML Research Lab',
          role: 'ML Researcher',
          createdAt: new Date().toISOString(),
          saveHistoryByDefault: false,
          authMode: 'firebase',
        });
        return;
      }

      const { token, user: newUser } = await devRegister({ name, email, password, institution });
      setAuthToken(token);
      setUser(newUser);
      setHistoryItems([]);
    },
    []
  );

  const logout = useCallback(async () => {
    if (isFirebaseConfigured) {
      const auth = getFirebaseAuth();
      if (auth) await firebaseSignOut(auth);
    } else if (authToken) {
      try {
        await devLogout(authToken);
      } catch {
        // Ignore logout network error
      }
    }
    setAuthToken(null);
    setUser(null);
    setHistoryItems([]);
    setSessionRuns([]);
    setLatestResult(null);
    setLatestFile(null);
    setLatestTransferability(null);
  }, [authToken]);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    if (isFirebaseConfigured) {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error('Firebase Auth is not initialized.');
      await sendPasswordResetEmail(auth, email);
      return 'Password reset instructions have been sent to your email address via Firebase Auth.';
    }

    const res = await devForgotPassword(email);
    return res.message;
  }, []);

  const updateUserProfile = useCallback(
    async (
      updates: Partial<Pick<UserProfile, 'name' | 'institution' | 'role' | 'saveHistoryByDefault'>>
    ) => {
      if (!user) return;
      if (isFirebaseConfigured) {
        const auth = getFirebaseAuth();
        if (auth?.currentUser && updates.name) {
          await updateProfile(auth.currentUser, { displayName: updates.name });
        }
        setUser((prev) => (prev ? { ...prev, ...updates } : prev));
        return;
      }

      if (!authToken) throw new Error('Active session required.');
      const { user: updated } = await devUpdateProfile(authToken, updates);
      setUser(updated);
    },
    [authToken, user]
  );

  const recordCompletedRun = useCallback(
    async (result: CloakResult, saveToHistory: boolean) => {
      setLatestResult(result);
      setSessionRuns((prev) => [result, ...prev]);

      if (!saveToHistory) {
        return;
      }

      let origThumb: string | undefined;
      let cloakThumb: string | undefined;
      let diffThumb: string | undefined;

      try {
        [origThumb, cloakThumb, diffThumb] = await Promise.all([
          createThumbnailDataUrl(result.originalDataUrl, 260),
          createThumbnailDataUrl(result.cloaked_image_base64, 260),
          createThumbnailDataUrl(result.amplified_diff_base64, 260),
        ]);
      } catch {
        // Save metrics even if thumbnail compression fails
      }

      const payload: Omit<HistoryItem, 'id' | 'createdAt'> = {
        fileName: result.fileName,
        model: result.model,
        attack: result.attack,
        protectionMode: result.protection_mode,
        strength: result.strength,
        epsilon: result.epsilon,
        originalClass: result.original_prediction.label,
        cloakedClass: result.cloaked_prediction.label,
        originalConfidence: result.original_prediction.confidence,
        cloakedConfidence: result.cloaked_prediction.confidence,
        confidenceDrop: result.confidence_drop,
        ssim: result.ssim,
        processingTimeMs: result.processing_time_ms,
        width: result.original_resolution.width,
        height: result.original_resolution.height,
        misclassified: result.misclassified,
        status: 'completed',
        originalThumbnail: origThumb,
        cloakedThumbnail: cloakThumb,
        diffThumbnail: diffThumb,
        activationMapOriginal: result.activation_map_original,
        activationMapCloaked: result.activation_map_cloaked,
      };

      if (!isFirebaseConfigured && authToken) {
        const saved = await saveServerHistory(authToken, payload);
        setHistoryItems((prev) => [saved, ...prev]);
      } else {
        const localItem: HistoryItem = {
          ...payload,
          id: result.id,
          createdAt: result.createdAt,
        };
        setHistoryItems((prev) => [localItem, ...prev]);
      }
    },
    [authToken]
  );

  const deleteHistoryItem = useCallback(
    async (id: string) => {
      if (!isFirebaseConfigured && authToken) {
        await deleteServerHistoryEntry(authToken, id);
      }
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    },
    [authToken]
  );

  const clearAllHistory = useCallback(async () => {
    if (!isFirebaseConfigured && authToken) {
      await clearServerHistory(authToken);
    }
    setHistoryItems([]);
  }, [authToken]);

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        authMode: isFirebaseConfigured ? 'firebase' : 'development',
        login,
        register,
        logout,
        forgotPassword,
        updateUserProfile,
        apiBaseUrl,
        setApiBaseUrl,
        backendStatus,
        backendHealth,
        backendError,
        backendModels,
        refreshBackendHealth,
        selectedModel,
        setSelectedModel,
        latestResult,
        setLatestResult,
        latestFile,
        setLatestFile,
        latestTransferability,
        setLatestTransferability,
        sessionRuns,
        recordCompletedRun,
        historyItems,
        deleteHistoryItem,
        clearAllHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
