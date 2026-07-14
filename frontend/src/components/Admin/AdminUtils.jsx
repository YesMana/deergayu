import React from 'react';

export const fmtCurrency = (n) => `Rs. ${Number(n || 0).toLocaleString('en-LK')}`;

export const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('en-LK', { day: '2-digit', month: 'short' }) : '—';

export const userInitials = (u) => (u?.name || u?.email || 'U').slice(0, 2).toUpperCase();

/** Turn /uploads/... or relative paths into a browser-loadable URL */
export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (path.startsWith('/api/uploads/')) {
    return apiBase ? `${apiBase}${path}` : path;
  }
  if (path.startsWith('/uploads/')) {
    return apiBase ? `${apiBase}/api${path}` : `/api${path}`;
  }
  return apiBase ? `${apiBase}${path}` : path;
};

export const STATUS_COLORS = {
  pending:    { bg: 'rgba(255,167,38,0.15)',  color: '#ffa726' },
  confirmed:  { bg: 'rgba(41,182,246,0.15)',  color: '#29b6f6' },
  processing: { bg: 'rgba(171,71,188,0.15)',  color: '#ab47bc' },
  shipped:    { bg: 'rgba(38,198,218,0.15)',   color: '#26c6da' },
  delivered:  { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  cancelled:  { bg: 'rgba(239,83,80,0.15)',    color: '#ef5350' },
  approved:   { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  hidden:     { bg: 'rgba(144,164,174,0.15)', color: '#90a4ae' },
  rejected:   { bg: 'rgba(239,83,80,0.15)',   color: '#ef5350' },
  accepted:   { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
  completed:  { bg: 'rgba(38,198,218,0.15)',   color: '#26c6da' },
  active:     { bg: 'rgba(76,175,80,0.15)',    color: '#4caf50' },
};

export const StatusPill = ({ status }) => {
  const cfg = STATUS_COLORS[status] || { bg: 'rgba(255,255,255,0.1)', color: '#aaa' };
  return (
    <span className="status-pill" style={{ background: cfg.bg, color: cfg.color }}>
      {status || '—'}
    </span>
  );
};
