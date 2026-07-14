import React, { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInfiniteProvidersQuery } from '../../hooks/queries/useProviders';
import { db, auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { userInitials, StatusPill } from './AdminUtils';

const API_URL = import.meta.env.VITE_API_URL || '';
const PAGE_SIZE = 20;

export default function ManageProviders() {
  const { success, error } = useToast();
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  
  // Pagination
  const [currentPageProviders, setCurrentPageProviders] = useState(1);
  const [providersCursors, setProvidersCursors] = useState([null]);
  const [totalProviders, setTotalProviders] = useState(0);

  // Selected Doctor Details Modal states
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [loadingDoctorAppts, setLoadingDoctorAppts] = useState(false);
  const [modalTab, setModalTab] = useState('profile'); // 'profile' or 'appointments'

  const getToken = () => auth.currentUser?.getIdToken();



  const fetchDoctorAppointments = async (doctorId) => {
    setLoadingDoctorAppts(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('providerId', '==', doctorId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      setDoctorAppts(list.slice(0, 50)); // Show last 50
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDoctorAppts(false);
    }
  };

  const handleApproveUser = async (uid) => {
    if (!window.confirm('Approve this expert?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) { 
        success('Expert approved!'); 
        refetch();
      } else {
        error('Failed to approve');
      }
    } catch (e) { 
      error(e.message); 
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div><h1>Manage Experts</h1><p className="page-subtitle">Approve and manage doctors, clinics, and organizations</p></div>
        <button onClick={loadExperts} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} className={isFetching && !isFetchingNextPage ? 'spin' : ''} /> Refresh
        </button>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title"><Users size={16} /> Experts</span>
          <div className="table-controls">
            <div className="search-box" style={{ minWidth: '220px' }}>
              <Search size={14} />
              <input placeholder="Search name or email…" value={providerSearch} onChange={e => setProviderSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {status === 'pending' ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading providers...</div>
        ) : status === 'error' ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error loading providers.</div>
        ) : providers.length === 0 ? (
          <div className="empty-state"><div className="icon">👤</div><h4>No experts found</h4></div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr>
                  <th>Expert</th><th>Role</th><th>Specialty</th><th>Location</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {providers.filter(p => p.name?.toLowerCase().includes(providerSearch.toLowerCase()) || p.email?.toLowerCase().includes(providerSearch.toLowerCase())).map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {p.profileDetails?.profileImageUrl
                              ? <img src={p.profileDetails.profileImageUrl} alt={p.name} />
                              : userInitials(p)}
                          </div>
                          <div>
                            <div className="name">{p.name || '—'}</div>
                            <div className="email">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.role}</td>
                      <td>{p.profileDetails?.specialty || p.profileDetails?.category || '—'}</td>
                      <td>{p.profileDetails?.address || '—'}</td>
                      <td><StatusPill status={p.status === 'pending' ? 'pending' : 'approved'} /></td>
                      <td>
                        <div className="action-btns">
                          {p.status === 'pending' && (
                            <button className="btn-xs approve" onClick={() => handleApproveUser(p.id)}>
                              Approve
                            </button>
                          )}
                          <button
                            className="btn-xs edit-btn"
                            onClick={() => {
                              setSelectedDoctor(p);
                              fetchDoctorAppointments(p.id);
                            }}
                            style={{ background: 'var(--primary-color)', color: 'white' }}
                          >
                            View Details
                          </button>
                          <a href={`mailto:${p.email}`} className="btn-xs edit-btn" style={{ textDecoration: 'none' }}>
                            Email
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasNextPage && (
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedDoctor && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', overflow: 'hidden', borderRadius: '50%' }}>
                  {selectedDoctor.profileDetails?.profileImageUrl ? (
                    <img src={selectedDoctor.profileDetails.profileImageUrl} alt={selectedDoctor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userInitials(selectedDoctor)
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedDoctor.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    💼 {selectedDoctor.role} · {selectedDoctor.profileDetails?.specialty || selectedDoctor.profileDetails?.category || 'General Ayurveda'}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDoctor(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
              <button
                className={`dashboard-tab ${modalTab === 'profile' ? 'active' : ''}`}
                onClick={() => setModalTab('profile')}
                style={{ background: 'none', border: 'none', color: modalTab === 'profile' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: modalTab === 'profile' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Profile & Schedule
              </button>
              <button
                className={`dashboard-tab ${modalTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setModalTab('appointments')}
                style={{ background: 'none', border: 'none', color: modalTab === 'appointments' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: modalTab === 'appointments' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Appointments History ({doctorAppts.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {modalTab === 'profile' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        <a href={`mailto:${selectedDoctor.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{selectedDoctor.email}</a>
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        <a href={`tel:${selectedDoctor.profileDetails?.phone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{selectedDoctor.profileDetails?.phone || '—'}</a>
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong style={{ color: 'var(--text-secondary)' }}>Location/Address:</strong>
                      <div style={{ marginTop: '0.2rem' }}>📍 {selectedDoctor.profileDetails?.address || '—'}</div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '1rem 0 0.5rem' }}>
                    🗓️ Weekly Time Slots & Schedule
                  </h3>
                  {selectedDoctor.profileDetails?.schedule ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                        ⏱️ Appointment Slot Duration: <strong>{selectedDoctor.profileDetails.schedule.slotDuration || 30} minutes</strong>
                      </p>
                      {selectedDoctor.profileDetails.schedule.workingDays && Object.keys(selectedDoctor.profileDetails.schedule.workingDays).map(day => {
                        const info = selectedDoctor.profileDetails.schedule.workingDays[day];
                        return (
                          <div key={day} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.82rem' }}>
                            <span style={{ fontWeight: 600 }}>{day}</span>
                            <span style={{ color: info.active ? '#4caf50' : 'var(--text-muted)' }}>
                              {info.active ? `${info.start || '09:00'} - ${info.end || '17:00'}` : 'Closed'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem' }}>No working schedule set by provider.</p>
                  )}
                </div>
              )}

              {modalTab === 'appointments' && (
                <div>
                  {loadingDoctorAppts ? (
                    <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
                  ) : doctorAppts.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem 0' }}>
                      <div className="icon">📅</div>
                      <p>No appointments scheduled yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {doctorAppts.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{a.customerName || 'Patient'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {a.date || '—'} at {a.time || '—'}
                            </div>
                          </div>
                          <div>
                            <StatusPill status={a.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
