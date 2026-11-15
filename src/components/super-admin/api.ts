import { apiUrl } from '../../services/apiConfig';

const SA_TOKEN_KEY = 'gulfaro_sa_token_v1';

let unauthorizedHandler: (() => void) | null = null;

export function setSuperAdminUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export function getStoredSuperAdminToken(): string | null {
  try {
    return sessionStorage.getItem(SA_TOKEN_KEY) || localStorage.getItem(SA_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeSuperAdminToken(token: string, rememberMe: boolean) {
  try {
    sessionStorage.setItem(SA_TOKEN_KEY, token);
    if (rememberMe) {
      localStorage.setItem(SA_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(SA_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function clearStoredSuperAdminToken() {
  try {
    sessionStorage.removeItem(SA_TOKEN_KEY);
    localStorage.removeItem(SA_TOKEN_KEY);
  } catch {
    // Ignore
  }
}

export async function saFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredSuperAdminToken();
  const headers: Record<string, string> = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl(`/api/super-admin${endpoint}`), {
    ...options,
    credentials: 'include',
    headers
  });

  if (res.status === 401 && !endpoint.startsWith('/auth/')) {
    clearStoredSuperAdminToken();
    if (unauthorizedHandler) unauthorizedHandler();
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data as T;
  }

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  return (await res.text()) as unknown as T;
}

export async function saDownloadFile(endpoint: string, filename: string): Promise<void> {
  const token = getStoredSuperAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(`/api/super-admin${endpoint}`), {
    credentials: 'include',
    headers
  });

  if (res.status === 401) {
    clearStoredSuperAdminToken();
    if (unauthorizedHandler) unauthorizedHandler();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error('Download failed.');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
