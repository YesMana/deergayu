import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  cleanDisplayText,
  consultationTypeLabel,
  fetchPublicConsultationPrice,
  fetchPublicProvider,
  formatAvailabilitySummary,
  getConsultationTypes,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
  isDisplayableText,
  providerPublicPath,
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

  const { data: provider, isLoading, isError, refetch } = useQuery({
    queryKey: ['doctor_profile', id],
    queryFn: () => fetchPublicProvider(API_URL, id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!provider?.id) return;
    fetchPublicConsultationPrice(API_URL, provider.id, 'in_person').then(setPrice);
  }, [provider?.id]);

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

  // Legacy UID URL → redirect to slug when available (keep ID links working via API)
  const canonicalPath = providerPublicPath(provider);
  if (provider.publicSlug && id === provider.id && id !== provider.publicSlug) {
    return <Navigate to={canonicalPath} replace />;
  }

  const pd = provider.profileDetails || {};
  const specs = provider.specialties?.length ? provider.specialties : getProviderSpecialties(provider);
  const types = provider.consultationTypes?.length
    ? provider.consultationTypes
    : getConsultationTypes(provider);
  const pic = cleanDisplayText(pd.profileImageUrl);
  const name = cleanDisplayText(provider.name) || 'Provider';
  const initial = name[0].toUpperCase();
  const professionalTitle = getProviderTitle(provider);
  const bio = cleanDisplayText(pd.bio);
  const qualifications = cleanDisplayText(pd.qualifications);
  const registration = cleanDisplayText(pd.registrationNumber);
  const languages = formatLanguages(pd.languages);
  // Structured professional location only — never free-text address (may be personal)
  const locationLine =
    cleanDisplayText(provider.locationSummary) ||
    [cleanDisplayText(pd.city), cleanDisplayText(pd.district), cleanDisplayText(pd.province), cleanDisplayText(pd.country)]
      .filter(Boolean)
      .join(', ');
  const availText = formatAvailabilitySummary(provider.availabilitySummary);
  const affiliations = Array.isArray(provider.affiliations) ? provider.affiliations : [];
  const pageTitle = `${name} | Deergayu`;
  const desc = `${name} — ${professionalTitle}${specs[0] ? `, ${specs[0]}` : ''}. Book on Deergayu.`;
  const canonicalUrl = `https://deergayu.com${canonicalPath}`;

  return (
    <div className="pub-page doctor-profile-page animate-fade-in">
      <SEO
        title={pageTitle}
        description={desc}
        url={canonicalUrl}
        canonical={canonicalUrl}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': provider.role === 'doctor' ? 'Physician' : 'MedicalBusiness',
          name,
          ...(provider.role === 'doctor' && specs.length ? { medicalSpecialty: specs } : {}),
          url: canonicalUrl,
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

            {affiliations.length > 0 && (
              <section className="profile-block">
                <h2>Clinics & facilities</h2>
                <ul className="profile-chip-list">
                  {affiliations.map((a) => {
                    const f = a.facility;
                    if (!f) return null;
                    const href =
                      f.type === 'hospital'
                        ? `/hospitals/${encodeURIComponent(f.slug)}`
                        : `/clinics/${encodeURIComponent(f.slug)}`;
                    return (
                      <li key={a.id}>
                        <Link to={href}>{f.name}</Link>
                      </li>
                    );
                  })}
                </ul>
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

            {availText && (
              <section className="profile-block">
                <h2>Availability</h2>
                <p className="profile-block-body">{availText}</p>
                {provider.availabilitySummary?.sample?.length ? (
                  <p className="profile-block-meta">
                    Sample times: {provider.availabilitySummary.sample.join(', ')}
                  </p>
                ) : null}
                <p className="profile-block-meta">
                  Choose a date in booking to see the full schedule for that day (Asia/Colombo).
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
                {availText ? (
                  <p className="booking-side-body">{availText}</p>
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
