const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

/**
 * Backend API Base URL configured via VITE_API_BASE_URL.
 * - Blank in local dev / same-origin deployments (uses relative `/api/...`).
 * - Set to your Render backend URL (e.g. `https://gulfaro-api.onrender.com`) when frontend is hosted on Hostinger.
 */
export const API_BASE_URL = rawApiBaseUrl;

/**
 * Resolves a backend API endpoint path cleanly using VITE_API_BASE_URL when configured.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
