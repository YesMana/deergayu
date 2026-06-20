import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const MyAppointments = () => {
  const { currentUser } = useAuth();
  const { success, error } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/my-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/my-appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAppointments(appointments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
        success("Appointment cancelled successfully");
      } else {
        error("Failed to cancel appointment");
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      error("Error cancelling appointment");
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading appointments...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Appointments</h1>
      
      {appointments.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No appointments booked yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't booked any channeling appointments.</p>
          <a href="/channeling" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Book an Appointment
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.map(apt => (
            <div key={apt.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>{apt.providerName || 'Doctor'}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {apt.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> {apt.time}</span>
                </div>
                {apt.notes && <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Notes: {apt.notes}</p>}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                {apt.status === 'pending' && <span className="type-badge astrologer" style={{background: '#fff3cd', color: '#856404'}}><AlertCircle size={14} /> Pending</span>}
                {apt.status === 'accepted' && <span className="type-badge doctor" style={{background: '#d4edda', color: '#155724'}}><CheckCircle size={14} /> Confirmed</span>}
                {apt.status === 'rejected' && <span className="type-badge" style={{background: '#f8d7da', color: '#721c24'}}><XCircle size={14} /> Declined</span>}
                {apt.status === 'cancelled' && <span className="type-badge" style={{background: '#e2e3e5', color: '#383d41'}}><XCircle size={14} /> Cancelled</span>}
                
                {(apt.status === 'pending' || apt.status === 'accepted') && (
                  <button 
                    onClick={() => handleCancel(apt.id)}
                    className="btn btn-outline" 
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--error-color)', borderColor: 'var(--error-color)', marginTop: '0.5rem' }}
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
