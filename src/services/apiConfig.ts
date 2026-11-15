declare global {
  interface Window {
    __GULFARO_API_BASE_URL__?: string;
  }
}

function normalizeBaseUrl(raw?: string | null): string {
  return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
}

const buildTimeApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const runtimeApiBaseUrl =
  typeof window !== 'undefined' ? normalizeBaseUrl(window.__GULFARO_API_BASE_URL__) : '';

/**
 * Backend API Base URL configured via build-time `VITE_API_BASE_URL` or runtime `/gulfaro-config.js`.
 * - Blank in local dev / same-origin deployments (uses relative `/api/...`).
 * - Set to your Render backend URL (e.g. `https://gulfaro-api.onrender.com`) when frontend is hosted on Hostinger.
 */
export const API_BASE_URL = buildTimeApiBaseUrl || runtimeApiBaseUrl;

/**
 * Returns true when an explicit external backend URL is configured.
 */
export function isBackendBaseConfigured(): boolean {
  return Boolean(API_BASE_URL);
}

/**
 * Detects whether the current browser host appears to be a live custom/static domain
 * (such as Hostinger) without an explicit Render backend URL configured.
 */
export function isMissingProductionBackendConfig(): boolean {
  if (API_BASE_URL || typeof window === 'undefined') return false;
  const host = (window.location.hostname || '').toLowerCase();
  return Boolean(host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.run.app'));
}

/**
 * Resolves a backend API endpoint path cleanly using API_BASE_URL when configured.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
