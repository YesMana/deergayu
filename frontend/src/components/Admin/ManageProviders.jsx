import React, { useState } from 'react';
import { Users, RefreshCw, Search } from 'lucide-react';
import { useProvidersQuery } from '../../hooks/queries/useProviders';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { userInitials, StatusPill } from './AdminUtils';
import AdminUserProfileModal from './AdminUserProfileModal';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ManageProviders() {
  const { success, error } = useToast();
  const { data: providers = [], isLoading, refetch } = useProvidersQuery();
  const [providerSearch, setProviderSearch] = useState('');
  const [profileUserId, setProfileUserId] = useState(null);

  const getToken = () => auth.currentUser?.getIdToken();

  const handleApproveUser = async (uid) => {
    if (!window.confirm('Approve this expert?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) { success('Expert approved!'); refetch(); }
      else error('Failed to approve');
    } catch (e) { error(e.message); }
  };

  const filtered = providers.filter(
    (p) => !providerSearch || p.name?.toLowerCase().includes(providerSearch.toLowerCase()) || p.email?.toLowerCase().includes(providerSearch.toLowerCase())
  );

  return (
    <>
      <div className="admin-page-header">
        <div><h1>Manage Experts</h1><p className="page-subtitle">Doctors, clinics, vendors & astrologers</p></div>
        <button onClick={() => refetch()} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title"><Users size={16} /> Experts ({filtered.length})</span>
          <div className="search-box" style={{ minWidth: 220 }}>
            <Search size={14} />
            <input placeholder="Search name or email…" value={providerSearch} onChange={(e) => setProviderSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">👤</div><h4>No experts found</h4></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr>
                <th>Expert</th><th>Role</th><th>Specialty</th><th>Rating</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">
                          {p.profileDetails?.profileImageUrl ? <img src={p.profileDetails.profileImageUrl} alt="" /> : userInitials(p)}
                        </div>
                        <div>
                          <div className="name">{p.name || '—'}</div>
                          <div className="email">{p.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{p.role}</td>
                    <td>{p.profileDetails?.specialty || p.profileDetails?.doctorType || '—'}</td>
                    <td>{p.rating ? `${p.rating} ★ (${p.reviewCount || 0})` : '—'}</td>
                    <td><StatusPill status={p.status === 'pending' ? 'pending' : 'approved'} /></td>
                    <td>
                      <div className="action-btns">
                        {p.status === 'pending' && (
                          <button className="btn-xs approve" onClick={() => handleApproveUser(p.id)}>Approve</button>
                        )}
                        <button className="btn-xs edit-btn" onClick={() => setProfileUserId(p.id)} style={{ background: 'var(--primary-color)', color: 'white' }}>
                          Full Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {profileUserId && <AdminUserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
    </>
  );
}
