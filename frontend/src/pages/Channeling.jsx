import React, { useState, useEffect } from 'react';
import { Search, Calendar as CalendarIcon, Star, Video, MapPin, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import './Channeling.css';
import { API_URL } from '../config/api';


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

const docSpecialties = ["Sarwanga Roga (General)", "Kadum Bindum (Orthopedic)", "Sarpa Visha (Toxicology)", "Panchakarma", "Skin Diseases (Dermatology)", "Manasa Roga (Psychiatry)", "Kaumarabhritya (Pediatrics)", "Prasuti & Stri Roga (Gynecology)", "Shalakya Tantra (ENT & Eye)", "Shalya Tantra (Surgery)", "Yantra / Mantra", "Yaga Homa", "Kem Kram", "Traditional Herbal Medicine"];
const astroSpecialties = ["Horoscope Reading", "Yanthra Preparation", "Auspicious Times", "Vasthu Vidya"];

const Channeling = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  const initialService = searchParams.get('service') || 'all';

  const [filterType, setFilterType] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState(initialService);
  
  // Booking Modal State
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [consultMode, setConsultMode] = useState('in_person'); // in_person | video

  const [bookingPhone, setBookingPhone] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [providerReviews, setProviderReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const { data: providers = [], isLoading: loading } = useQuery({
    queryKey: ['channeling_providers'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/providers`);
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (bookingDate && selectedProvider) {
      fetchAvailableSlots(bookingDate);
    }
  }, [bookingDate, selectedProvider]);

  const fetchAvailableSlots = async (date) => {
    setLoadingSlots(true);
    setBookingTime('');
    try {
      const res = await fetch(`${API_URL}/api/appointments/available/${selectedProvider.id}?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.allSlots || []);
        setBookedSlots(data.bookedSlots || []);
      }
    } catch (err) {
      console.error("Error fetching slots", err);
    } finally {
      setLoadingSlots(false);
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

    const matchType = filterType === 'all' || (filterType === 'doctor' && (type === 'doctor' || type === 'Ayurvedic Physician' || type === 'traditional' || p.role === 'doctor' || p.role === 'clinic')) || (filterType === 'astrologer' && (type === 'astrologer' || type === 'Vedic Astrologer'));
    const matchProvince = provinceFilter === 'all' || province === provinceFilter;
    const matchDistrict = districtFilter === 'all' || district.includes(districtFilter);
    const matchSpecialty = specialtyFilter === 'all' || 
                           (Array.isArray(specialty) ? specialty.includes(specialtyFilter) : specialty === specialtyFilter || specialty.includes(specialtyFilter)) || 
                           (details.astrologyServices && details.astrologyServices.includes(specialtyFilter));
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (Array.isArray(specialty) ? specialty.join(' ').toLowerCase().includes(searchQuery.toLowerCase()) : specialty.toLowerCase().includes(searchQuery.toLowerCase()));
                        
    return matchType && matchProvince && matchDistrict && matchSpecialty && matchSearch;
  });

  const handleBookClick = (provider, mode = 'in_person') => {
    if (!user) {
      error("Please login to book an appointment.");
      navigate('/login?returnUrl=/channeling');
      return;
    }
    setConsultMode(mode);
    setBookingNotes(mode === 'video' ? 'Video consultation requested. Doctor will share Google Meet / Zoom link after confirmation.' : '');
    setSelectedProvider(provider);
    setProviderReviews([]);
    setLoadingReviews(true);
    fetch(`${API_URL}/api/reviews/provider/${provider.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProviderReviews(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setProviderReviews([]))
      .finally(() => setLoadingReviews(false));
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDate || !bookingTime) {
      error("Please select a date and time.");
      return;
    }

    setIsBooking(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const notesPrefix = consultMode === 'video' ? '[Video consult] ' : '';
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
          phone: bookingPhone,
          notes: `${notesPrefix}${bookingNotes || ''}`.trim(),
          consultationType: consultMode,
        })
      });

      if (res.ok) {
        success("Appointment booked successfully! ✓");
        setSelectedProvider(null);
        setBookingDate('');
        setBookingTime('');
        setBookingPhone('');
        setBookingNotes('');
        setAvailableSlots([]);
        setBookedSlots([]);
        navigate('/my-appointments');
      } else {
        const errData = await res.json().catch(() => ({}));
        error(errData.error || "Failed to book appointment. Please try again.");
      }
    } catch (err) {
      console.error('Error booking:', err);
      error("Network error. Please check your connection and try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="channeling-page animate-fade-in">
      <SEO title="Book Ayurvedic Doctors | Deergayu" />
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
                {filterType === 'doctor' && docSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                {filterType === 'astrologer' && astroSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                {filterType === 'all' && [...docSpecialties, ...astroSpecialties].map(s => <option key={s} value={s}>{s}</option>)}
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
            filteredProviders.map(provider => {
              const avg = provider.averageRating ?? provider.rating;
              const count = provider.reviewCount;
              return (
              <div key={provider.id} className="provider-card glass-panel">
                <div className="provider-image-wrapper">
                  <img src={provider.profileDetails?.profileImageUrl || provider.profileDetails?.image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80"} alt={provider.name} className="provider-image" />
                  <div className="provider-rating">
                    <Star size={14} className="star-icon" fill="currentColor" />{' '}
                    {avg != null ? Number(avg).toFixed(1) : '—'}
                    {count != null && count > 0 && (
                      <span style={{ marginLeft: 4, opacity: 0.85 }}>({count})</span>
                    )}
                  </div>
                </div>
                
                <div className="provider-info">
                  <div className="provider-header-info">
                    <h3 className="provider-name">{provider.name} <CheckCircle2 size={18} className="verified-icon" /></h3>
                    <p className="provider-role">{provider.profileDetails?.doctorType || provider.role}</p>
                  </div>
                  
                  <div className="provider-details">
                    {provider.profileDetails?.doctorType === 'Vedic Astrologer' && provider.profileDetails?.astrologyServices?.length > 0 ? (
                      provider.profileDetails.astrologyServices.map(service => (
                        <span key={service} className="detail-tag" style={{background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37'}}>
                          {t(service)}
                        </span>
                      ))
                    ) : Array.isArray(provider.profileDetails?.specialty) ? (
                      provider.profileDetails.specialty.map(service => (
                        <span key={service} className="detail-tag" style={{background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', color: '#4caf50'}}>
                          {t(service)}
                        </span>
                      ))
                    ) : (
                      <span className="detail-tag">{t(provider.profileDetails?.specialty || 'General')}</span>
                    )}
                    {provider.profileDetails?.experience && (
                      <span className="detail-tag">{provider.profileDetails.experience} Experience</span>
                    )}
                    <span className="detail-tag flex-center"><MapPin size={14}/> {t(provider.profileDetails?.address || 'Sri Lanka')}</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <div className="action-buttons">
                    <button className="btn btn-outline btn-full" onClick={() => handleBookClick(provider, 'video')}>
                      <Video size={18} /> {t('ch_btn_video')}
                    </button>
                    <button className="btn btn-primary btn-full" onClick={() => handleBookClick(provider, 'in_person')}>
                      <CalendarIcon size={18} /> {t('ch_btn_book')}
                    </button>
                  </div>
                </div>
              </div>
            );
            })
          ) : (
            <div className="no-results" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
              <p>{t('ch_no_results')}</p>
            </div>
          )}
        </div>
      </div>

      {selectedProvider && (
        <div
          onClick={() => { setSelectedProvider(null); setBookingDate(''); setBookingTime(''); setBookingPhone(''); setBookingNotes(''); setAvailableSlots([]); setBookedSlots([]); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '560px',
              background: 'linear-gradient(145deg, #1a1208, #251a0a)',
              border: '1px solid rgba(212,175,55,0.25)',
              borderRadius: '20px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))',
              borderBottom: '1px solid rgba(212,175,55,0.15)',
              padding: '1.5rem 2rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.4), rgba(212,175,55,0.1))',
                  border: '2px solid rgba(212,175,55,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', overflow: 'hidden', flexShrink: 0
                }}>
                  {selectedProvider.photoUrl
                    ? <img src={selectedProvider.photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : '👨‍⚕️'}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(212,175,55,0.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Book Appointment</div>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1.1rem' }}>{selectedProvider.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                    {selectedProvider.profileDetails?.specialty || selectedProvider.profileDetails?.doctorType || selectedProvider.role}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedProvider(null); setBookingDate(''); setBookingTime(''); setBookingPhone(''); setBookingNotes(''); setAvailableSlots([]); setBookedSlots([]); }}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff', flexShrink: 0
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '2rem' }}>
              {(loadingReviews || providerReviews.length > 0) && (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(212,175,55,0.2)'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(212,175,55,0.85)', marginBottom: '0.65rem', fontWeight: 600 }}>
                    Patient Reviews
                    {(selectedProvider.averageRating ?? selectedProvider.rating) != null && (
                      <span style={{ marginLeft: 8, color: '#f1c40f' }}>
                        ★ {Number(selectedProvider.averageRating ?? selectedProvider.rating).toFixed(1)}
                        {selectedProvider.reviewCount != null ? ` · ${selectedProvider.reviewCount}` : ''}
                      </span>
                    )}
                  </div>
                  {loadingReviews ? (
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', margin: 0 }}>Loading reviews…</p>
                  ) : providerReviews.length === 0 ? null : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {providerReviews.map((r) => (
                        <div key={r.id} style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                          <span style={{ color: '#f1c40f' }}>{'★'.repeat(Math.min(5, Number(r.rating) || 0))}</span>
                          {' '}
                          <strong style={{ color: '#fff' }}>{r.userName || 'User'}</strong>
                          {r.comment ? ` — ${r.comment}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Step 1 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#d4af37', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                    <label style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: '0.9rem' }}>Select Date</label>
                  </div>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: bookingDate ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff', fontSize: '1rem',
                      outline: 'none', boxSizing: 'border-box',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                {/* Step 2 – Time Slots */}
                {bookingDate && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#d4af37', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                      <label style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: '0.9rem' }}>
                        Available Time Slots
                        {bookingTime && <span style={{ marginLeft: '0.5rem', color: '#86efac', fontSize: '0.8rem' }}>✓ {bookingTime} selected</span>}
                      </label>
                    </div>

                    {loadingSlots ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        ⏳ Loading available slots...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(220,53,69,0.1)', borderRadius: '10px', border: '1px solid rgba(220,53,69,0.3)' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>🚫</div>
                        <div style={{ color: '#f87171', fontWeight: '600' }}>No availability on this date</div>
                        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', marginTop: '0.25rem' }}>Please try a different date.</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                          {[['Available', 'rgba(212,175,55,0.3)', 'rgba(212,175,55,0.7)'], ['Selected', 'rgba(34,197,94,0.25)', 'rgba(34,197,94,0.8)'], ['Booked', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.15)']].map(([label, bg, bc]) => (
                            <span key={label} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: bg, border: `1px solid ${bc}`, display: 'inline-block' }} />
                              {label}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '0.5rem' }}>
                          {availableSlots.map(slot => {
                            const isBooked = bookedSlots.includes(slot);
                            const isSelected = bookingTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isBooked}
                                onClick={() => setBookingTime(slot)}
                                style={{
                                  padding: '0.6rem 0.4rem',
                                  borderRadius: '8px',
                                  border: '1px solid',
                                  borderColor: isBooked ? 'rgba(255,255,255,0.08)' : isSelected ? 'rgba(34,197,94,0.8)' : 'rgba(212,175,55,0.4)',
                                  background: isBooked ? 'rgba(255,255,255,0.03)' : isSelected ? 'rgba(34,197,94,0.2)' : 'rgba(212,175,55,0.08)',
                                  color: isBooked ? 'rgba(255,255,255,0.18)' : isSelected ? '#86efac' : 'rgba(212,175,55,0.9)',
                                  cursor: isBooked ? 'not-allowed' : 'pointer',
                                  textDecoration: isBooked ? 'line-through' : 'none',
                                  fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500',
                                  transition: 'all 0.15s',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                  boxShadow: isSelected ? '0 0 12px rgba(34,197,94,0.25)' : 'none'
                                }}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 – Phone Number */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#d4af37', fontWeight: 'bold', flexShrink: 0 }}>3</div>
                    <label style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: '0.9rem' }}>Contact Number <span style={{ color: '#ef4444' }}>*</span></label>
                  </div>
                  <input
                    type="tel"
                    value={bookingPhone}
                    onChange={e => setBookingPhone(e.target.value)}
                    required
                    placeholder="e.g. 0712345678"
                    style={{
                      width: '100%', padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: bookingPhone ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff', fontSize: '0.95rem',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Step 4 – Notes */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#d4af37', fontWeight: 'bold', flexShrink: 0 }}>4</div>
                    <label style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: '0.9rem' }}>
                      Notes / Symptoms <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'normal' }}>(Optional)</span>
                    </label>
                  </div>
                  <textarea
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                    rows="3"
                    placeholder="Briefly describe your symptoms or reason for visit..."
                    style={{
                      width: '100%', padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff', fontSize: '0.9rem', resize: 'vertical',
                      outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'inherit', lineHeight: '1.5'
                    }}
                  />
                </div>

                {/* Confirm Button */}
                <button
                  type="submit"
                  disabled={isBooking || !bookingDate || !bookingTime || !bookingPhone}
                  style={{
                    width: '100%', padding: '1rem',
                    borderRadius: '12px', border: 'none',
                    background: (!bookingDate || !bookingTime || !bookingPhone || isBooking)
                      ? 'rgba(255,255,255,0.07)'
                      : 'linear-gradient(135deg, #d4af37, #b8960c)',
                    color: (!bookingDate || !bookingTime || !bookingPhone || isBooking) ? 'rgba(255,255,255,0.25)' : '#1a1208',
                    fontWeight: 'bold', fontSize: '1rem',
                    cursor: (!bookingDate || !bookingTime || !bookingPhone || isBooking) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.5px',
                    boxShadow: (!bookingDate || !bookingTime || !bookingPhone || isBooking) ? 'none' : '0 4px 20px rgba(212,175,55,0.35)'
                  }}
                >
                  {isBooking ? '⏳ Booking...' : !bookingDate ? '← Select a date first' : !bookingTime ? '← Select a time slot' : !bookingPhone ? '← Enter contact number' : '✓ Confirm Appointment'}
                </button>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Channeling;
