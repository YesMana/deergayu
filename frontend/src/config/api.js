/** Production API — used when VITE_API_URL is missing at build time. */
export const DEFAULT_API_URL = 'https://deergayu-api.onrender.com';

/**
 * Base URL for backend API calls (no trailing slash).
 * Prefer VITE_API_URL; fall back to production so admin/dashboard never hits the Vercel origin.
 */
export function getApiUrl() {
  const raw = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).toString().trim();
  return raw.replace(/\/$/, '');
}

export const API_URL = getApiUrl();
