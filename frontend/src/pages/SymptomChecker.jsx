import React, { useState } from 'react';
import { Activity, Stethoscope, ShoppingBag, Leaf, Sparkles, ArrowRight, MapPin, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import './SymptomChecker.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const SymptomChecker = () => {
  const [symptom, setSymptom] = useState('');
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const { t, lang } = useLanguage();
  const { addToCart } = useCart();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!symptom.trim()) return;
    setIsAnalyzing(true);
    setResults(null);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/symptom-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptom, lang })
      });

      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(lang === 'si'
        ? 'AI Analysis fail වුණා. කරුණාකර නැවත try කරන්න.'
        : 'AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToCart = async (product) => {
    try {
      await addToCart(product);
      success(`${product.name} added to cart!`);
    } catch (err) {
      if (err.message?.includes('log in')) {
        toastError('Please log in to add to cart.');
        navigate('/login');
      } else {
        toastError('Failed to add to cart.');
      }
    }
  };

  const quickSymptoms = ['Headache / හිසරුදාව', 'Joint Pain / සන්ධිවේදනා', 'Cold & Cough / සෙම්ප්‍රතිශ්‍යාව', 'Fever / උණ', 'Digestive Issues / ආමාශ ගැටළු', 'Stress / ආතතිය'];

  return (
    <div className="symptom-page animate-fade-in">
      {/* Header */}
      <div className="symptom-header">
        <div className="container">
          <div className="symptom-header-content">
            <div className="symptom-icon-wrap">
              <Activity size={36} />
            </div>
            <div>
              <h1>AI Symptom Checker</h1>
              <p>Describe your symptoms, get Ayurvedic insights + real doctor & product matches from our platform</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container symptom-main">
        {/* Search Area */}
        <div className="search-card glass-panel">
          <div className="search-card-inner">
            <Sparkles size={20} color="var(--secondary-color)" />
            <h2>Describe Your Symptoms</h2>
          </div>
          <textarea
            className="symptom-textarea"
            placeholder={lang === 'si'
              ? 'උදා: "මට දවස් දෙකක ඉඳන් දරුණු හිසරුදාවක් හා ඇස් දෙකේ වේදනාවක් තියෙනවා..."'
              : 'e.g., "I have had a severe headache and eye pain for two days, especially in the morning..."'}
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            rows={4}
            onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleAnalyze(); }}
          />
          <div className="search-footer">
            <div className="quick-tags">
              <span className="quick-label">Quick select:</span>
              {quickSymptoms.map(s => (
                <button key={s} className="quick-tag" onClick={() => setSymptom(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button
              className="btn btn-primary btn-lg analyze-btn"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !symptom.trim()}
            >
              {isAnalyzing ? (
                <><div className="spinner spinner-sm" /> Analyzing...</>
              ) : (
                <><Activity size={18} /> Analyze with AI</>
              )}
            </button>
          </div>
        </div>

        {/* Analyzing Animation */}
        {isAnalyzing && (
          <div className="analyzing-card glass-panel animate-fade-in">
            <div className="analyzing-dots">
              <span /><span /><span />
            </div>
            <p>🌿 AI is analyzing your symptoms using Ayurvedic knowledge base...</p>
            <p className="analyzing-sub">Matching with real doctors and products on our platform</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-card glass-panel animate-fade-in">
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Results */}
        {results && !isAnalyzing && (
          <div className="results-area animate-fade-in">
            {/* AI Analysis */}
            <div className="analysis-card glass-panel">
              <div className="analysis-header">
                <Sparkles size={18} color="var(--secondary-color)" />
                <h3>Ayurvedic Analysis</h3>
                <span className="ai-badge">Powered by Gemini AI</span>
              </div>
              <p className="analysis-text">{results.analysis}</p>

              {results.remedies?.length > 0 && (
                <div className="remedies-section">
                  <h4><Leaf size={16} /> Recommended Home Remedies</h4>
                  <ul className="remedy-list">
                    {results.remedies.map((remedy, i) => (
                      <li key={i}><span className="remedy-num">{i + 1}</span>{remedy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="results-grid">
              {/* Recommended Doctors */}
              <div className="result-section">
                <div className="result-section-header">
                  <Stethoscope size={20} color="var(--primary-color)" />
                  <h3>Recommended Doctors</h3>
                  <span className="result-count">{results.doctors?.length || 0} matches</span>
                </div>
                {results.doctors?.length > 0 ? (
                  <div className="result-cards">
                    {results.doctors.map(doc => {
                      const pic = doc.profileDetails?.profileImageUrl;
                      const initial = (doc.name || 'D')[0].toUpperCase();
                      return (
                        <div key={doc.id} className="result-doctor-card glass-panel">
                          <div className="result-doc-avatar">
                            {pic ? <img src={pic} alt={doc.name} /> : <span>{initial}</span>}
                          </div>
                          <div className="result-doc-info">
                            <h4>{doc.name}</h4>
                            <p>{doc.profileDetails?.specialty || doc.role}</p>
                            {doc.profileDetails?.address && (
                              <p className="doc-location"><MapPin size={11} /> {doc.profileDetails.address}</p>
                            )}
                          </div>
                          <Link to="/channeling" className="btn btn-primary btn-sm">
                            <Calendar size={14} /> Book
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-match-card glass-panel">
                    <p>No specific doctor matches found on our platform yet for this symptom.</p>
                    <Link to="/channeling" className="btn btn-outline btn-sm">Browse All Doctors</Link>
                  </div>
                )}
              </div>

              {/* Recommended Products */}
              <div className="result-section">
                <div className="result-section-header">
                  <ShoppingBag size={20} color="var(--secondary-color)" />
                  <h3>Recommended Products</h3>
                  <span className="result-count">{results.products?.length || 0} matches</span>
                </div>
                {results.products?.length > 0 ? (
                  <div className="result-cards">
                    {results.products.map(product => (
                      <div key={product.id} className="result-product-card glass-panel">
                        <div className="result-product-img">
                          <img
                            src={product.imageUrl || 'https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=200&q=80'}
                            alt={product.name}
                          />
                        </div>
                        <div className="result-product-info">
                          <h4>{product.name}</h4>
                          <p>{product.category}</p>
                          <span className="result-price">Rs. {Number(product.price).toLocaleString()}</span>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                        >
                          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-match-card glass-panel">
                    <p>No specific product matches found on our platform yet for this symptom.</p>
                    <Link to="/shop" className="btn btn-outline btn-sm">Browse All Products</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer-card glass-panel">
              <p>⚕️ <strong>Medical Disclaimer:</strong> This AI-powered analysis is for informational purposes only and is not a substitute for professional medical advice. Please consult a qualified Ayurvedic practitioner for serious or persistent health issues.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SymptomChecker;
