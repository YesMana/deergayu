import React, { useState, useEffect, useCallback } from 'react';
import { Star, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from './AdminUtils';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ManageReviews() {
  const { success, error } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      error(e.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const setStatus = async (review, status) => {
    setUpdatingId(review.id);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_URL}/api/admin/reviews/${review.targetType}/${review.targetId}/${review.id}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id && r.targetId === review.targetId && r.targetType === review.targetType
            ? { ...r, status }
            : r
        )
      );
      success(status === 'hidden' ? 'Review hidden' : 'Review published');
    } catch (e) {
      error(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Manage Reviews</h1>
          <p className="page-subtitle">Moderate product and provider reviews</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchReviews}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title">
            <Star size={16} /> {reviews.length} reviews
          </span>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner spinner-sm" /> Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <div className="icon">⭐</div>
            <h4>No reviews found</h4>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Target</th>
                  <th>User</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const status = r.status || 'published';
                  const busy = updatingId === r.id;
                  return (
                    <tr key={`${r.targetType}-${r.targetId}-${r.id}`}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.targetName || r.targetId}</div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {r.targetType} · {fmtDate(r.createdAt)}
                        </small>
                      </td>
                      <td>{r.userName || r.userId || '—'}</td>
                      <td>
                        <span style={{ color: '#f1c40f', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Star size={14} fill="currentColor" /> {r.rating}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.comment || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 999,
                            fontSize: '0.75rem',
                            background:
                              status === 'hidden' || status === 'rejected'
                                ? 'rgba(239,83,80,0.15)'
                                : 'rgba(76,175,80,0.15)',
                            color: status === 'hidden' || status === 'rejected' ? '#ef5350' : '#4caf50',
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {status !== 'hidden' && (
                            <button
                              className="btn-xs"
                              disabled={busy}
                              onClick={() => setStatus(r, 'hidden')}
                              title="Hide"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <EyeOff size={12} /> Hide
                            </button>
                          )}
                          {status !== 'published' && (
                            <button
                              className="btn-xs"
                              disabled={busy}
                              onClick={() => setStatus(r, 'published')}
                              title="Publish"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4caf50' }}
                            >
                              <Eye size={12} /> Publish
                            </button>
                          )}
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
    </>
  );
}
