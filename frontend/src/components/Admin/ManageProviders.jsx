import React, { useState } from 'react';
import { Users, RefreshCw, Search, Pencil, Trash2, X } from 'lucide-react';
import { useProvidersQuery } from '../../hooks/queries/useProviders';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { userInitials, StatusPill } from './AdminUtils';
import AdminUserProfileModal from './AdminUserProfileModal';

const API_URL = import.meta.env.VITE_API_URL || '';

const emptyEdit = {
  name: '',
  role: 'doctor',
  status: 'approved',
  specialty: '',
  doctorType: '',
  telephone: '',
  address: '',
  experience: '',
  profileImageUrl: '',
};

export default function ManageProviders() {
  const { success, error } = useToast();
  const { data: providers = [], isLoading, refetch } = useProvidersQuery();
  const [providerSearch, setProviderSearch] = useState('');
  const [profileUserId, setProfileUserId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const getToken = () => auth.currentUser?.getIdToken();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editing?.id) return;
    if (!file.type.startsWith('image/')) {
      error('Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }
    setUploadingImage(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file, `${editing.id}_profile${file.name.slice(file.name.lastIndexOf('.')) || '.jpg'}`);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((prev) => ({ ...prev, profileImageUrl: data.url }));
      success('Photo uploaded — click Save changes to publish');
    } catch (err) {
      error(err.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

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

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || '',
      role: p.role || 'doctor',
      status: p.status || 'approved',
      specialty: Array.isArray(p.profileDetails?.specialty)
        ? p.profileDetails.specialty.join(', ')
        : (p.profileDetails?.specialty || ''),
      doctorType: p.profileDetails?.doctorType || '',
      telephone: p.profileDetails?.telephone || '',
      address: p.profileDetails?.address || '',
      experience: p.profileDetails?.experience || '',
      profileImageUrl: p.profileDetails?.profileImageUrl || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing?.id) return;
    setSaving(true);
    try {
      const token = await getToken();
      const specialtyVal = form.specialty.includes(',')
        ? form.specialty.split(',').map((s) => s.trim()).filter(Boolean)
        : form.specialty.trim();
      const res = await fetch(`${API_URL}/api/users/${editing.id}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          status: form.status,
          profileDetails: {
            specialty: specialtyVal,
            doctorType: form.doctorType,
            telephone: form.telephone,
            address: form.address,
            experience: form.experience,
            profileImageUrl: form.profileImageUrl || '',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      success('Expert updated — synced to live profile');
      setEditing(null);
      refetch();
    } catch (err) {
      error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete expert "${p.name || p.email}"?\nThis removes their login and profile. Orders/products stay in history.`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${p.id}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      success('Expert deleted');
      refetch();
    } catch (err) {
      error(err.message);
    }
  };

  const filtered = providers.filter(
    (p) => !providerSearch || p.name?.toLowerCase().includes(providerSearch.toLowerCase()) || p.email?.toLowerCase().includes(providerSearch.toLowerCase())
  );

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Manage Experts</h1>
          <p className="page-subtitle">Doctors, clinics, vendors &amp; astrologers — edits sync to their live accounts</p>
        </div>
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
                    <td>{Array.isArray(p.profileDetails?.specialty) ? p.profileDetails.specialty.join(', ') : (p.profileDetails?.specialty || p.profileDetails?.doctorType || '—')}</td>
                    <td>{p.rating ? `${p.rating} ★ (${p.reviewCount || 0})` : '—'}</td>
                    <td><StatusPill status={p.status === 'pending' ? 'pending' : (p.status || 'approved')} /></td>
                    <td>
                      <div className="action-btns" style={{ flexWrap: 'wrap' }}>
                        {p.status === 'pending' && (
                          <button className="btn-xs approve" onClick={() => handleApproveUser(p.id)}>Approve</button>
                        )}
                        <button className="btn-xs" onClick={() => openEdit(p)} style={{ background: 'rgba(61,139,85,0.2)', color: 'var(--primary-light)' }}>
                          <Pencil size={12} style={{ marginRight: 4 }} /> Edit
                        </button>
                        <button className="btn-xs edit-btn" onClick={() => setProfileUserId(p.id)} style={{ background: 'var(--primary-color)', color: 'white' }}>
                          Full Profile
                        </button>
                        <button className="btn-xs" onClick={() => handleDelete(p)} style={{ background: 'rgba(239,83,80,0.15)', color: '#ef5350' }}>
                          <Trash2 size={12} style={{ marginRight: 4 }} /> Delete
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

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Edit Expert</h3>
              <button type="button" className="btn btn-outline" style={{ padding: '0.35rem' }} onClick={() => setEditing(null)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 0 }}>
              Changes write to the same Firestore profile they log in with — live Channeling / Vendor dashboards update after refresh.
            </p>
            <form onSubmit={handleSaveEdit} className="admin-form">
              <div className="form-group">
                <label>Profile photo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {form.profileImageUrl ? (
                    <img
                      src={form.profileImageUrl}
                      alt=""
                      style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'rgba(61,139,85,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: 'var(--primary-light)',
                      }}
                    >
                      {userInitials({ name: form.name, email: editing.email })}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="btn btn-outline" style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', margin: 0 }}>
                      {uploadingImage ? 'Uploading…' : (form.profileImageUrl ? 'Change photo' : 'Upload photo')}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploadingImage || saving}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {form.profileImageUrl && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ color: '#ef5350', borderColor: 'rgba(239,83,80,0.4)' }}
                        onClick={() => setForm({ ...form, profileImageUrl: '' })}
                        disabled={uploadingImage || saving}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
                  Upload first, then Save changes so the photo goes live on Channeling.
                </p>
              </div>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email (read-only)</label>
                <input className="form-control" value={editing.email || ''} disabled />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Role</label>
                  <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {['doctor', 'clinic', 'organization', 'vendor'].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {['pending', 'approved', 'rejected', 'hidden'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Doctor / expert type</label>
                <input className="form-control" value={form.doctorType} onChange={(e) => setForm({ ...form, doctorType: e.target.value })} placeholder="e.g. Ayurvedic Physician" />
              </div>
              <div className="form-group">
                <label>Specialty</label>
                <input className="form-control" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Comma-separated if multiple" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Experience</label>
                <input className="form-control" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || uploadingImage}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileUserId && <AdminUserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
    </>
  );
}
