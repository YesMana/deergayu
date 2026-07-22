import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Search, Trash2 } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useAppointmentsQuery } from '../../hooks/queries/useAppointments';
import { StatusPill } from './AdminUtils';
import { API_URL } from '../../config/api';


export default function ManageAppointments() {
  const { success, error } = useToast();
  const [apptSearch, setApptSearch] = useState('');
  const [apptDoctorFilter, setApptDoctorFilter] = useState('all');

  const { data: appointments = [], isLoading: loadingAppointments, refetch } = useAppointmentsQuery();
  
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [apptDateFilter, setApptDateFilter] = useState(getTodayDateString());

  const getToken = () => auth.currentUser?.getIdToken();

  const handleUpdateAppointmentStatus = async (id, status) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/appointments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        success('Appointment status updated!');
        refetch(); // Use cache
      } else {
        error('Failed to update appointment status');
      }
    } catch (e) {
      error(e.message);
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (!window.confirm('Delete this appointment? This cannot be undone.')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        success('Appointment deleted!');
        refetch(); // Use cache
      } else {
        error('Failed to delete appointment');
      }
    } catch (e) {
      error(e.message);
    }
  };

  const filteredAppts = appointments.filter(a => {
    const matchSearch = !apptSearch ||
      a.customerName?.toLowerCase().includes(apptSearch.toLowerCase()) ||
      a.providerName?.toLowerCase().includes(apptSearch.toLowerCase());

    const matchDoctor = apptDoctorFilter === 'all' || a.providerId === apptDoctorFilter;
    const matchDate   = !apptDateFilter || a.date === apptDateFilter;

    return matchSearch && matchDoctor && matchDate;
  });

  return (
    <>
      <div className="admin-page-header">
        <div><h1>All Appointments</h1><p className="page-subtitle">{appointments.length} total appointments across the platform</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={loadingAppointments ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: '1.25rem' }}>
        {[
          { label: 'Pending',   val: appointments.filter(a => a.status === 'pending').length,   color: '#ffa726' },
          { label: 'Accepted',  val: appointments.filter(a => a.status === 'accepted').length,  color: '#4caf50' },
          { label: 'Completed', val: appointments.filter(a => a.status === 'completed').length, color: '#26c6da' },
          { label: 'Cancelled', val: appointments.filter(a => a.status === 'cancelled').length, color: '#ef5350' },
        ].map(({ label, val, color }) => (
          <div key={label} className="kpi-card" style={{ '--kpi-accent': color, padding: '1rem 1.25rem' }}>
            <div className="kpi-value" style={{ fontSize: '1.6rem', color }}>{val}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <span className="table-title" style={{ minWidth: '150px' }}><Calendar size={16} /> {filteredAppts.length} appointments</span>
          <div className="table-controls" style={{ gap: '0.8rem', flexWrap: 'wrap', width: 'auto', flex: 1, justifyContent: 'flex-end' }}>
            
            <select
              className="status-select"
              value={apptDoctorFilter}
              onChange={e => setApptDoctorFilter(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', minWidth: '160px', color: 'var(--text-primary)' }}
            >
              <option value="all">All Doctors</option>
              {Array.from(new Set(appointments.map(a => JSON.stringify({ id: a.providerId, name: a.providerName }))))
                .map(str => JSON.parse(str))
                .filter(p => p.id && p.name)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))
              }
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="date"
                className="status-select"
                value={apptDateFilter}
                onChange={e => setApptDateFilter(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
              />
              {apptDateFilter ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setApptDateFilter('')}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  All Dates
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setApptDateFilter(getTodayDateString())}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Today
                </button>
              )}
            </div>

            <div className="search-box">
              <Search size={14} />
              <input placeholder="Search patient name…" value={apptSearch} onChange={e => setApptSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loadingAppointments ? (
          <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
        ) : filteredAppts.length === 0 ? (
          <div className="empty-state"><div className="icon">📅</div><h4>No appointments found</h4></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr>
                <th>Patient</th><th>Contact</th><th>Doctor / Provider</th><th>Date/Time</th><th>Notes</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filteredAppts.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={{ width: '28px', height: '28px', fontSize: '0.72rem' }}>
                          {(a.customerName || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="name">{a.customerName || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {a.customerPhone && (
                        <div style={{ marginBottom: '0.2rem' }}>
                          <a href={`tel:${a.customerPhone}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.8rem' }}>📞 {a.customerPhone}</a>
                        </div>
                      )}
                      {a.customerEmail ? (
                        <div style={{ marginBottom: '0.2rem' }}>
                          <a href={`mailto:${a.customerEmail}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.8rem' }}>✉️ {a.customerEmail}</a>
                        </div>
                      ) : <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No Email</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{a.providerName || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.date || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🕒 {a.time || '—'}</div>
                    </td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      {a.notes || '—'}
                    </td>
                    <td><StatusPill status={a.status} /></td>
                    <td>
                      <div className="action-btns" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <select
                          className="status-select"
                          value={a.status || 'pending'}
                          onChange={e => handleUpdateAppointmentStatus(a.id, e.target.value)}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          {['pending','accepted','rejected','confirmed','completed','cancelled'].map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                        <button
                          className="btn-xs delete-btn"
                          onClick={() => handleDeleteAppointment(a.id)}
                          style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={13} />
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
    </>
  );
}
