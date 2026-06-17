import React, { useState } from 'react';
import { Search, Calendar as CalendarIcon, Star, Video, MapPin, CheckCircle2 } from 'lucide-react';
import './Channeling.css';

const dummyProviders = [
  { id: 1, name: "Dr. Anura Dissanayake", role: "Ayurvedic Physician", specialty: "Neurology", rating: 4.9, location: "Colombo", experience: "15 Years", type: "doctor", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80" },
  { id: 2, name: "Vedamahaththaya Somarathna", role: "Traditional Healer", specialty: "Orthopedic", rating: 4.8, location: "Kandy", experience: "25 Years", type: "doctor", image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80" },
  { id: 3, name: "Astrologer Wickramasinghe", role: "Vedic Astrologer", specialty: "Yantra & Mantra", rating: 5.0, location: "Online", experience: "30 Years", type: "astrologer", image: "https://images.unsplash.com/photo-1544717685-618763071c89?w=500&q=80" },
  { id: 4, name: "Dr. Samanthi Perera", role: "Ayurvedic Physician", specialty: "Dermatology", rating: 4.7, location: "Galle", experience: "10 Years", type: "doctor", image: "https://images.unsplash.com/photo-1594824436951-7f12bc4147f5?w=500&q=80" },
];

const Channeling = () => {
  const [filterType, setFilterType] = useState('all');

  const filteredProviders = dummyProviders.filter(p => filterType === 'all' || p.type === filterType);

  return (
    <div className="channeling-page animate-fade-in">
      <div className="channeling-header">
        <div className="container">
          <h1 className="channeling-title">Find Your Healer</h1>
          <p className="channeling-subtitle">Book appointments with Sri Lanka's finest Ayurvedic Doctors and Astrologers.</p>
          
          <div className="filter-tabs">
            <button 
              className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Experts
            </button>
            <button 
              className={`tab-btn ${filterType === 'doctor' ? 'active' : ''}`}
              onClick={() => setFilterType('doctor')}
            >
              Ayurvedic Doctors
            </button>
            <button 
              className={`tab-btn ${filterType === 'astrologer' ? 'active' : ''}`}
              onClick={() => setFilterType('astrologer')}
            >
              Astrologers
            </button>
          </div>
        </div>
      </div>

      <div className="container channeling-content">
        <div className="providers-list">
          {filteredProviders.map(provider => (
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
                  <span className="detail-tag">{provider.experience} Exp</span>
                  <span className="detail-tag flex-center"><MapPin size={14}/> {provider.location}</span>
                </div>
              </div>
              
              <div className="provider-actions">
                <div className="action-buttons">
                  <button className="btn btn-outline btn-full">
                    <Video size={18} /> Video Consult
                  </button>
                  <button className="btn btn-primary btn-full">
                    <CalendarIcon size={18} /> Book Visit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Channeling;
