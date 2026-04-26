import { AuthAccount, User, UserStatus } from '@/types';

const AUTH_API_BASE = '/api';
const TOKEN_STORAGE_KEY = 'biomag_auth_token';

interface ApiResult<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface LoginResponse {
  ok: boolean;
  token?: string;
  user?: Omit<User, 'isAuthenticated'>;
  error?: string;
}

interface SessionResponse {
  ok: boolean;
  user?: Omit<User, 'isAuthenticated'>;
  error?: string;
}

interface AccountsResponse {
  ok: boolean;
  accounts?: AuthAccount[];
  error?: string;
}

interface AccountMutationResponse {
  ok: boolean;
  account?: AuthAccount;
  error?: string;
}

const getAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY) || '';

const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

const asAuthenticatedUser = (user: Omit<User, 'isAuthenticated'>): User => ({
  ...user,
  isAuthenticated: true,
});

export async function loginRequest(username: string, password: string): Promise<ApiResult<User>> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const payload = await parseJson<LoginResponse>(response);

    if (!response.ok || !payload.ok || !payload.user || !payload.token) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    setAuthToken(payload.token);
    return { ok: true, data: asAuthenticatedUser(payload.user) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Login error' };
  }
}

export async function registerRequest(username: string, password: string): Promise<ApiResult<null>> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const payload = await parseJson<{ ok: boolean; error?: string }>(response);

    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Register error' };
  }
}

export async function fetchSessionRequest(): Promise<ApiResult<User | null>> {
  const token = getAuthToken();
  if (!token) {
    return { ok: true, data: null };
  }

  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-session`, {
      headers: authHeaders(),
    });

    if (response.status === 401) {
      setAuthToken(null);
      return { ok: true, data: null };
    }

    const payload = await parseJson<SessionResponse>(response);
    if (!response.ok || !payload.ok || !payload.user) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    return { ok: true, data: asAuthenticatedUser(payload.user) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Session error' };
  }
}

export async function logoutRequest(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(`${AUTH_API_BASE}/auth-session`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
    } catch {
      // ignore
    }
  }
  setAuthToken(null);
}

export async function fetchAccountsRequest(): Promise<ApiResult<AuthAccount[]>> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-users`, {
      headers: authHeaders(),
    });
    const payload = await parseJson<AccountsResponse>(response);

    if (!response.ok || !payload.ok || !payload.accounts) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    return { ok: true, data: payload.accounts };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Accounts error' };
  }
}

export async function updateAccountStatusRequest(userId: string, status: UserStatus): Promise<ApiResult<AuthAccount>> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-users-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ userId, status }),
    });
    const payload = await parseJson<AccountMutationResponse>(response);

    if (!response.ok || !payload.ok || !payload.account) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    return { ok: true, data: payload.account };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Update account error' };
  }
}

export async function deleteAccountRequest(userId: string): Promise<ApiResult<null>> {
  try {
    const response = await fetch(`${AUTH_API_BASE}/auth-users-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ userId }),
    });
    const payload = await parseJson<{ ok: boolean; error?: string }>(response);

    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error || `HTTP ${response.status}` };
    }

    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Delete account error' };
  }
}
