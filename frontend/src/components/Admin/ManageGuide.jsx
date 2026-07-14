import React, { useState, useEffect } from 'react';
import { Leaf, Clock, Plus, Edit, Trash2, Save, X, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ManageGuide = () => {
  const [activeTab, setActiveTab] = useState('remedies');
  const [remedies, setRemedies] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const initialRemedyState = {
    image: '',
    en: { name: '', ingredients: '', uses: '', preparation: '' },
    si: { name: '', ingredients: '', uses: '', preparation: '' },
    ta: { name: '', ingredients: '', uses: '', preparation: '' }
  };
  
  const initialRoutineState = {
    condition: 'general',
    order: 1,
    icon: 'Sun',
    en: { time: '', title: '', description: '', tips: '' },
    si: { time: '', title: '', description: '', tips: '' },
    ta: { time: '', title: '', description: '', tips: '' }
  };
  
  const [currentFormData, setCurrentFormData] = useState(initialRemedyState);
  const { lang } = useLanguage();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'remedies' ? '/api/guide/remedies' : '/api/guide/routines';
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      if (activeTab === 'remedies') {
        setRemedies(data);
      } else {
        setRoutines(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('This will add the initial demo data to your database. Continue?')) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/guide/seed`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to seed data');
      alert('Demo data seeded successfully!');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to seed demo data.');
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setCurrentFormData(activeTab === 'remedies' ? initialRemedyState : initialRoutineState);
    setIsEditing(true);
  };

  const handleEdit = (item) => {
    setCurrentFormData(item);
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const endpoint = activeTab === 'remedies' ? `/api/guide/remedies/${id}` : `/api/guide/routines/${id}`;
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to delete item.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const isUpdating = currentFormData.id;
      const endpoint = activeTab === 'remedies' 
        ? (isUpdating ? `/api/guide/remedies/${currentFormData.id}` : '/api/guide/remedies')
        : (isUpdating ? `/api/guide/routines/${currentFormData.id}` : '/api/guide/routines');
      
      const method = isUpdating ? 'PUT' : 'POST';
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFormData)
      });
      
      if (!response.ok) throw new Error('Failed to save');
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to save item.');
    }
  };

  const updateNestedField = (language, field, value) => {
    setCurrentFormData(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        [field]: value
      }
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      setCurrentFormData({...currentFormData, image: data.url});
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const renderRemedyForm = () => (
    <form onSubmit={handleSave} className="admin-form">
      <h3>{currentFormData.id ? 'Edit Remedy' : 'Add New Remedy'}</h3>
      
      <div className="form-group">
        <label>Image Upload or URL</label>
        <div className="image-input-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <ImageIcon size={20} />
          <input 
            type="url" 
            placeholder="Or paste URL here (https://...)" 
            value={currentFormData.image || ''} 
            onChange={(e) => setCurrentFormData({...currentFormData, image: e.target.value})}
            style={{ flex: 1 }}
          />
          <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
            <button type="button" className="btn-secondary" style={{ display: 'flex', gap: '5px', alignItems: 'center' }} disabled={uploadingImage}>
              <UploadCloud size={16} /> {uploadingImage ? 'Uploading...' : 'Upload Image'}
            </button>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>
        {currentFormData.image && (
          <img src={currentFormData.image} alt="Preview" style={{width: '100px', height: '100px', objectFit: 'cover', marginTop: '10px', borderRadius: '8px'}} />
        )}
      </div>

      <div className="language-sections">
        {['en', 'si', 'ta'].map((l) => (
          <div key={l} className="lang-section glass-panel">
            <h4>{l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}</h4>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={currentFormData[l]?.name || ''} onChange={(e) => updateNestedField(l, 'name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Ingredients</label>
              <input type="text" value={currentFormData[l]?.ingredients || ''} onChange={(e) => updateNestedField(l, 'ingredients', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Uses</label>
              <textarea value={currentFormData[l]?.uses || ''} onChange={(e) => updateNestedField(l, 'uses', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Preparation</label>
              <textarea value={currentFormData[l]?.preparation || ''} onChange={(e) => updateNestedField(l, 'preparation', e.target.value)} required />
            </div>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
        <button type="submit" className="btn-primary">Save Remedy</button>
      </div>
    </form>
  );

  const renderRoutineForm = () => (
    <form onSubmit={handleSave} className="admin-form">
      <h3>{currentFormData.id ? 'Edit Routine' : 'Add New Routine'}</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label>Condition Category</label>
          <select 
            value={currentFormData.condition || 'general'} 
            onChange={(e) => setCurrentFormData({...currentFormData, condition: e.target.value})}
            required
            className="input-field"
          >
            <option value="general">General Wellness (සාමාන්‍ය සෞඛ්‍යය)</option>
            <option value="diabetes">Diabetes (දියවැඩියාව)</option>
            <option value="hypertension">High Blood Pressure (අධිරුධිර පීඩනය)</option>
            <option value="cholesterol">High Cholesterol (කොලෙස්ටරෝල්)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Order Number</label>
          <input 
            type="number" 
            value={currentFormData.order || 1} 
            onChange={(e) => setCurrentFormData({...currentFormData, order: parseInt(e.target.value)})}
            required
          />
        </div>
        <div className="form-group">
          <label>Icon Name (e.g., Sun, Moon, Droplet, Coffee, Activity)</label>
          <input 
            type="text" 
            value={currentFormData.icon || 'Sun'} 
            onChange={(e) => setCurrentFormData({...currentFormData, icon: e.target.value})}
            required
          />
        </div>
      </div>

      <div className="language-sections">
        {['en', 'si', 'ta'].map((l) => (
          <div key={l} className="lang-section glass-panel">
            <h4>{l === 'en' ? 'English' : l === 'si' ? 'සිංහල' : 'தமிழ்'}</h4>
            <div className="form-group">
              <label>Time (e.g. 5:00 AM - 6:00 AM)</label>
              <input type="text" value={currentFormData[l]?.time || ''} onChange={(e) => updateNestedField(l, 'time', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={currentFormData[l]?.title || ''} onChange={(e) => updateNestedField(l, 'title', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={currentFormData[l]?.description || ''} onChange={(e) => updateNestedField(l, 'description', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Tips (Separate with | character)</label>
              <textarea value={currentFormData[l]?.tips || ''} onChange={(e) => updateNestedField(l, 'tips', e.target.value)} required />
            </div>
          </div>
        ))}
      </div>
      
      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
        <button type="submit" className="btn-primary">Save Routine</button>
      </div>
    </form>
  );

  return (
    <div className="manage-guide">
      <div className="admin-page-header">
        <div>
          <h1>Ayurvedic Guide</h1>
          <p className="page-subtitle">Manage herbal remedies and daily routines</p>
        </div>
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={handleSeedData} style={{ borderColor: '#d4af37', color: '#d4af37' }}>
              Seed Demo Data
            </button>
            <button className="btn btn-primary" onClick={handleAddNew} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Add New {activeTab === 'remedies' ? 'Remedy' : 'Routine'}
            </button>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="table-toolbar" style={{ marginBottom: '1.5rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="filter-chips" style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className={`filter-chip ${activeTab === 'remedies' ? 'active' : ''}`} 
              onClick={() => setActiveTab('remedies')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Leaf size={14} /> Herbal Remedies
            </button>
            <button 
              className={`filter-chip ${activeTab === 'routines' ? 'active' : ''}`} 
              onClick={() => setActiveTab('routines')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Clock size={14} /> Daily Routines
            </button>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="edit-container glass-panel">
          {activeTab === 'remedies' ? renderRemedyForm() : renderRoutineForm()}
        </div>
      ) : (
        <div className="data-table-container glass-panel">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
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
                {(activeTab === 'remedies' ? remedies : routines.sort((a,b) => {
                   if (a.condition !== b.condition) return a.condition.localeCompare(b.condition);
                   return a.order - b.order;
                })).map((item) => (
                  <tr key={item.id}>
                    {activeTab === 'remedies' ? (
                      <>
                        <td>
                          <img src={item.image} alt={item.en?.name} style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px'}} />
                        </td>
                        <td>{item.en?.name}</td>
                        <td className="truncate-text">{item.en?.uses}</td>
                      </>
                    ) : (
                      <>
                        <td>{item.order}</td>
                        <td><span className="badge">{item.condition || 'general'}</span></td>
                        <td>{item.en?.time}</td>
                        <td>{item.en?.title}</td>
                      </>
                    )}
                    <td className="action-cells">
                      <button className="btn-icon-primary" onClick={() => handleEdit(item)}><Edit size={16}/></button>
                      <button className="btn-icon-danger" onClick={() => handleDelete(item.id)}><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
                {(activeTab === 'remedies' ? remedies : routines).length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-state">No {activeTab} found. Click Add New to create one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageGuide;
