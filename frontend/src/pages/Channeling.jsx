import React, { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, Star, Video, MapPin, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './Channeling.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const sriLankaData = {
  "Western": ["Colombo", "Gampaha", "Kalutara"],
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "Eastern": ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Uva": ["Badulla", "Monaragala"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"],
  "Online": ["Online"]
};

const specialties = ["Sarwanga Roga (General)", "Kadum Bindum (Orthopedic)", "Sarpa Visha (Toxicology)", "Yantra & Mantra", "Vastu Shastra"];

const Channeling = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  
  // Booking Modal State
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/providers`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceChange = (e) => {
    setProvinceFilter(e.target.value);
    setDistrictFilter('all');
  };

  const filteredProviders = providers.filter(p => {
    const details = p.profileDetails || {};
    const type = details.doctorType || p.role;
    const specialty = details.specialty || '';
    const province = details.province || '';
    const district = details.address || '';

    const matchType = filterType === 'all' || (filterType === 'doctor' && (type === 'doctor' || type === 'Ayurvedic Physician' || p.role === 'doctor' || p.role === 'clinic')) || (filterType === 'astrologer' && (type === 'astrologer' || type === 'Vedic Astrologer'));
    const matchProvince = provinceFilter === 'all' || province === provinceFilter;
    const matchDistrict = districtFilter === 'all' || district.includes(districtFilter);
    const matchSpecialty = specialtyFilter === 'all' || specialty === specialtyFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        specialty.toLowerCase().includes(searchQuery.toLowerCase());
                        
    return matchType && matchProvince && matchDistrict && matchSpecialty && matchSearch;
  });

  const handleBookClick = (provider) => {
    if (!user) {
      alert("Please login to book an appointment.");
      navigate('/login');
      return;
    }
    setSelectedProvider(provider);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      alert("Please select a date and time.");
      return;
    }

    setIsBooking(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId: selectedProvider.id,
          providerName: selectedProvider.name,
          date: bookingDate,
          time: bookingTime,
          notes: bookingNotes
        })
      });

      if (res.ok) {
        alert("Appointment booked successfully!");
        setSelectedProvider(null);
        setBookingDate('');
        setBookingTime('');
        setBookingNotes('');
        navigate('/my-appointments');
      } else {
        alert("Failed to book appointment.");
      }
    } catch (err) {
      console.error('Error booking:', err);
      alert("An error occurred while booking.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="channeling-page animate-fade-in">
      <div className="channeling-header">
        <div className="container">
          <h1 className="channeling-title">{t('ch_title')}</h1>
          <p className="channeling-subtitle">{t('ch_subtitle')}</p>
          
          <div className="filter-tabs">
            <button 
              className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              {t('ch_tab_all')}
            </button>
            <button 
              className={`tab-btn ${filterType === 'doctor' ? 'active' : ''}`}
              onClick={() => setFilterType('doctor')}
            >
              {t('ch_tab_doc')}
            </button>
            <button 
              className={`tab-btn ${filterType === 'astrologer' ? 'active' : ''}`}
              onClick={() => setFilterType('astrologer')}
            >
              {t('ch_tab_astro')}
            </button>
          </div>

          <div className="filter-controls-container">
            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder={t('ch_search')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="channeling-search-input"
              />
            </div>

            <div className="filter-dropdowns">
              <select 
                value={provinceFilter} 
                onChange={handleProvinceChange}
                className="filter-select"
              >
                <option value="all">{t('ch_all_prov')}</option>
                {Object.keys(sriLankaData).map(prov => (
                  <option key={prov} value={prov}>{t(prov)}</option>
                ))}
              </select>

              <select 
                value={districtFilter} 
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="filter-select"
                disabled={provinceFilter === 'all'}
              >
                <option value="all">{t('ch_all_dist')}</option>
                {provinceFilter !== 'all' && sriLankaData[provinceFilter].map(dist => (
                  <option key={dist} value={dist}>{t(dist)}</option>
                ))}
              </select>

              <select 
                value={specialtyFilter} 
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">{t('ch_all_spec')}</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{t(s)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container channeling-content">
        <div className="providers-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading experts...</div>
          ) : filteredProviders.length > 0 ? (
            filteredProviders.map(provider => (
              <div key={provider.id} className="provider-card glass-panel">
                <div className="provider-image-wrapper">
                  <img src={provider.profileDetails?.image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80"} alt={provider.name} className="provider-image" />
                  <div className="provider-rating">
                    <Star size={14} className="star-icon" fill="currentColor" /> {provider.rating || '4.9'}
                  </div>
                </div>
                
                <div className="provider-info">
                  <div className="provider-header-info">
                    <h3 className="provider-name">{provider.name} <CheckCircle2 size={18} className="verified-icon" /></h3>
                    <p className="provider-role">{provider.profileDetails?.doctorType || provider.role}</p>
                  </div>
                  
                  <div className="provider-details">
                    <span className="detail-tag">{t(provider.profileDetails?.specialty || 'General')}</span>
                    <span className="detail-tag">{provider.profileDetails?.experience || '10+ Years'}</span>
                    <span className="detail-tag flex-center"><MapPin size={14}/> {t(provider.profileDetails?.address || 'Sri Lanka')}</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <div className="action-buttons">
                    <button className="btn btn-outline btn-full" onClick={() => alert("Video consultations coming soon!")}>
                      <Video size={18} /> {t('ch_btn_video')}
                    </button>
                    <button className="btn btn-primary btn-full" onClick={() => handleBookClick(provider)}>
                      <CalendarIcon size={18} /> {t('ch_btn_book')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
              <p>{t('ch_no_results')}</p>
            </div>
          )}
        </div>
      </div>

      {selectedProvider && (
        <div className="modal-overlay" onClick={() => setSelectedProvider(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h2>Book Appointment</h2>
              <button className="icon-btn" onClick={() => setSelectedProvider(null)}><X size={24} /></button>
            </div>
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(var(--primary-color-rgb), 0.1)', borderRadius: 'var(--radius-sm)' }}>
              <strong>Expert:</strong> {selectedProvider.name} <br/>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{selectedProvider.profileDetails?.specialty || selectedProvider.role}</span>
            </div>
            
            <form onSubmit={handleBookingSubmit} className="admin-form">
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  value={bookingDate} 
                  onChange={(e) => setBookingDate(e.target.value)} 
                  required 
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="form-group">
                <label>Time Slot</label>
                <select 
                  value={bookingTime} 
                  onChange={(e) => setBookingTime(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select a time slot</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes/Symptoms (Optional)</label>
                <textarea 
                  value={bookingNotes} 
                  onChange={(e) => setBookingNotes(e.target.value)} 
                  rows="3"
                  placeholder="Briefly describe your symptoms..."
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 175, 55, 0.3)', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                ></textarea>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={isBooking}
              >
                {isBooking ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channeling;
