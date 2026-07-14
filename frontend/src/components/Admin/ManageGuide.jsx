import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Leaf, Clock, Plus, Edit, Trash2, Image as ImageIcon, UploadCloud, RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const CONDITION_LABELS = {
  general: 'General Wellness',
  diabetes: 'Diabetes',
  hypertension: 'High Blood Pressure',
  cholesterol: 'High Cholesterol',
};

const initialRemedyState = {
  image: '',
  category: 'general',
  status: 'published',
  order: 1,
  en: { name: '', ingredients: '', uses: '', preparation: '' },
  si: { name: '', ingredients: '', uses: '', preparation: '' },
  ta: { name: '', ingredients: '', uses: '', preparation: '' },
};

const initialRoutineState = {
  condition: 'general',
  order: 1,
  icon: 'Sun',
  status: 'published',
  en: { time: '', title: '', description: '', tips: '' },
  si: { time: '', title: '', description: '', tips: '' },
  ta: { time: '', title: '', description: '', tips: '' },
};

function sortRoutines(list) {
  return [...(list || [])].sort((a, b) => {
    const ca = String(a?.condition || 'general');
    const cb = String(b?.condition || 'general');
    if (ca !== cb) return ca.localeCompare(cb);
    return (Number(a?.order) || 0) - (Number(b?.order) || 0);
  });
}

