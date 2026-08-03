import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthAccount, User, UserStatus, UserRole } from '@/types';
import {
  checkAuthApiAvailability,
  clearAuthToken,
  deleteAccountRequest,
  fetchAccountsRequest,
  fetchSessionRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  updateAccountStatusRequest,
} from '@/lib/authClient';

interface AuthActionResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<AuthActionResult>;
  register: (payload: { username: string; password: string }) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  isLoading: boolean;
  accounts: AuthAccount[];
  refreshAccounts: () => Promise<void>;
  approveAccount: (accountId: string) => Promise<AuthActionResult>;
  disableAccount: (accountId: string) => Promise<AuthActionResult>;
  rejectAccount: (accountId: string) => Promise<AuthActionResult>;
  restoreAccount: (accountId: string) => Promise<AuthActionResult>;
  deleteAccount: (accountId: string) => Promise<AuthActionResult>;
}

type AuthMode = 'backend' | 'local';

interface LocalAuthAccount extends AuthAccount {
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_SESSION_STORAGE_KEY = 'biomag_user';
const LOCAL_ACCOUNTS_STORAGE_KEY = 'biomag_auth_accounts_v1';
const LOCAL_DATA_KEYS = {
  patients: 'biomag_patients',
  appointments: 'biomag_appointments',
  sessions: 'biomag_sessions',
};

const nowIso = () => new Date().toISOString();
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeUsername = (value: string) => value.trim().toLowerCase();
const shouldForceLocalAuth = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const toSessionUser = (account: Pick<LocalAuthAccount, 'id' | 'username' | 'role' | 'status'>): User => ({
  id: account.id,
  username: account.username,
  role: account.role,
  status: account.status,
  isAuthenticated: true,
});

const stripPassword = (account: LocalAuthAccount): AuthAccount => ({
  id: account.id,
  username: account.username,
  role: account.role,
  status: account.status,
  createdAt: account.createdAt,
  approvedAt: account.approvedAt,
});

const buildSeedAccounts = (): LocalAuthAccount[] => [
  {
    id: 'seed-admin-leo',
    username: 'leo',
    password: '2225',
    role: 'admin',
    status: 'approved',
    createdAt: nowIso(),
    approvedAt: nowIso(),
  },
  {
    id: 'seed-therapist-cristina',
    username: 'cristina',
    password: 'biomag2026',
    role: 'therapist',
    status: 'approved',
    createdAt: nowIso(),
    approvedAt: nowIso(),
  },
  {
    id: 'seed-therapist-testuser',
    username: 'testuser',
    password: 'biomag',
    role: 'therapist',
    status: 'approved',
    createdAt: nowIso(),
    approvedAt: nowIso(),
  },
];

const sanitizeLocalAccounts = (raw: unknown): LocalAuthAccount[] => {
  const parsed = Array.isArray(raw) ? raw : [];
  const valid = parsed
    .filter((item): item is LocalAuthAccount => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : generateId(),
      username: normalizeUsername(typeof item.username === 'string' ? item.username : ''),
      password: typeof item.password === 'string' ? item.password : '',
      role: item.role === 'admin' ? 'admin' : 'therapist',
      status: ['pending', 'approved', 'disabled', 'rejected'].includes(String(item.status))
        ? (item.status as UserStatus)
        : 'pending',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : nowIso(),
      approvedAt: typeof item.approvedAt === 'string' ? item.approvedAt : undefined,
    }))
    .filter((item) => item.username && item.password);

  const seeds = buildSeedAccounts();
  for (const seed of seeds) {
    if (!valid.some((item) => item.username === seed.username)) {
      valid.push(seed);
    }
  }

  return valid.sort((a, b) => a.username.localeCompare(b.username, 'es'));
};

const readLocalAccounts = (): LocalAuthAccount[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    return sanitizeLocalAccounts(raw ? JSON.parse(raw) : buildSeedAccounts());
  } catch {
    return buildSeedAccounts();
  }
};

