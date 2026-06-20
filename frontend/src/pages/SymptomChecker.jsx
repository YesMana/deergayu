import React, { useState } from 'react';
import { Search, Activity, Stethoscope, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import './SymptomChecker.css';

const mockRecommendations = {
  headache: {
    doctors: ["Dr. Anura Dissanayake", "Dr. Samanthi Perera"],
    products: ["Seethodaka Oil", "Herbal Balm", "Coriander Pack"]
  },
  cold: {
    doctors: ["Vedamahaththaya Somarathna", "Dr. Anura Dissanayake"],
    products: ["Paspanguwa", "Samahan", "Ginger Drops"]
  },
  pain: {
    doctors: ["Dr. Samanthi Perera"],
    products: ["Joint Pain Relief Oil", "Mahanarayana Thailaya"]
  }
};

const SymptomChecker = () => {
  const [symptom, setSymptom] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { t, lang } = useLanguage();

  const handleAnalyze = () => {
    if (!symptom.trim()) return;
    
    setIsAnalyzing(true);
    setResults(null);

    setTimeout(() => {
      const lower = symptom.toLowerCase();
      let matched = null;

      if (lower.includes('headache') || lower.includes('හිසරුදාව')) matched = mockRecommendations.headache;
      else if (lower.includes('cold') || lower.includes('කැස්ස')) matched = mockRecommendations.cold;
      else if (lower.includes('pain') || lower.includes('කැක්කුම')) matched = mockRecommendations.pain;
      else matched = { doctors: ["Dr. Anura Dissanayake"], products: ["Ayurvedic Detox Pack"] }; // Default generic

      setResults(matched);
      setIsAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="symptom-container animate-fade-in container">
      <div className="symptom-header glass-panel text-center">
        <Activity size={48} color="var(--primary-color)" style={{margin: '0 auto 1rem'}} />
        <h1 style={{color: 'var(--secondary-color)', marginBottom: '0.5rem'}}>Smart Symptom Checker</h1>
        <p style={{color: 'var(--text-secondary)'}}>Describe your health issue, and our AI will recommend the best Ayurvedic treatments and specialists.</p>
        
        <div className="symptom-search">
          <input 
            type="text" 
            placeholder={lang === 'si' ? "උදා: මට දවස් දෙකක ඉඳන් හිසරුදාව..." : "e.g., I have been having a severe headache for two days..."}
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
          />
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={isAnalyzing || !symptom.trim()}>
            {isAnalyzing ? "Analyzing..." : "Analyze Symptoms"}
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="analyzing-state">
          <div className="spinner"></div>
          <p>Analyzing symptoms using Ayurvedic knowledge base...</p>
        </div>
      )}

      {results && !isAnalyzing && (
        <div className="results-grid animate-fade-in">
          <div className="result-card glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', marginBottom: '1.5rem'}}>
              <ShoppingBag size={24} /> Recommended Medicines
            </h2>
            <ul className="recommendation-list">
              {results.products.map((prod, idx) => (
                <li key={idx}>
                  <span className="bullet"></span> {prod}
                </li>
              ))}
            </ul>
            <Link to="/shop" className="btn btn-outline" style={{width: '100%', marginTop: '1rem', display: 'inline-block', textAlign: 'center'}}>Go to Shop</Link>
          </div>

          <div className="result-card glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', marginBottom: '1.5rem'}}>
              <Stethoscope size={24} /> Recommended Specialists
            </h2>
            <ul className="recommendation-list">
              {results.doctors.map((doc, idx) => (
                <li key={idx}>
                  <span className="bullet"></span> {doc}
                </li>
              ))}
            </ul>
            <Link to="/channeling" className="btn btn-outline" style={{width: '100%', marginTop: '1rem', display: 'inline-block', textAlign: 'center'}}>Book Appointment</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
