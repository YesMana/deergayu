import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  cleanDisplayText,
  consultationTypeLabel,
  fetchPublicConsultationPrice,
  getConsultationTypes,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
  isDisplayableText,
  looksLikeTestPlaceholder,
} from '../utils/doctorUtils';
import './PublicPages.css';

function formatLanguages(languages) {
  if (Array.isArray(languages)) {
    return languages.map(cleanDisplayText).filter(Boolean).join(', ');
  }
  return cleanDisplayText(languages);
}

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

  const suspiciousFields = useMemo(() => {
    if (!provider) return [];
    const pd = provider.profileDetails || {};
    const hits = [];
    getProviderSpecialties(provider).forEach((s) => {
      if (looksLikeTestPlaceholder(s)) hits.push({ field: 'specialty', value: s });
    });
    if (looksLikeTestPlaceholder(pd.address)) hits.push({ field: 'address', value: pd.address });
    if (looksLikeTestPlaceholder(pd.bio)) hits.push({ field: 'bio', value: pd.bio });
    return hits;
  }, [provider]);

  if (isLoading) {
    return (
      <div className="pub-page doctor-profile-page">
        <div className="container pub-loading">Loading profile…</div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="pub-page doctor-profile-page">
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
  const pic = cleanDisplayText(pd.profileImageUrl);
  const name = cleanDisplayText(provider.name) || 'Provider';
  const initial = name[0].toUpperCase();
  const professionalTitle = getProviderTitle(provider);
  const bio = cleanDisplayText(pd.bio);
  const qualifications = cleanDisplayText(pd.qualifications);
  const registration = cleanDisplayText(pd.registrationNumber);
  const languages = formatLanguages(pd.languages);
  const locationLine = [cleanDisplayText(pd.address), cleanDisplayText(pd.province)]
    .filter(Boolean)
    .join(', ');
  const pageTitle = `${name} | Deergayu`;
  const desc = `${name} — ${professionalTitle}${specs[0] ? `, ${specs[0]}` : ''}. Book on Deergayu.`;

  if (suspiciousFields.length && typeof console !== 'undefined') {
    // Dev/ops breadcrumb only — not shown to patients
    console.info('[Deergayu] Suspicious/test-looking provider fields (admin cleanup):', {
      providerId: provider.id,
      name,
      fields: suspiciousFields,
    });
  }

  return (
    <div className="pub-page doctor-profile-page animate-fade-in">
      <SEO
        title={pageTitle}
        description={desc}
        url={`https://deergayu.com/doctors/${provider.id}`}
        canonical={`https://deergayu.com/doctors/${provider.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Physician',
          name,
          ...(specs.length ? { medicalSpecialty: specs } : {}),
          url: `https://deergayu.com/doctors/${provider.id}`,
        }}
      />

      <section className="profile-crumb">
        <div className="container">
          <p className="profile-crumb-text">
            <Link to="/doctors">Find a Doctor</Link>
            <span aria-hidden="true"> / </span>
            <span>{name}</span>
          </p>
        </div>
      </section>

      <section className="pub-section profile-section">
        <div className="container profile-layout">
          <div className="profile-main">
            <header className="profile-header-card">
              {pic ? (
                <img src={pic} alt={name} className="profile-photo" />
              ) : (
                <div className="profile-photo-fallback" aria-hidden="true">
                  {initial}
                </div>
              )}
              <div className="profile-header-text">
                <h1>{name}</h1>
                <p className="profile-title">{professionalTitle}</p>
                <div className="doctor-badges">
                  {isApprovedProvider(provider) && (
                    <span className="doctor-badge verified">Deergayu Approved</span>
                  )}
                  {specs.slice(0, 2).map((s) => (
                    <span key={s} className="doctor-badge">
                      {s}
                    </span>
                  ))}
                  {types.map((t) => (
                    <span key={t} className="doctor-badge muted">
                      {consultationTypeLabel(t)}
                    </span>
                  ))}
                </div>
              </div>
            </header>

            {isDisplayableText(bio) && (
              <section className="profile-block">
                <h2>About</h2>
                <p className="profile-block-body pre-wrap">{bio}</p>
              </section>
            )}

            {specs.length > 0 && (
              <section className="profile-block">
                <h2>Specialties</h2>
                <ul className="profile-chip-list">
                  {specs.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {(isDisplayableText(qualifications) || isDisplayableText(registration)) && (
              <section className="profile-block">
                <h2>Qualifications</h2>
                {isDisplayableText(qualifications) && (
                  <p className="profile-block-body pre-wrap">{qualifications}</p>
                )}
                {isDisplayableText(registration) && (
                  <p className="profile-block-meta">Registration: {registration}</p>
                )}
              </section>
            )}

            {isDisplayableText(languages) && (
              <section className="profile-block">
                <h2>Languages</h2>
                <p className="profile-block-body">{languages}</p>
              </section>
            )}

            {isDisplayableText(locationLine) && (
              <section className="profile-block">
                <h2>Location</h2>
                <p className="profile-block-body">{locationLine}</p>
              </section>
            )}

            <section className="profile-block">
              <h2>Consultation</h2>
              <ul className="profile-chip-list">
                {types.map((t) => (
                  <li key={t}>{consultationTypeLabel(t)}</li>
                ))}
              </ul>
            </section>

            {slotsPreview && (
              <section className="profile-block">
                <h2>Availability</h2>
                <p className="profile-block-body">
                  Today ({slotsPreview.date}): {slotsPreview.freeCount} open slot
                  {slotsPreview.freeCount === 1 ? '' : 's'}
                  {slotsPreview.sample?.length ? ` · e.g. ${slotsPreview.sample.join(', ')}` : ''}
                </p>
                <p className="profile-block-meta">
                  Choose a date in booking to see full schedule for that day.
                </p>
              </section>
            )}

            <p className="pub-note profile-trust-note">
              Secure booking on Deergayu. See{' '}
              <Link to="/privacy">Privacy</Link>, <Link to="/terms">Terms</Link>, and{' '}
              <Link to="/refund-policy">Refund Policy</Link>.
            </p>
          </div>

          <aside className="profile-aside">
            <div className="booking-side-card">
              <h2>Book appointment</h2>

              <div className="booking-side-row">
                <span className="booking-side-label">Consultation price</span>
                {price ? (
                  <strong className="booking-side-price">
                    {price.currency} {Number(price.consultationPrice).toLocaleString()}
                  </strong>
                ) : (
                  <p className="booking-side-muted">
                    Consultation fee will be confirmed during booking.
                  </p>
                )}
              </div>

              <div className="booking-side-row">
                <span className="booking-side-label">Availability</span>
                {slotsPreview ? (
                  <p className="booking-side-body">
                    {slotsPreview.freeCount} open slot{slotsPreview.freeCount === 1 ? '' : 's'} today
                    {slotsPreview.sample?.length ? ` (${slotsPreview.sample.join(', ')})` : ''}
                  </p>
                ) : (
                  <p className="booking-side-muted">Open booking to check available times.</p>
                )}
              </div>

              <Link
                to={`/channeling?book=${encodeURIComponent(provider.id)}`}
                className="btn btn-primary booking-side-cta"
              >
                Book Appointment
              </Link>
              <Link to="/contact" className="btn btn-outline booking-side-cta">
                Contact Support
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default DoctorProfile;
