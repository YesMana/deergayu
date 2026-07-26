import React, { useState } from 'react';
import { Users, RefreshCw, Search, Pencil, Trash2, X } from 'lucide-react';
import { useProvidersQuery } from '../../hooks/queries/useProviders';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { userInitials, StatusPill } from './AdminUtils';
import AdminUserProfileModal from './AdminUserProfileModal';
import { uploadImageDurable } from '../../utils/uploadImage';
import { API_URL } from '../../config/api';
import {
  computeProfileCompletion,
  looksLikeSuspiciousSpecialty,
  parseSpecialtyList,
} from '../../utils/providerProfileCompletion';

const emptyEdit = {
  name: '',
  role: 'doctor',
  status: 'approved',
  specialty: '',
  doctorType: '',
  title: '',
  telephone: '',
  address: '',
  experience: '',
  profileImageUrl: '',
  bio: '',
  country: 'Sri Lanka',
  province: '',
  district: '',
  city: '',
  registrationNumber: '',
  languages: '',
  offersInPerson: false,
  offersVideo: false,
  offersAudio: false,
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
      const url = await uploadImageDurable(file, `profiles/${editing.id}`);
      setForm((prev) => ({ ...prev, profileImageUrl: url }));
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
    const pd = p.profileDetails || {};
    setForm({
      name: p.name || '',
      role: p.role || 'doctor',
      status: p.status || 'approved',
      specialty: Array.isArray(pd.specialty) ? pd.specialty.join(', ') : pd.specialty || '',
      doctorType: pd.doctorType || '',
      title: pd.title || '',
      telephone: pd.telephone || '',
      address: pd.address || '',
      experience: pd.experience || '',
      profileImageUrl: pd.profileImageUrl || '',
      bio: pd.bio || '',
      country: pd.country || 'Sri Lanka',
      province: pd.province || '',
      district: pd.district || '',
      city: pd.city || '',
      registrationNumber: pd.registrationNumber || '',
      languages: Array.isArray(pd.languages) ? pd.languages.join(', ') : pd.languages || '',
      offersInPerson: pd.offersInPerson === true,
      offersVideo: pd.offersVideo === true || pd.videoConsultation === true,
      offersAudio: pd.offersAudio === true,
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
      const languagesVal = form.languages
        ? form.languages.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
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
            title: form.title,
            telephone: form.telephone,
            address: form.address,
            experience: form.experience,
            profileImageUrl: form.profileImageUrl || '',
            bio: form.bio,
            country: form.country,
            province: form.province,
            district: form.district,
            city: form.city,
            registrationNumber: form.registrationNumber,
            languages: languagesVal,
            offersInPerson: Boolean(form.offersInPerson),
            offersVideo: Boolean(form.offersVideo),
            offersAudio: Boolean(form.offersAudio),
            videoConsultation: Boolean(form.offersVideo),
            consultationModes: [
              form.offersInPerson && 'in_person',
              form.offersVideo && 'video',
              form.offersAudio && 'audio',
            ].filter(Boolean),
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
                <th>Expert</th><th>Role</th><th>Specialty</th><th>Profile</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((p) => {
                  const completion = computeProfileCompletion(p);
                  const suspicious = parseSpecialtyList(p.profileDetails?.specialty).filter(
                    looksLikeSuspiciousSpecialty
                  );
                  return (
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
                    <td>
                      {Array.isArray(p.profileDetails?.specialty)
                        ? p.profileDetails.specialty.join(', ')
                        : p.profileDetails?.specialty || p.profileDetails?.doctorType || '—'}
                      {suspicious.length > 0 && (
                        <div style={{ color: '#ef9a9a', fontSize: '0.75rem' }}>Needs cleanup</div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{completion.percent}%</span>
                    </td>
                    <td><StatusPill status={p.status === 'pending' ? 'pending' : (p.status || 'approved')} /></td>
                    <td>
                      <div className="action-btns" style={{ flexWrap: 'wrap' }}>
                        {p.status === 'pending' && (
                          <button className="btn-xs approve" onClick={() => handleApproveUser(p.id)}>Approve</button>
                        )}
                        {p.status === 'pending' && (
                          <button
                            className="btn-xs"
                            onClick={async () => {
                              if (!window.confirm('Reject / request correction for this expert?')) return;
                              try {
                                const token = await getToken();
                                const res = await fetch(`${API_URL}/api/users/${p.id}/status`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ status: 'rejected' }),
                                });
                                if (res.ok) { success('Marked rejected — request correction via email'); refetch(); }
                                else error('Failed to update status');
                              } catch (e) { error(e.message); }
                            }}
                            style={{ background: 'rgba(239,83,80,0.15)', color: '#ef5350' }}
                          >
                            Reject / correct
                          </button>
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
                  );
                })}
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
                <label>Professional title</label>
                <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Specialty (comma-separated; suspicious values remain readable for cleanup)</label>
                <input className="form-control" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Comma-separated if multiple" />
              </div>
              <div className="form-group">
                <label>Consultation types</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {[
                    ['offersInPerson', 'In-person'],
                    ['offersVideo', 'Video'],
                    ['offersAudio', 'Audio'],
                  ].map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Province</label>
                  <input className="form-control" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>District</label>
                  <input className="form-control" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input className="form-control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input className="form-control" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="form-control" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Private address (not public)</label>
                <input className="form-control" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Registration number</label>
                <input className="form-control" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Languages (comma-separated)</label>
                <input className="form-control" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Sinhala, Tamil, English" />
              </div>
              <div className="form-group">
                <label>Experience</label>
                <input className="form-control" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea className="form-control" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
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
