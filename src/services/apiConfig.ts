declare global {
  interface Window {
    GULFARO_API_BASE_URL?: string;
    __GULFARO_API_BASE_URL__?: string;
  }
}

const DEFAULT_RENDER_API_BASE_URL = 'https://gulfaro.onrender.com';

function normalizeBaseUrl(raw?: string | null): string {
  return typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : '';
}

function isLocalOrSameOriginPreviewHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = (window.location.hostname || '').toLowerCase();
  return !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.run.app');
}

/**
 * Resolves the active backend API base URL in priority order:
 * 1. Build-time `import.meta.env.VITE_API_BASE_URL`
 * 2. Runtime `window.GULFARO_API_BASE_URL` (from `/gulfaro-config.js`)
 * 3. Runtime `window.__GULFARO_API_BASE_URL__`
 * 4. Production Render backend fallback (`https://gulfaro.onrender.com`) on deployed static hosts
 */
export function getApiBaseUrl(): string {
  const buildTimeUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (buildTimeUrl) return buildTimeUrl;

  if (typeof window !== 'undefined') {
    const windowUrl = normalizeBaseUrl(
      window.GULFARO_API_BASE_URL || window.__GULFARO_API_BASE_URL__
    );
    if (windowUrl) return windowUrl;

    if (!isLocalOrSameOriginPreviewHost()) {
      return DEFAULT_RENDER_API_BASE_URL;
    }
  }

  return '';
}

/**
 * Backend API Base URL resolved at startup.
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Returns true when an explicit external backend URL is configured.
 */
export function isBackendBaseConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

/**
 * Detects whether the current browser host appears to be a live custom/static domain
 * without a resolved backend base URL.
 */
export function isMissingProductionBackendConfig(): boolean {
  return !getApiBaseUrl() && !isLocalOrSameOriginPreviewHost();
}

/**
 * Resolves a backend API endpoint path cleanly using the active Render backend URL.
 */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}
