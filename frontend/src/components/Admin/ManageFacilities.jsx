import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { localizeFacilityType, localizeStatus } from '../../i18n/catalogLabels';

const TYPES = ['clinic', 'hospital', 'ayurveda_centre', 'wellness_centre'];
const STATUSES = ['active', 'draft', 'inactive'];

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
  const { t } = useLanguage();
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
      const authToken = await token();
      const [facRes, expRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/facilities`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/api/admin/experts`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (!facRes.ok) throw new Error(t('admin_facility_load_failed'));
      setList(await facRes.json());
      if (expRes.ok) {
        const ex = await expRes.json();
        setExperts(Array.isArray(ex) ? ex : []);
      }
    } catch (e) {
      error(e.message || t('admin_facility_load_failed'));
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
      const authToken = await token();
      const url = editingId
        ? `${API_URL}/api/admin/facilities/${editingId}`
        : `${API_URL}/api/admin/facilities`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('admin_facility_save_failed'));
      success(editingId ? t('admin_facility_updated') : t('admin_facility_created'));
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      error(err.message);
    }
  };

  const setStatus = async (id, status) => {
    try {
      const authToken = await token();
      const res = await fetch(`${API_URL}/api/admin/facilities/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(t('admin_status_update_failed'));
      success(t('admin_status_marked').replace('{status}', localizeStatus(status, t)));
      load();
    } catch (err) {
      error(err.message);
    }
  };

  const addAffiliation = async (e) => {
    e.preventDefault();
    if (!affFacilityId || !affProviderId) {
      error(t('admin_select_facility_provider'));
      return;
    }
    try {
      const authToken = await token();
      const res = await fetch(`${API_URL}/api/admin/facilities/${affFacilityId}/affiliations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerId: affProviderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t('admin_affiliation_failed'));
      success(t('admin_provider_affiliated'));
      setAffProviderId('');
    } catch (err) {
      error(err.message);
    }
  };

  return (
    <div className="admin-panel">
      <h2>{t('admin_manage_facilities_title')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        {t('admin_facilities_intro_prefix')} <strong>{localizeStatus('active', t)}</strong>.
        {' '}{t('admin_facilities_intro_suffix')}
      </p>

      <form onSubmit={save} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? t('admin_edit_facility') : t('admin_new_facility')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.75rem' }}>
          <label>
            {t('facility_name')}
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            {t('facility_type')}
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {localizeFacilityType(type, t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('facility_status')}
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {localizeStatus(status, t)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('facility_city')}
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </label>
          <label>
            {t('facility_district')}
            <input
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </label>
          <label>
            {t('facility_province')}
            <input
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            {t('facility_address')}
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </label>
          <label>
            {t('facility_public_contact')}
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder={t('facility_public_contact_ph')}
            />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            {t('facility_public_description')}
            <textarea
              rows={3}
              value={form.publicDescription}
              onChange={(e) => setForm({ ...form, publicDescription: e.target.value })}
            />
          </label>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary">
            {editingId ? t('admin_save_changes') : t('admin_create_facility')}
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
              {t('admin_cancel_edit')}
            </button>
          )}
        </div>
      </form>

      <form
        onSubmit={addAffiliation}
        className="glass-panel"
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <h3 style={{ marginTop: 0 }}>{t('admin_affiliate_provider')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
          <label>
            {t('facility_facility')}
            <select value={affFacilityId} onChange={(e) => setAffFacilityId(e.target.value)} required>
              <option value="">{t('common_select')}</option>
              {list.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({localizeStatus(f.status, t)})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('admin_provider')}
            <select value={affProviderId} onChange={(e) => setAffProviderId(e.target.value)} required>
              <option value="">{t('common_select')}</option>
              {experts.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name || ex.id} — {ex.role}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-outline">
            {t('admin_add_affiliation')}
          </button>
        </div>
      </form>

      {loading ? (
        <p>{t('common_loading')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {list.length === 0 && <p>{t('admin_no_facilities')}</p>}
          {list.map((f) => (
            <div key={f.id} className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong>{f.name}</strong>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    · {localizeFacilityType(f.type, t)} · {localizeStatus(f.status, t)} · /{f.slug}
                  </span>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {[f.city, f.district, f.address].filter(Boolean).join(' · ') || t('admin_no_location')}
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
                    {t('common_edit')}
                  </button>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`btn ${status === 'active' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      disabled={f.status === status}
                      onClick={() => setStatus(f.id, status)}
                    >
                      {localizeStatus(status, t)}
                    </button>
                  ))}
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
