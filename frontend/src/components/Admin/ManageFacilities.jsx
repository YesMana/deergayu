import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';
import { useToast } from '../../context/ToastContext';

const TYPES = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'ayurveda_centre', label: 'Ayurveda centre' },
  { value: 'wellness_centre', label: 'Wellness centre' },
];

const emptyForm = {
  name: '',
  type: 'clinic',
  address: '',
  district: '',
  city: '',
  province: '',
  country: 'Sri Lanka',
  contact: '',
  publicDescription: '',
  status: 'draft',
};

const ManageFacilities = () => {
  const { success, error } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [affProviderId, setAffProviderId] = useState('');
  const [affFacilityId, setAffFacilityId] = useState('');
  const [experts, setExperts] = useState([]);

  const token = async () => auth.currentUser.getIdToken();

  const load = async () => {
    setLoading(true);
    try {
      const t = await token();
      const [facRes, expRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/facilities`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/api/admin/experts`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (!facRes.ok) throw new Error('Failed to load facilities');
      setList(await facRes.json());
      if (expRes.ok) {
        const ex = await expRes.json();
        setExperts(Array.isArray(ex) ? ex : []);
      }
    } catch (e) {
      error(e.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const t = await token();
      const url = editingId
        ? `${API_URL}/api/admin/facilities/${editingId}`
        : `${API_URL}/api/admin/facilities`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      success(editingId ? 'Facility updated' : 'Facility created');
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      error(err.message);
    }
  };

  const setStatus = async (id, status) => {
    try {
      const t = await token();
      const res = await fetch(`${API_URL}/api/admin/facilities/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Status update failed');
      success(`Marked ${status}`);
      load();
    } catch (err) {
      error(err.message);
    }
  };

  const addAffiliation = async (e) => {
    e.preventDefault();
    if (!affFacilityId || !affProviderId) {
      error('Select facility and provider');
      return;
    }
    try {
      const t = await token();
      const res = await fetch(`${API_URL}/api/admin/facilities/${affFacilityId}/affiliations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: affProviderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Affiliation failed');
      success('Provider affiliated');
      setAffProviderId('');
    } catch (err) {
      error(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <h2>Facilities (Clinics & Hospitals)</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Create real facilities only. Public directories stay empty until status is <strong>active</strong>.
        No demo seed data.
      </p>

      <form onSubmit={save} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit facility' : 'New facility'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.75rem' }}>
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <label>
            City
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label>
            District
            <input
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </label>
          <label>
            Province
            <input
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            Public contact
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Optional public phone/email"
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Public description
            <textarea
              rows={3}
              value={form.publicDescription}
              onChange={(e) => setForm({ ...form, publicDescription: e.target.value })}
            />
          </label>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary">
            {editingId ? 'Save changes' : 'Create facility'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <form
        onSubmit={addAffiliation}
        className="glass-panel"
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <h3 style={{ marginTop: 0 }}>Affiliate provider</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
          <label>
            Facility
            <select value={affFacilityId} onChange={(e) => setAffFacilityId(e.target.value)} required>
              <option value="">Select…</option>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.status})
                </option>
              ))}
            </select>
          </label>
          <label>
            Provider
            <select value={affProviderId} onChange={(e) => setAffProviderId(e.target.value)} required>
              <option value="">Select…</option>
              {experts.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name || ex.id} — {ex.role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-outline">
            Add affiliation
          </button>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.length === 0 && <p>No facilities yet.</p>}
          {list.map((f) => (
            <div key={f.id} className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{f.name}</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    · {f.type} · {f.status} · /{f.slug}
                  </span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {[f.city, f.district, f.address].filter(Boolean).join(' · ') || 'No location'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditingId(f.id);
                      setForm({
                        name: f.name || '',
                        type: f.type || 'clinic',
                        address: f.address || '',
                        district: f.district || '',
                        city: f.city || '',
                        province: f.province || '',
                        country: f.country || 'Sri Lanka',
                        contact: f.contact || '',
                        publicDescription: f.publicDescription || '',
                        status: f.status || 'draft',
                      });
                    }}
                  >
                    Edit
                  </button>
                  {f.status !== 'active' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setStatus(f.id, 'active')}
                    >
                      Activate
                    </button>
                  )}
                  {f.status === 'active' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setStatus(f.id, 'inactive')}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageFacilities;
