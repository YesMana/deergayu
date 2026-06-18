import React, { useState } from 'react';
import { Search, Calendar as CalendarIcon, Star, Video, MapPin, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import './Channeling.css';

const dummyProviders = [
  { id: 1, name: "Dr. Anura Dissanayake", role: "Ayurvedic Physician", specialty: "Sarwanga Roga (General)", rating: 4.9, province: "Western", location: "Colombo", experience: "15 Years", type: "doctor", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80" },
  { id: 2, name: "Vedamahaththaya Somarathna", role: "Traditional Healer", specialty: "Kadum Bindum (Orthopedic)", rating: 4.8, province: "Central", location: "Kandy", experience: "25 Years", type: "doctor", image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80" },
  { id: 3, name: "Astrologer Wickramasinghe", role: "Vedic Astrologer", specialty: "Yantra & Mantra", rating: 5.0, province: "Online", location: "Online", experience: "30 Years", type: "astrologer", image: "https://images.unsplash.com/photo-1544717685-618763071c89?w=500&q=80" },
  { id: 4, name: "Dr. Samanthi Perera", role: "Ayurvedic Physician", specialty: "Sarpa Visha (Toxicology)", rating: 4.7, province: "Southern", location: "Galle", experience: "10 Years", type: "doctor", image: "https://images.unsplash.com/photo-1594824436951-7f12bc4147f5?w=500&q=80" },
  { id: 5, name: "Dr. Wasantha Kumara", role: "Traditional Healer", specialty: "Sarwanga Roga (General)", rating: 4.6, province: "Western", location: "Gampaha", experience: "20 Years", type: "doctor", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80" },
];

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
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');

  const handleProvinceChange = (e) => {
    setProvinceFilter(e.target.value);
    setDistrictFilter('all'); // Reset district when province changes
  };

  const filteredProviders = dummyProviders.filter(p => {
    const matchType = filterType === 'all' || p.type === filterType;
    const matchProvince = provinceFilter === 'all' || p.province === provinceFilter;
    const matchDistrict = districtFilter === 'all' || p.location === districtFilter;
    const matchSpecialty = specialtyFilter === 'all' || p.specialty === specialtyFilter;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.specialty.toLowerCase().includes(searchQuery.toLowerCase());
                        
    return matchType && matchProvince && matchDistrict && matchSpecialty && matchSearch;
  });

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
                  <option key={prov} value={prov}>{prov}</option>
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
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>

              <select 
                value={specialtyFilter} 
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">{t('ch_all_spec')}</option>
                {specialties.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container channeling-content">
        <div className="providers-list">
          {filteredProviders.length > 0 ? (
            filteredProviders.map(provider => (
              <div key={provider.id} className="provider-card glass-panel">
                <div className="provider-image-wrapper">
                  <img src={provider.image} alt={provider.name} className="provider-image" />
                  <div className="provider-rating">
                    <Star size={14} className="star-icon" fill="currentColor" /> {provider.rating}
                  </div>
                </div>
                
                <div className="provider-info">
                  <div className="provider-header-info">
                    <h3 className="provider-name">{provider.name} <CheckCircle2 size={18} className="verified-icon" /></h3>
                    <p className="provider-role">{provider.role}</p>
                  </div>
                  
                  <div className="provider-details">
                    <span className="detail-tag">{provider.specialty}</span>
                    <span className="detail-tag">{provider.experience}</span>
                    <span className="detail-tag flex-center"><MapPin size={14}/> {provider.location}, {provider.province}</span>
                  </div>
                </div>
                
                <div className="provider-actions">
                  <div className="action-buttons">
                    <button className="btn btn-outline btn-full">
                      <Video size={18} /> {t('ch_btn_video')}
                    </button>
                    <button className="btn btn-primary btn-full">
                      <CalendarIcon size={18} /> {t('ch_btn_book')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>{t('ch_no_results')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Channeling;
