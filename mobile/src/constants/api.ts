/**
 * Live Deergayu API (Render). Override with EXPO_PUBLIC_API_URL in .env if needed.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://deergayu-api.onrender.com'
).replace(/\/$/, '');

export function mediaUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (path.startsWith('/uploads/')) return `${API_URL}/api${path}`;
  if (path.startsWith('/api/')) return `${API_URL}${path}`;
  return `${API_URL}${path}`;
}
