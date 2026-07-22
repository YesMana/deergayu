import React, { useState, useEffect, useCallback } from 'react';
import { Video, Trash2 } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { API_URL } from '../../config/api';


const ManageVideos = () => {
  const { success, error } = useToast();
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ title: '', description: '', youtubeId: '', category: '', duration: '' });

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/videos`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) setVideos(await res.json());
    } catch (e) { console.error(e); }
    setLoadingVideos(false);
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const method = editingVideo ? 'PUT' : 'POST';
      const url = editingVideo ? `${API_URL}/api/videos/${editingVideo.id}` : `${API_URL}/api/videos`;
      const res = await fetch(url, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(videoForm)
      });
      if (res.ok) {
        success(editingVideo ? 'Video updated successfully' : 'Video added successfully');
        setShowVideoModal(false);
        fetchVideos();
      } else {
        error('Failed to save video');
      }
    } catch (err) { error('Error saving video'); }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/videos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { success('Video deleted'); fetchVideos(); }
      else error('Failed to delete video');
    } catch (err) { error('Error deleting video'); }
  };

  return (
    <>
      <div className="admin-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>Videos Management</h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Add, edit, or remove videos displayed on the public library.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingVideo(null); setVideoForm({ title: '', description: '', youtubeId: '', category: '', duration: '' }); setShowVideoModal(true); }}>
          + Add Video
        </button>
      </div>

      {loadingVideos ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>Loading videos...</div>
      ) : videos.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <Video size={48} style={{ color: '#555', margin: '0 auto 1rem' }} />
          <h3 style={{ color: '#fff', marginBottom: '0.5rem' }}>No videos found</h3>
          <p style={{ color: '#aaa' }}>Click the Add Video button to create your first entry.</p>
        </div>
      ) : (
        <div className="admin-table-container glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>YouTube ID</th>
                <th>Duration</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map(v => (
                <tr key={v.id}>
                  <td>
                    <div style={{ fontWeight: '500', color: '#fff' }}>{v.title}</div>
                    {v.description && <div style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '4px' }}>{v.description.slice(0, 50)}...</div>}
                  </td>
                  <td><span className="status-pill" style={{ background: 'rgba(255,255,255,0.1)' }}>{v.category}</span></td>
                  <td><code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{v.youtubeId}</code></td>
                  <td>{v.duration || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-icon btn-sm" onClick={() => { setEditingVideo(v); setVideoForm({ title: v.title, description: v.description || '', youtubeId: v.youtubeId, category: v.category || '', duration: v.duration || '' }); setShowVideoModal(true); }} style={{ marginRight: '0.5rem' }}>✎</button>
                    <button className="btn btn-icon btn-sm" onClick={() => handleDeleteVideo(v.id)} style={{ color: '#ef5350' }}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showVideoModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '1.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingVideo ? 'Edit Video' : 'Add New Video'}</h3>
            <form onSubmit={handleSaveVideo}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Video Title *</label>
                <input required type="text" className="form-control" value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} placeholder="e.g. Benefits of Ayurveda" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>YouTube ID *</label>
                <input required type="text" className="form-control" value={videoForm.youtubeId} onChange={e => setVideoForm({...videoForm, youtubeId: e.target.value})} placeholder="e.g. dQw4w9WgXcQ" />
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>The 11-character code in the YouTube URL (v=ID)</div>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Category</label>
                  <input list="video-categories" className="form-control" value={videoForm.category} onChange={e => setVideoForm({...videoForm, category: e.target.value})} placeholder="Select or type category" />
                  <datalist id="video-categories">
                    <option value="Yoga & Meditation" />
                    <option value="Herbal Remedies" />
                    <option value="Healthy Diet" />
                    <option value="Daily Routine" />
                    {Array.from(new Set(videos.map(v => v.category))).filter(c => c && !["Yoga & Meditation", "Herbal Remedies", "Healthy Diet", "Daily Routine"].includes(c)).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Duration (Optional)</label>
                  <input type="text" className="form-control" value={videoForm.duration} onChange={e => setVideoForm({...videoForm, duration: e.target.value})} placeholder="e.g. 10 mins" />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}>Description</label>
                <textarea className="form-control" value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})} rows="3" placeholder="Brief description..."></textarea>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowVideoModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingVideo ? 'Update Video' : 'Add Video'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageVideos;