const writeLocalAccounts = (accounts: LocalAuthAccount[]) => {
  localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

const hasScopedData = (key: string, username: string, minCount: number) => {
  try {
    const raw = localStorage.getItem(`${key}:${username}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > minCount;
  } catch {
    return false;
  }
};

const localAccountHasClinicalData = (username: string) =>
  hasScopedData(LOCAL_DATA_KEYS.patients, username, 1) ||
  hasScopedData(LOCAL_DATA_KEYS.appointments, username, 1) ||
  hasScopedData(LOCAL_DATA_KEYS.sessions, username, 0);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>('backend');
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocalSession = (nextAccounts?: LocalAuthAccount[]) => {
    try {
      const sessionRaw = localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
      if (!sessionRaw) {
        setUser(null);
        return;
      }
      const session = JSON.parse(sessionRaw) as Partial<User>;
      const username = normalizeUsername(String(session.username || ''));
      const source = nextAccounts || readLocalAccounts();
      const account = source.find((item) => item.username === username && item.status === 'approved');
      setUser(account ? toSessionUser(account) : null);
    } catch {
      setUser(null);
    }
  };

  const loadLocalAccounts = () => {
    const localAccounts = readLocalAccounts();
    setAccounts(localAccounts.map(stripPassword));
    loadLocalSession(localAccounts);
  };

  const refreshAccounts = async () => {
    if (mode === 'local') {
      loadLocalAccounts();
      return;
    }

    if (user?.role !== 'admin') {
      setAccounts([]);
      return;
    }

    const result = await fetchAccountsRequest();
    if (result.ok && result.data) {
      setAccounts(result.data);
      return;
    }

    if (result.error === 'AUTH_API_UNAVAILABLE') {
      setMode('local');
      loadLocalAccounts();
    }
  };

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (shouldForceLocalAuth()) {
        clearAuthToken();
        setMode('local');
        loadLocalAccounts();
        setIsLoading(false);
        return;
      }

      const backendAvailable = await checkAuthApiAvailability();
      if (!mounted) return;

      if (!backendAvailable) {
        setMode('local');
        loadLocalAccounts();
        setIsLoading(false);
        return;
      }

      const result = await fetchSessionRequest();
      if (!mounted) return;

      if (result.ok) {
        setUser(result.data || null);
      }
      setMode('backend');
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void refreshAccounts();
    }
  }, [user?.id, user?.role, isLoading, mode]);

  const mutateLocalStatus = async (accountId: string, status: UserStatus): Promise<AuthActionResult> => {
    const localAccounts = readLocalAccounts();
    const account = localAccounts.find((item) => item.id === accountId);
    if (!account) {
      return { ok: false, error: 'Usuario no encontrado' };
    }

    const nextAccounts = localAccounts.map((item) =>
      item.id === accountId
        ? {
            ...item,
            status,
            approvedAt: status === 'approved' ? nowIso() : item.approvedAt,
          }
        : item
    );
    writeLocalAccounts(nextAccounts);
    setAccounts(nextAccounts.map(stripPassword));

    if (user?.id === accountId) {
      const updated = nextAccounts.find((item) => item.id === accountId);
      if (updated && updated.status === 'approved') {
        const nextUser = toSessionUser(updated);
        setUser(nextUser);
        localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        setUser(null);
        localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      }
    }

    return { ok: true };
  };

  const loginLocal = async (username: string, password: string): Promise<AuthActionResult> => {
    const normalizedUsername = normalizeUsername(username);
    const account = readLocalAccounts().find((item) => item.username === normalizedUsername);
    if (!account || account.password !== password) {
      return { ok: false, error: 'Credenciales incorrectas' };
    }
    if (account.status === 'pending') {
      return { ok: false, error: 'Tu cuenta está pendiente de aprobación' };
    }
    if (account.status === 'disabled') {
      return { ok: false, error: 'Tu cuenta está desactivada' };
    }
    if (account.status === 'rejected') {
      return { ok: false, error: 'Tu solicitud fue rechazada' };
    }
    const nextUser = toSessionUser(account);
    setUser(nextUser);
    localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(nextUser));
    setAccounts(readLocalAccounts().map(stripPassword));
    return { ok: true };
  };

  const registerLocal = async (username: string, password: string): Promise<AuthActionResult> => {
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername.length < 3) {
      return { ok: false, error: 'El usuario debe tener al menos 3 caracteres' };
    }
    if (password.trim().length < 4) {
      return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres' };
    }
    const localAccounts = readLocalAccounts();
    if (localAccounts.some((item) => item.username === normalizedUsername)) {
      return { ok: false, error: 'Ese usuario ya existe' };
    }
    const nextAccounts = [
      ...localAccounts,
      {
        id: generateId(),
        username: normalizedUsername,
        password,
        role: 'therapist' as UserRole,
        status: 'pending' as UserStatus,
        createdAt: nowIso(),
      },
    ].sort((a, b) => a.username.localeCompare(b.username, 'es'));
    writeLocalAccounts(nextAccounts);
    setAccounts(nextAccounts.map(stripPassword));
    return { ok: true };
  };

  const deleteLocal = async (accountId: string): Promise<AuthActionResult> => {
    const localAccounts = readLocalAccounts();
    const account = localAccounts.find((item) => item.id === accountId);
    if (!account) {
      return { ok: false, error: 'Usuario no encontrado' };
    }
    if (account.username === 'leo') {
      return { ok: false, error: 'No se puede eliminar el administrador principal' };
    }
    if (localAccountHasClinicalData(account.username)) {
      return { ok: false, error: 'No se puede eliminar un usuario con datos clínicos asociados' };
    }
    const nextAccounts = localAccounts.filter((item) => item.id !== accountId);
    writeLocalAccounts(nextAccounts);
    setAccounts(nextAccounts.map(stripPassword));
    return { ok: true };
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    accounts,
    isLoading,
    refreshAccounts,
    login: async (username, password) => {
      if (mode === 'local') return loginLocal(username, password);

      const result = await loginRequest(username, password);
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return loginLocal(username, password);
      }
      if (!result.ok || !result.data) {
        return { ok: false, error: result.error };
      }
      setUser(result.data);
      return { ok: true };
    },
    register: async ({ username, password }) => {
      if (mode === 'local') return registerLocal(username, password);

      const result = await registerRequest(username, password);
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return registerLocal(username, password);
      }
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    logout: async () => {
      if (mode === 'local') {
        localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      } else {
        await logoutRequest();
      }
      setUser(null);
      setAccounts([]);
    },
    approveAccount: async (accountId) => {
      if (mode === 'local') return mutateLocalStatus(accountId, 'approved');
      const result = await updateAccountStatusRequest(accountId, 'approved');
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return mutateLocalStatus(accountId, 'approved');
      }
      if (!result.ok) return { ok: false, error: result.error };
      await refreshAccounts();
      return { ok: true };
    },
    disableAccount: async (accountId) => {
      if (mode === 'local') return mutateLocalStatus(accountId, 'disabled');
      const result = await updateAccountStatusRequest(accountId, 'disabled');
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return mutateLocalStatus(accountId, 'disabled');
      }
      if (!result.ok) return { ok: false, error: result.error };
      await refreshAccounts();
      return { ok: true };
    },
    rejectAccount: async (accountId) => {
      if (mode === 'local') return mutateLocalStatus(accountId, 'rejected');
      const result = await updateAccountStatusRequest(accountId, 'rejected');
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return mutateLocalStatus(accountId, 'rejected');
      }
      if (!result.ok) return { ok: false, error: result.error };
      await refreshAccounts();
      return { ok: true };
    },
    restoreAccount: async (accountId) => {
      if (mode === 'local') return mutateLocalStatus(accountId, 'pending');
      const result = await updateAccountStatusRequest(accountId, 'pending');
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return mutateLocalStatus(accountId, 'pending');
      }
      if (!result.ok) return { ok: false, error: result.error };
      await refreshAccounts();
      return { ok: true };
    },
    deleteAccount: async (accountId) => {
      if (mode === 'local') return deleteLocal(accountId);

      const result = await deleteAccountRequest(accountId);
      if (result.error === 'AUTH_API_UNAVAILABLE') {
        setMode('local');
        loadLocalAccounts();
        return deleteLocal(accountId);
      }
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      await refreshAccounts();
      return { ok: true };
    },
  }), [accounts, isLoading, mode, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
