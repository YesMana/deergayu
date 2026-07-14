import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'var(--bg-color)'
    }}>
      {/* Animated 404 */}
      <div style={{
        fontSize: 'clamp(5rem, 20vw, 10rem)',
        fontWeight: '900',
        lineHeight: 1,
        background: 'linear-gradient(135deg, rgba(212,175,55,0.9), rgba(212,175,55,0.3))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: '1rem',
        animation: 'fadeInUp 0.6s ease'
      }}>
        404
      </div>

      <div className="glass-panel" style={{
        maxWidth: 480,
        width: '100%',
        padding: '2.5rem',
        borderRadius: 20,
        animation: 'fadeInUp 0.7s ease'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Page Not Found
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={18} /> Go Back
          </button>
          <Link
            to="/"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Home size={18} /> Go Home
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { to: '/shop', label: '🛍️ Shop' },
          { to: '/channeling', label: '📅 Book Appointment' },
          { to: '/ayurvedic-guide', label: '🌿 Ayurvedic Guide' },
        ].map(link => (
          <Link key={link.to} to={link.to} style={{
            color: 'var(--primary-color)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            opacity: 0.8,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => e.target.style.opacity = 1}
          onMouseLeave={e => e.target.style.opacity = 0.8}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NotFound;
