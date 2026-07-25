import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  consultationTypeLabel,
  fetchPublicConsultationPrice,
  getConsultationTypes,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
} from '../utils/doctorUtils';
import './PublicPages.css';

const DoctorProfile = () => {
  const { id } = useParams();
  const [price, setPrice] = useState(null);
  const [slotsPreview, setSlotsPreview] = useState(null);

  const { data: provider, isLoading, isError, refetch } = useQuery({
    queryKey: ['doctor_profile', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/providers`);
      if (!res.ok) throw new Error('Failed to load');
      const list = await res.json();
      const found = (Array.isArray(list) ? list : []).find((p) => p.id === id);
      if (!found) throw new Error('NOT_FOUND');
      return found;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!provider?.id) return;
    fetchPublicConsultationPrice(API_URL, provider.id, 'in_person').then(setPrice);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const date = `${yyyy}-${mm}-${dd}`;
    fetch(`${API_URL}/api/appointments/available/${provider.id}?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const free = (data.allSlots || []).filter((s) => !(data.bookedSlots || []).includes(s));
        setSlotsPreview({ date, freeCount: free.length, sample: free.slice(0, 4) });
      })
      .catch(() => setSlotsPreview(null));
  }, [provider?.id]);

  if (isLoading) {
    return (
      <div className="pub-page">
        <div className="container pub-loading">Loading profile…</div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="pub-page">
        <div className="container pub-error">
          Doctor not found.{' '}
          <Link to="/doctors">Back to Find a Doctor</Link>
          {' · '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pd = provider.profileDetails || {};
  const specs = getProviderSpecialties(provider);
  const types = getConsultationTypes(provider);
  const pic = pd.profileImageUrl;
  const initial = (provider.name || 'D')[0].toUpperCase();
  const title = `${provider.name} | Deergayu`;
  const desc = `${provider.name} — ${getProviderTitle(provider)}${
    specs[0] ? `, ${specs[0]}` : ''
  }. Book on Deergayu.`;

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={title}
        description={desc}
        url={`https://deergayu.com/doctors/${provider.id}`}
        canonical={`https://deergayu.com/doctors/${provider.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name: provider.name,
          medicalSpecialty: specs,
          url: `https://deergayu.com/doctors/${provider.id}`,
        }}
      />
      <section className="pub-hero">
        <div className="container">
          <p className="doctor-meta">
            <Link to="/doctors">Find a Doctor</Link> / {provider.name}
          </p>
        </div>
      </section>
      <section className="pub-section">
        <div className="container profile-layout">
          <div>
            <div className="doctor-card-top" style={{ marginBottom: '1.25rem' }}>
              {pic ? (
                <img src={pic} alt={provider.name} className="doctor-avatar" style={{ width: 96, height: 96 }} />
              ) : (
                <div className="doctor-avatar-fallback" style={{ width: 96, height: 96, fontSize: '2rem' }}>
                  {initial}
                </div>
              )}
              <div>
                <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.75rem' }}>{provider.name}</h1>
                <div className="doctor-meta">{getProviderTitle(provider)}</div>
                <div className="doctor-badges" style={{ marginTop: '0.5rem' }}>
                  {isApprovedProvider(provider) && (
                    <span className="doctor-badge verified">Verified provider</span>
                  )}
                  {types.map((t) => (
                    <span key={t} className="doctor-badge muted">
                      {consultationTypeLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {specs.length > 0 && (
              <div className="pub-card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Specialties</h2>
                <p>{specs.join(' · ')}</p>
              </div>
            )}

            {(pd.qualifications || pd.registrationNumber) && (
              <div className="pub-card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Qualifications</h2>
                {pd.qualifications && <p>{pd.qualifications}</p>}
                {pd.registrationNumber && (
                  <p className="doctor-meta">Registration: {pd.registrationNumber}</p>
                )}
              </div>
            )}

            {pd.languages && (
              <div className="pub-card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Languages</h2>
                <p>
                  {Array.isArray(pd.languages) ? pd.languages.join(', ') : pd.languages}
                </p>
              </div>
            )}

            {pd.bio && (
              <div className="pub-card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>About</h2>
                <p style={{ whiteSpace: 'pre-wrap' }}>{pd.bio}</p>
              </div>
            )}

            {(pd.address || pd.province) && (
              <div className="pub-card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>Location</h2>
                <p>
                  {[pd.address, pd.province].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            <p className="pub-note">
              Secure booking on Deergayu. See{' '}
              <Link to="/privacy">Privacy</Link>, <Link to="/terms">Terms</Link>, and{' '}
              <Link to="/refund-policy">Refund Policy</Link>.
            </p>
          </div>

          <aside className="profile-aside">
            <div className="pub-card">
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Book appointment</h2>
              {price ? (
                <p>
                  Patient consultation fee (published):{' '}
                  <strong>
                    {price.currency} {Number(price.consultationPrice).toLocaleString()}
                  </strong>
                </p>
              ) : (
                <p className="doctor-meta">
                  Consultation fee is confirmed during booking when commercial terms are configured.
                </p>
              )}
              {slotsPreview && (
                <p className="doctor-meta">
                  Today ({slotsPreview.date}): {slotsPreview.freeCount} open slot
                  {slotsPreview.freeCount === 1 ? '' : 's'}
                  {slotsPreview.sample?.length
                    ? ` · e.g. ${slotsPreview.sample.join(', ')}`
                    : ''}
                </p>
              )}
              <Link
                to={`/channeling?book=${encodeURIComponent(provider.id)}`}
                className="btn btn-primary"
                style={{ textAlign: 'center' }}
              >
                Book appointment
              </Link>
              <Link to="/contact" className="btn btn-outline" style={{ textAlign: 'center' }}>
                Contact support
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default DoctorProfile;
