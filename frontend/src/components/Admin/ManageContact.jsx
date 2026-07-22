import React, { useState, useEffect, useCallback } from 'react';
import { Mail, RefreshCw, CheckCircle, Clock, Reply } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from './AdminUtils';
import { API_URL } from '../../config/api';


export default function ManageContact() {
  const { success, error } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selected, setSelected] = useState(null);

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/contact-messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load inquiries');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      error(e.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const setStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/contact-messages/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
      success(status === 'resolved' ? 'Marked resolved' : 'Status updated');
    } catch (e) {
      error(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = messages.filter((m) => {
    if (filter === 'all') return true;
    const st = m.status || 'new';
    return st === filter;
  });

  const newCount = messages.filter((m) => (m.status || 'new') === 'new').length;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Contact Inquiries</h1>
          <p className="page-subtitle">
            Messages from the Contact Us form — {newCount} new
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchMessages}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="table-title">
            <Mail size={16} /> {filtered.length} inquiries
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
            {['all', 'new', 'read', 'resolved'].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-sm" /> Loading inquiries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">✉️</div>
            <h4>No inquiries yet</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              When someone submits the Contact form, it appears here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const status = m.status || 'new';
                  const busy = updatingId === m.id;
                  return (
                    <tr key={m.id} style={status === 'new' ? { background: 'rgba(124,179,66,0.06)' } : undefined}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {fmtDate(m.createdAt)}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{m.subject || 'General Inquiry'}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <a href={`mailto:${m.email}`} style={{ fontSize: '0.78rem', color: 'var(--primary-color)' }}>
                          {m.email}
                        </a>
                        {m.phone ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.phone}</div>
                        ) : null}
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelected(m)}
                          style={{ textAlign: 'left', whiteSpace: 'normal', padding: '0.25rem 0' }}
                        >
                          {(m.message || '').slice(0, 90)}
                          {(m.message || '').length > 90 ? '…' : ''}
                        </button>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color:
                              status === 'new'
                                ? '#7cb342'
                                : status === 'resolved'
                                  ? '#29b6f6'
                                  : '#d4af37',
                          }}
                        >
                          {status === 'new' ? <Clock size={12} /> : <CheckCircle size={12} />}
                          {status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {status === 'new' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busy}
                              onClick={() => setStatus(m.id, 'read')}
                            >
                              Mark read
                            </button>
                          )}
                          {status !== 'resolved' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy}
                              onClick={() => setStatus(m.id, 'resolved')}
                            >
                              Resolve
                            </button>
                          )}
                          <a
                            className="btn btn-ghost btn-sm"
                            href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your inquiry'))}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Reply size={12} /> Reply
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 520, padding: '1.5rem', maxHeight: '85vh', overflow: 'auto' }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--secondary-color)' }}>
              {selected.subject || 'General Inquiry'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {selected.name} · {selected.email}
              {selected.phone ? ` · ${selected.phone}` : ''} · {fmtDate(selected.createdAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'var(--text-primary)' }}>
              {selected.message}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <a
                className="btn btn-primary btn-sm"
                href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + (selected.subject || 'Your inquiry'))}`}
              >
                Reply by email
              </a>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
