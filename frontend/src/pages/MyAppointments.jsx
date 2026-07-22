import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Calendar, Clock, AlertCircle, CheckCircle, XCircle, Phone } from 'lucide-react';
import './AdminDashboard.css';
import { API_URL } from '../config/api';


const MyAppointments = () => {
  const { user } = useAuth();
  const { success, error } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener via Firestore
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'appointments'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      apts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAppointments(apts);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to appointments:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      if (!auth.currentUser) { error("Not authenticated"); return; }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/my-appointments/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        success("Appointment cancelled successfully");
      } else {
        error("Failed to cancel appointment");
      }
    } catch (err) {
      console.error('Error cancelling:', err);
      error("Error cancelling appointment");
    }
  };

  const statusConfig = {
    pending:   { label: 'Pending',   bg: '#fff3cd', color: '#856404', Icon: AlertCircle },
    accepted:  { label: 'Confirmed', bg: '#d4edda', color: '#155724', Icon: CheckCircle },
    rejected:  { label: 'Declined',  bg: '#f8d7da', color: '#721c24', Icon: XCircle },
    cancelled: { label: 'Cancelled', bg: '#e2e3e5', color: '#383d41', Icon: XCircle },
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-secondary)' }}>
      <div className="cart-spinner" style={{ margin: '0 auto 1rem' }}></div>
      Loading appointments...
    </div>
  );

  return (
    <div className="container" style={{ paddingTop: '100px', minHeight: '80vh', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>My Appointments</h1>
        <span style={{ background: 'rgba(212,175,55,0.15)', color: 'var(--primary-color)', borderRadius: 20, padding: '0.2rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}>
          {appointments.length} total
        </span>
      </div>

      {appointments.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No appointments booked yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You haven't booked any channeling appointments.</p>
          <Link to="/channeling" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> Book an Appointment
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.map(apt => {
            const s = statusConfig[apt.status] || statusConfig.pending;
            const Icon = s.Icon;
            const bookingRef = apt.id?.slice(-8).toUpperCase();

            return (
              <div key={apt.id} className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>{apt.providerName || 'Doctor'}</h3>
                      <span style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.8)', borderRadius: 10, padding: '0.1rem 0.5rem', fontSize: '0.72rem', fontWeight: 600 }}>
                        #{bookingRef}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: apt.notes ? '0.5rem' : 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={14} /> {apt.date}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={14} /> {apt.time}
                      </span>
                    </div>

                    {apt.notes && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        📝 {apt.notes}
                      </p>
                    )}

                    {/* Show provider phone if accepted */}
                    {apt.status === 'accepted' && apt.providerPhone && (
                      <a href={`tel:${apt.providerPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', color: 'var(--primary-color)', fontSize: '0.85rem', textDecoration: 'none' }}>
                        <Phone size={14} /> {apt.providerPhone}
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: s.bg, color: s.color, borderRadius: 20, padding: '0.3rem 0.85rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Icon size={13} /> {s.label}
                    </span>

                    {(apt.status === 'pending' || apt.status === 'accepted') && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', color: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
