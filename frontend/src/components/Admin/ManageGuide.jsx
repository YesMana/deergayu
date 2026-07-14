import React, { useState, useEffect } from 'react';
import { Leaf, Clock, Plus, Edit, Trash2, Save, X, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const ManageGuide = () => {
  const [activeTab, setActiveTab] = useState('remedies');
  const [remedies, setRemedies] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const initialRemedyState = {
    image: '',
    en: { name: '', ingredients: '', uses: '', preparation: '' },
    si: { name: '', ingredients: '', uses: '', preparation: '' },
    ta: { name: '', ingredients: '', uses: '', preparation: '' }
  };
  
  const initialRoutineState = {
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

  const renderRemedyForm = () => (
    <form onSubmit={handleSave} className="admin-form">
      <h3>{currentFormData.id ? 'Edit Remedy' : 'Add New Remedy'}</h3>
      
      <div className="form-group">
        <label>Image URL</label>
        <div className="image-input-group">
          <ImageIcon size={20} />
          <input 
            type="url" 
            placeholder="https://unsplash.com/..." 
            value={currentFormData.image || ''} 
            onChange={(e) => setCurrentFormData({...currentFormData, image: e.target.value})}
            required
          />
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
      <div className="admin-header">
        <h2>Ayurvedic Guide Content Management</h2>
        {!isEditing && (
          <button className="btn-primary" onClick={handleAddNew}>
            <Plus size={18} /> Add New {activeTab === 'remedies' ? 'Remedy' : 'Routine'}
          </button>
        )}
      </div>

      {!isEditing && (
        <div className="admin-tabs">
          <button className={activeTab === 'remedies' ? 'active' : ''} onClick={() => setActiveTab('remedies')}>
            <Leaf size={16} /> Herbal Remedies
          </button>
          <button className={activeTab === 'routines' ? 'active' : ''} onClick={() => setActiveTab('routines')}>
            <Clock size={16} /> Daily Routines
          </button>
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
                      <th>Time (EN)</th>
                      <th>Title (EN)</th>
                      <th>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'remedies' ? remedies : routines).map((item) => (
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
