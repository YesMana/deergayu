import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar as CalendarIcon, Star, Video, MapPin, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auth } from '../firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import './Channeling.css';
import { API_URL } from '../config/api';
import {
  cleanDisplayText,
  formatDoctorTypeLabel,
  getProviderSpecialties,
  getProviderTitle,
} from '../utils/doctorUtils';
import { localizeSpecialty } from '../i18n/catalogLabels';


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
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();
  
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  const initialService = searchParams.get('service') || 'all';
  const bookProviderId = searchParams.get('book') || '';

  const [filterType, setFilterType] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState(initialService);
  const [bookDeepLinkHandled, setBookDeepLinkHandled] = useState(false);
  
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

  const closeBookingModal = useCallback(() => {
    setSelectedProvider(null);
    setBookingDate('');
    setBookingTime('');
    setBookingPhone('');
    setBookingNotes('');
    setAvailableSlots([]);
    setBookedSlots([]);
    setProviderReviews([]);
  }, []);

  // Lock page scroll while booking modal is open
  useEffect(() => {
    if (selectedProvider) {
      document.body.classList.add('booking-modal-open');
    } else {
      document.body.classList.remove('booking-modal-open');
    }
    return () => document.body.classList.remove('booking-modal-open');
  }, [selectedProvider]);

  // Deep-link: /channeling?book=:providerId opens booking for that provider
  useEffect(() => {
    if (bookDeepLinkHandled || !bookProviderId || !providers.length) return;
    const provider = providers.find((p) => p.id === bookProviderId);
    if (!provider) {
      setBookDeepLinkHandled(true);
      return;
    }
    setBookDeepLinkHandled(true);
    handleBookClick(provider, 'in_person');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookProviderId, providers, bookDeepLinkHandled]);

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
      error(t('ch_login_to_book'));
      navigate(`/login?returnUrl=${encodeURIComponent(`/channeling?book=${provider.id}`)}`);
      return;
    }
    setConsultMode(mode);
    setBookingNotes(mode === 'video' ? t('ch_video_request_note') : '');
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
      error(t('ch_select_slot'));
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
        success(t('ch_book_success'));
        closeBookingModal();
        navigate('/my-appointments');
      } else {
        const errData = await res.json().catch(() => ({}));
        error(errData.error || t('ch_book_error'));
      }
    } catch (err) {
      console.error('Error booking:', err);
      error(t('ch_book_error'));
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="channeling-page animate-fade-in" lang={lang}>
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
                {filterType === 'doctor' && docSpecialties.map(s => <option key={s} value={s}>{localizeSpecialty(s, t)}</option>)}
                {filterType === 'astrologer' && astroSpecialties.map(s => <option key={s} value={s}>{localizeSpecialty(s, t)}</option>)}
                {filterType === 'all' && [...docSpecialties, ...astroSpecialties].map(s => <option key={s} value={s}>{localizeSpecialty(s, t)}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container channeling-content">
        <div className="providers-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>{t('ch_loading_experts')}</div>
          ) : filteredProviders.length > 0 ? (
            filteredProviders.map(provider => {
              const avg = provider.averageRating ?? provider.rating;
              const count = provider.reviewCount;
              return (
              <div key={provider.id} className="provider-card glass-panel">
                <div className="provider-image-wrapper">
                  {provider.profileDetails?.profileImageUrl || provider.profileDetails?.image ? (
                    <img
                      src={provider.profileDetails?.profileImageUrl || provider.profileDetails?.image}
                      alt={provider.name}
                      className="provider-image"
                    />
                  ) : (
                    <div
                      className="provider-image"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(46,125,50,0.2), rgba(201,162,39,0.25))',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'var(--primary-color)',
                      }}
                      aria-hidden
                    >
                      {(provider.name || 'D')[0].toUpperCase()}
                    </div>
                  )}
                  {avg != null && Number(avg) > 0 && count != null && count > 0 ? (
                    <div className="provider-rating">
                      <Star size={14} className="star-icon" fill="currentColor" />{' '}
                      {Number(avg).toFixed(1)}
                      <span style={{ marginLeft: 4, opacity: 0.85 }}>({count})</span>
                    </div>
                  ) : null}
                </div>
                
                <div className="provider-info">
                  <div className="provider-header-info">
                    <h3 className="provider-name">
                      {provider.name}{' '}
                      <span className="doctor-badge verified" style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>
                        {t('badge_deergayu_approved')}
                      </span>
                    </h3>
                    <p className="provider-role">{provider.profileDetails?.doctorType || provider.role}</p>
                  </div>
                  
                  <div className="provider-details">
                    {provider.profileDetails?.doctorType === 'Vedic Astrologer' && provider.profileDetails?.astrologyServices?.length > 0 ? (
                      provider.profileDetails.astrologyServices.map(service => (
                        <span key={service} className="detail-tag" style={{background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37'}}>
                          {localizeSpecialty(service, t)}
                        </span>
                      ))
                    ) : (
                      getProviderSpecialties(provider).map((service) => (
                        <span key={service} className="detail-tag" style={{background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', color: '#4caf50'}}>
                          {localizeSpecialty(service, t)}
                        </span>
                      ))
                    )}
                    {provider.profileDetails?.experience && (
                      <span className="detail-tag">{provider.profileDetails.experience} {t('ch_experience')}</span>
                    )}
                    {(provider.locationSummary ||
                      [provider.profileDetails?.city, provider.profileDetails?.district, provider.profileDetails?.province]
                        .filter(Boolean)
                        .join(', ')) && (
                      <span className="detail-tag flex-center">
                        <MapPin size={14}/>{' '}
                        {t(
                          provider.locationSummary ||
                            [provider.profileDetails?.city, provider.profileDetails?.district, provider.profileDetails?.province]
                              .filter(Boolean)
                              .join(', ')
                        )}
                      </span>
                    )}
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

      {selectedProvider && (() => {
        const modalName = cleanDisplayText(selectedProvider.name) || 'Provider';
        const modalPic = cleanDisplayText(
          selectedProvider.profileDetails?.profileImageUrl || selectedProvider.photoUrl
        );
        const modalSpecs = getProviderSpecialties(selectedProvider);
        const modalMeta =
          (modalSpecs[0] && localizeSpecialty(modalSpecs[0], t)) ||
          getProviderTitle(selectedProvider) ||
          formatDoctorTypeLabel(selectedProvider.profileDetails?.doctorType) ||
          '';
        const consultLabel = consultMode === 'video' ? t('ch_video_consult') : t('ch_inperson_consult');
        const confirmLabel = isBooking
          ? t('ch_booking')
          : !bookingDate
            ? t('ch_select_date_first')
            : !bookingTime
              ? t('ch_select_slot')
              : !bookingPhone
                ? t('ch_enter_contact_number')
                : t('ch_confirm_appointment');

        return (
          <div
            className="booking-modal-overlay"
            role="presentation"
            onClick={closeBookingModal}
          >
            <div
              className="booking-modal"
              role="dialog"
              aria-modal="true"
              aria-label={`${t('ch_book_appointment')} ${modalName}`}
              data-testid="booking-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="booking-modal-header">
                <div className="booking-modal-provider">
                  {modalPic ? (
                    <img src={modalPic} alt="" className="booking-modal-avatar" />
                  ) : (
                    <div className="booking-modal-avatar-fallback" aria-hidden="true">
                      {modalName[0].toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div className="booking-modal-eyebrow">{t('ch_book_appointment')}</div>
                    <div className="booking-modal-name">{modalName}</div>
                    <div className="booking-modal-meta">
                      {consultLabel}
                      {modalMeta ? ` · ${modalMeta}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="booking-modal-close"
                  aria-label={t('ch_close')}
                  onClick={closeBookingModal}
                >
                  <X size={18} />
                </button>
              </header>

              <form className="booking-modal-form" onSubmit={handleBookingSubmit}>
                <div className="booking-modal-body">
                  {(loadingReviews || providerReviews.length > 0) && (
                    <div className="booking-reviews">
                      <div className="booking-reviews-title">
                        {t('ch_patient_reviews')}
                        {(selectedProvider.averageRating ?? selectedProvider.rating) != null &&
                          Number(selectedProvider.averageRating ?? selectedProvider.rating) > 0 &&
                          Number(selectedProvider.reviewCount) > 0 && (
                            <span style={{ marginLeft: 8 }}>
                              ★ {Number(selectedProvider.averageRating ?? selectedProvider.rating).toFixed(1)}
                              {` · ${selectedProvider.reviewCount}`}
                            </span>
                          )}
                      </div>
                      {loadingReviews ? (
                        <p className="booking-loading" style={{ margin: 0, padding: '0.5rem 0', border: 'none', background: 'none' }}>
                          {t('ch_loading_reviews')}
                        </p>
                      ) : (
                        providerReviews.map((r) => (
                          <div key={r.id} className="booking-review-item">
                            <span style={{ color: 'var(--secondary-light, #e0c878)' }}>
                              {'★'.repeat(Math.min(5, Number(r.rating) || 0))}
                            </span>{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{r.userName || 'User'}</strong>
                            {r.comment ? ` — ${r.comment}` : ''}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="booking-step">
                    <div className="booking-step-label">
                      <span className="booking-step-num">1</span>
                      <label htmlFor="booking-date">{t('ch_select_date')}</label>
                    </div>
                    <input
                      id="booking-date"
                      type="date"
                      className="booking-input"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {bookingDate && (
                    <div className="booking-step">
                      <div className="booking-step-label">
                        <span className="booking-step-num">2</span>
                        <label>
                          {t('ch_available_slots')}
                          {bookingTime && (
                            <span className="booking-time-hint">✓ {bookingTime} {t('ch_legend_selected')}</span>
                          )}
                        </label>
                      </div>

                      {loadingSlots ? (
                        <div className="booking-loading">{t('ch_loading_slots')}</div>
                      ) : availableSlots.length === 0 ? (
                        <div className="booking-empty">
                          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{t('ch_no_availability')}</div>
                          <div style={{ fontSize: '0.82rem' }}>{t('ch_try_different_date')}</div>
                        </div>
                      ) : (
                        <>
                          <div className="booking-slot-legend">
                            <span><i className="booking-slot-swatch" /> {t('ch_legend_available')}</span>
                            <span><i className="booking-slot-swatch selected" /> {t('ch_legend_selected')}</span>
                            <span><i className="booking-slot-swatch booked" /> {t('ch_legend_booked')}</span>
                          </div>
                          <div className="booking-slots">
                            {availableSlots.map((slot) => {
                              const isBooked = bookedSlots.includes(slot);
                              const isSelected = bookingTime === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isBooked}
                                  className={`booking-slot${isSelected ? ' selected' : ''}${isBooked ? ' booked' : ''}`}
                                  onClick={() => setBookingTime(slot)}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="booking-step">
                    <div className="booking-step-label">
                      <span className="booking-step-num">3</span>
                      <label htmlFor="booking-phone">
                        {t('ch_contact_number')} <span style={{ color: '#ef5350' }}>*</span>
                      </label>
                    </div>
                    <input
                      id="booking-phone"
                      type="tel"
                      className="booking-input"
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      required
                      placeholder="e.g. 0712345678"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="booking-step">
                    <div className="booking-step-label">
                      <span className="booking-step-num">4</span>
                      <label htmlFor="booking-notes">
                        {t('ch_notes')}{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({t('common_optional')})</span>
                      </label>
                    </div>
                    <textarea
                      id="booking-notes"
                      className="booking-textarea"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      rows={3}
                      placeholder={t('ch_notes_ph')}
                    />
                  </div>
                </div>

                <div className="booking-modal-footer">
                  <button
                    type="submit"
                    className="booking-confirm-btn"
                    disabled={isBooking || !bookingDate || !bookingTime || !bookingPhone}
                    data-testid="booking-confirm"
                  >
                    {confirmLabel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Channeling;
