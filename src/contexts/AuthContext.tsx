import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthAccount, User, UserStatus } from '@/types';
import {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = async () => {
    if (user?.role !== 'admin') {
      setAccounts([]);
      return;
    }

    const result = await fetchAccountsRequest();
    if (result.ok && result.data) {
      setAccounts(result.data);
    }
  };

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const result = await fetchSessionRequest();
      if (!mounted) return;

      if (result.ok) {
        setUser(result.data || null);
      }
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
  }, [user?.id, user?.role, isLoading]);

  const mutateAccountStatus = async (accountId: string, status: UserStatus): Promise<AuthActionResult> => {
    const result = await updateAccountStatusRequest(accountId, status);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    await refreshAccounts();
    if (user?.id === accountId) {
      const session = await fetchSessionRequest();
      if (session.ok) {
        setUser(session.data || null);
      }
    }

    return { ok: true };
  };

  const value = useMemo<AuthContextType>(() => ({
    user,
    accounts,
    isLoading,
    refreshAccounts,
    login: async (username, password) => {
      const result = await loginRequest(username, password);
      if (!result.ok || !result.data) {
        return { ok: false, error: result.error };
      }
      setUser(result.data);
      return { ok: true };
    },
    register: async ({ username, password }) => {
      const result = await registerRequest(username, password);
      return result.ok ? { ok: true } : { ok: false, error: result.error };
    },
    logout: async () => {
      await logoutRequest();
      setUser(null);
      setAccounts([]);
    },
    approveAccount: async (accountId) => mutateAccountStatus(accountId, 'approved'),
    disableAccount: async (accountId) => mutateAccountStatus(accountId, 'disabled'),
    rejectAccount: async (accountId) => mutateAccountStatus(accountId, 'rejected'),
    restoreAccount: async (accountId) => mutateAccountStatus(accountId, 'pending'),
    deleteAccount: async (accountId) => {
      const result = await deleteAccountRequest(accountId);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      await refreshAccounts();
      return { ok: true };
    },
  }), [accounts, isLoading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