const ManageGuide = () => {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('remedies');
  const [remedies, setRemedies] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conditionFilter, setConditionFilter] = useState('all');
  const [currentFormData, setCurrentFormData] = useState(initialRemedyState);

  const getToken = async () => auth.currentUser?.getIdToken();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const endpoint = activeTab === 'remedies' ? '/api/guide/remedies' : '/api/guide/routines';
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      if (activeTab === 'remedies') setRemedies(list);
      else setRoutines(list);
    } catch (err) {
      console.error(err);
      error('Failed to load guide content. Check API connection.');
      if (activeTab === 'remedies') setRemedies([]);
      else setRoutines([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, error]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedRoutines = useMemo(() => sortRoutines(routines), [routines]);

  const filteredRoutines = useMemo(() => {
    if (conditionFilter === 'all') return sortedRoutines;
    return sortedRoutines.filter((r) => (r.condition || 'general') === conditionFilter);
  }, [sortedRoutines, conditionFilter]);

  const displayRows = activeTab === 'remedies' ? remedies : filteredRoutines;

  const handleSeedData = async () => {
    if (!window.confirm('This will replace guide demo data in the database. Continue?')) return;
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/guide/seed`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to seed data');
      success('Demo data seeded successfully');
      await fetchData();
    } catch (err) {
      console.error(err);
      error('Failed to seed demo data (admin login required)');
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentFormData(activeTab === 'remedies' ? { ...initialRemedyState } : { ...initialRoutineState });
    setIsEditing(true);
  };

  const handleEdit = (item) => {
    const base = activeTab === 'remedies' ? initialRemedyState : initialRoutineState;
    setCurrentFormData({
      ...base,
      ...item,
      en: { ...base.en, ...(item.en || {}) },
      si: { ...base.si, ...(item.si || {}) },
      ta: { ...base.ta, ...(item.ta || {}) },
      condition: item.condition || 'general',
      order: Number(item.order) || 1,
      icon: item.icon || 'Sun',
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = await getToken();
      const endpoint = activeTab === 'remedies' ? `/api/guide/remedies/${id}` : `/api/guide/routines/${id}`;
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to delete');
      success('Deleted');
      fetchData();
    } catch (err) {
      console.error(err);
      error('Failed to delete item');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      const isUpdating = !!currentFormData.id;
      const endpoint =
        activeTab === 'remedies'
          ? isUpdating
            ? `/api/guide/remedies/${currentFormData.id}`
            : '/api/guide/remedies'
          : isUpdating
            ? `/api/guide/routines/${currentFormData.id}`
            : '/api/guide/routines';

      const payload = { ...currentFormData };
      delete payload.id;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: isUpdating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save');
      }
      success(isUpdating ? 'Updated successfully' : 'Created successfully');
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error(err);
      error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const updateNestedField = (language, field, value) => {
    setCurrentFormData((prev) => ({
      ...prev,
      [language]: {
        ...(prev[language] || {}),
        [field]: value,
      },
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      setCurrentFormData((prev) => ({ ...prev, image: data.url }));
      success('Image uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const renderRemedyForm = () => (
    <form onSubmit={handleSave} className="admin-form">
      <h3 style={{ marginTop: 0 }}>{currentFormData.id ? 'Edit Remedy' : 'Add New Remedy'}</h3>

      <div className="form-group">
        <label>Image Upload or URL</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <ImageIcon size={20} />
          <input
            type="url"
            className="form-control"
            placeholder="https://..."
            value={currentFormData.image || ''}
            onChange={(e) => setCurrentFormData({ ...currentFormData, image: e.target.value })}
            style={{ flex: 1, minWidth: 200 }}
          />
          <label className="btn btn-outline" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', margin: 0 }}>
            <UploadCloud size={16} /> {uploadingImage ? 'Uploading…' : 'Upload'}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} hidden />
          </label>
        </div>
        {currentFormData.image ? (
          <img src={currentFormData.image} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', marginTop: 10, borderRadius: 8 }} />
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {['en', 'si', 'ta'].map((l) => (
          <div key={l} className="glass-panel" style={{ padding: '1rem' }}>
            <h4>{l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}</h4>
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" type="text" value={currentFormData[l]?.name || ''} onChange={(e) => updateNestedField(l, 'name', e.target.value)} required={l === 'en'} />
            </div>
            <div className="form-group">
              <label>Ingredients</label>
              <input className="form-control" type="text" value={currentFormData[l]?.ingredients || ''} onChange={(e) => updateNestedField(l, 'ingredients', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Uses</label>
              <textarea className="form-control" value={currentFormData[l]?.uses || ''} onChange={(e) => updateNestedField(l, 'uses', e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label>Preparation</label>
              <textarea className="form-control" value={currentFormData[l]?.preparation || ''} onChange={(e) => updateNestedField(l, 'preparation', e.target.value)} rows={3} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Remedy'}</button>
      </div>
    </form>
  );

  const renderRoutineForm = () => (
    <form onSubmit={handleSave} className="admin-form">
      <h3 style={{ marginTop: 0 }}>{currentFormData.id ? 'Edit Routine' : 'Add New Routine'}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group">
          <label>Condition Category</label>
          <select
            className="form-control"
            value={currentFormData.condition || 'general'}
            onChange={(e) => setCurrentFormData({ ...currentFormData, condition: e.target.value })}
            required
          >
            {Object.entries(CONDITION_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Order Number</label>
          <input
            className="form-control"
            type="number"
            min={1}
            value={currentFormData.order ?? 1}
            onChange={(e) => setCurrentFormData({ ...currentFormData, order: parseInt(e.target.value, 10) || 1 })}
            required
          />
        </div>
        <div className="form-group">
          <label>Icon (Sun, Moon, Droplet…)</label>
          <input
            className="form-control"
            type="text"
            value={currentFormData.icon || 'Sun'}
            onChange={(e) => setCurrentFormData({ ...currentFormData, icon: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {['en', 'si', 'ta'].map((l) => (
          <div key={l} className="glass-panel" style={{ padding: '1rem' }}>
            <h4>{l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}</h4>
            <div className="form-group">
              <label>Time</label>
              <input className="form-control" type="text" placeholder="5:00 AM - 6:00 AM" value={currentFormData[l]?.time || ''} onChange={(e) => updateNestedField(l, 'time', e.target.value)} required={l === 'en'} />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input className="form-control" type="text" value={currentFormData[l]?.title || ''} onChange={(e) => updateNestedField(l, 'title', e.target.value)} required={l === 'en'} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" value={currentFormData[l]?.description || ''} onChange={(e) => updateNestedField(l, 'description', e.target.value)} rows={3} />
            </div>
            <div className="form-group">
              <label>Tips (separate with | )</label>
              <textarea className="form-control" value={currentFormData[l]?.tips || ''} onChange={(e) => updateNestedField(l, 'tips', e.target.value)} rows={3} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
        <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Routine'}</button>
      </div>
    </form>
  );

  return (
    <div className="manage-guide">
      <div className="admin-page-header">
        <div>
          <h1>Ayurvedic Guide</h1>
          <p className="page-subtitle">Manage herbal remedies and daily routines (Dinacharya)</p>
        </div>
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-outline" onClick={handleSeedData} style={{ borderColor: '#d4af37', color: '#d4af37' }}>
              Seed Demo Data
            </button>
            <button className="btn btn-primary" onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Add {activeTab === 'remedies' ? 'Remedy' : 'Routine'}
            </button>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="table-toolbar" style={{ marginBottom: '1.5rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`filter-chip ${activeTab === 'remedies' ? 'active' : ''}`}
              onClick={() => { setActiveTab('remedies'); setIsEditing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Leaf size={14} /> Herbal Remedies
            </button>
            <button
              className={`filter-chip ${activeTab === 'routines' ? 'active' : ''}`}
              onClick={() => { setActiveTab('routines'); setIsEditing(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Clock size={14} /> Daily Routines
            </button>
          </div>

          {activeTab === 'routines' && (
            <select
              className="form-control"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="all">All conditions</option>
              {Object.entries(CONDITION_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {activeTab === 'remedies' ? renderRemedyForm() : renderRoutineForm()}
        </div>
      ) : (
        <div className="table-container glass-panel">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="spinner" /> Loading…
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    {activeTab === 'remedies' ? (
                      <>
                        <th>Image</th>
                        <th>Name (EN)</th>
                        <th>Uses (EN)</th>
                        <th>Actions</th>
                      </>
                    ) : (
                      <>
                        <th>Order</th>
                        <th>Condition</th>
                        <th>Time</th>
                        <th>Title (EN)</th>
                        <th>Actions</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'remedies' ? 4 : 5} style={{ textAlign: 'center', padding: '2.5rem' }}>
                        No {activeTab} found. Use <strong>Seed Demo Data</strong> or <strong>Add</strong>.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((item) => (
                      <tr key={item.id}>
                        {activeTab === 'remedies' ? (
                          <>
                            <td>
                              {item.image ? (
                                <img src={item.image} alt={item.en?.name || 'Remedy'} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <span style={{ opacity: 0.5 }}>—</span>
                              )}
                            </td>
                            <td>{item.en?.name || '—'}</td>
                            <td className="truncate-text">{item.en?.uses || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td>{item.order ?? '—'}</td>
                            <td>
                              <span className="status-pill" style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37' }}>
                                {CONDITION_LABELS[item.condition] || item.condition || 'general'}
                              </span>
                            </td>
                            <td>{item.en?.time || '—'}</td>
                            <td>{item.en?.title || '—'}</td>
                          </>
                        )}
                        <td>
                          <div className="action-btns">
                            <button type="button" className="btn-xs edit-btn" onClick={() => handleEdit(item)} title="Edit">
                              <Edit size={14} />
                            </button>
                            <button type="button" className="btn-xs delete-btn" onClick={() => handleDelete(item.id)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageGuide;
