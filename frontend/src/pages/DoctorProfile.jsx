import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';
import { localizeSpecialty } from '../i18n/catalogLabels';
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
import { normalizeQualifications, normalizeLanguages } from '../utils/providerProfileCompletion';
import './PublicPages.css';

function formatLanguages(languages) {
  const list = normalizeLanguages(languages);
  return list.join(', ');
}

function formatQualificationLine(q) {
  if (!q?.qualificationName) return '';
  const bits = [q.qualificationName];
  if (q.institution) bits.push(q.institution);
  if (q.country) bits.push(q.country);
  if (q.year != null && String(q.year).trim() !== '') bits.push(String(q.year));
  return bits.join(' · ');
}

const DoctorProfile = () => {
  const { id } = useParams();
  const { t } = useLanguage();
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
        <div className="container pub-loading">{t('dp_loading')}</div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="pub-page doctor-profile-page">
        <div className="container pub-error">
          {t('dp_not_found')}{' '}
          <Link to="/doctors">{t('dp_crumb_doctors')}</Link>
          {' · '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
            {t('common_retry')}
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
  const name = cleanDisplayText(provider.name) || t('dp_crumb_doctors');
  const initial = name[0].toUpperCase();
  const professionalTitle = getProviderTitle(provider);
  const bio = cleanDisplayText(pd.bio);
  const qualificationList = normalizeQualifications(pd.qualifications);
  const registration = cleanDisplayText(pd.registrationNumber);
  const languages = formatLanguages(pd.languages);
  // Structured professional location only — never free-text address (may be personal)
  const locationLine =
    cleanDisplayText(provider.locationSummary) ||
    [cleanDisplayText(pd.city), cleanDisplayText(pd.district), cleanDisplayText(pd.province), cleanDisplayText(pd.country)]
      .filter(Boolean)
      .join(', ');
  const availText = formatAvailabilitySummary(provider.availabilitySummary, t);
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
            <Link to="/doctors">{t('dp_crumb_doctors')}</Link>
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
                    <span className="doctor-badge verified">{t('badge_deergayu_approved')}</span>
                  )}
                  {specs.slice(0, 2).map((s) => (
                    <span key={s} className="doctor-badge">
                      {localizeSpecialty(s, t)}
                    </span>
                  ))}
                  {types.map((type) => (
                    <span key={type} className="doctor-badge muted">
                      {consultationTypeLabel(type, t)}
                    </span>
                  ))}
                </div>
              </div>
            </header>

            {isDisplayableText(bio) && (
              <section className="profile-block">
                <h2>{t('dp_about')}</h2>
                <p className="profile-block-body pre-wrap">{bio}</p>
              </section>
            )}

            {specs.length > 0 && (
              <section className="profile-block">
                <h2>{t('dp_specialties')}</h2>
                <ul className="profile-chip-list">
                  {specs.map((s) => (
                    <li key={s}>{localizeSpecialty(s, t)}</li>
                  ))}
                </ul>
              </section>
            )}

            {(qualificationList.length > 0 || isDisplayableText(registration)) && (
              <section className="profile-block">
                <h2>{t('dp_qualifications')}</h2>
                {qualificationList.length > 0 && (
                  <ul className="profile-chip-list">
                    {qualificationList.map((q) => (
                      <li key={formatQualificationLine(q)}>{formatQualificationLine(q)}</li>
                    ))}
                  </ul>
                )}
                {isDisplayableText(registration) && (
                  <p className="profile-block-meta">
                    {t('dp_registration')}: {registration}
                  </p>
                )}
              </section>
            )}

            {isDisplayableText(languages) && (
              <section className="profile-block">
                <h2>{t('dp_languages')}</h2>
                <p className="profile-block-body">{languages}</p>
              </section>
            )}

            {isDisplayableText(locationLine) && (
              <section className="profile-block">
                <h2>{t('dp_location')}</h2>
                <p className="profile-block-body">{locationLine}</p>
              </section>
            )}

            {affiliations.length > 0 && (
              <section className="profile-block">
                <h2>{t('dp_facilities')}</h2>
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

            {types.length > 0 && (
              <section className="profile-block">
                <h2>{t('dp_consultation')}</h2>
                <ul className="profile-chip-list">
                  {types.map((type) => (
                    <li key={type}>{consultationTypeLabel(type, t)}</li>
                  ))}
                </ul>
              </section>
            )}

            {availText && (
              <section className="profile-block">
                <h2>{t('dp_availability')}</h2>
                <p className="profile-block-body">{availText}</p>
                {provider.availabilitySummary?.sample?.length ? (
                  <p className="profile-block-meta">
                    {t('dp_sample_times')}: {provider.availabilitySummary.sample.join(', ')}
                  </p>
                ) : null}
                <p className="profile-block-meta">{t('dp_availability_note')}</p>
              </section>
            )}

            <p className="pub-note profile-trust-note">
              {t('dp_trust_note')}{' '}
              <Link to="/privacy">{t('footer_privacy')}</Link>, <Link to="/terms">{t('footer_terms')}</Link>,{' '}
              <Link to="/refund-policy">{t('footer_refund')}</Link>.
            </p>
          </div>

          <aside className="profile-aside">
            <div className="booking-side-card">
              <h2>{t('dp_book')}</h2>

              <div className="booking-side-row">
                <span className="booking-side-label">{t('dp_consultation_price')}</span>
                {price ? (
                  <strong className="booking-side-price">
                    {price.currency} {Number(price.consultationPrice).toLocaleString()}
                  </strong>
                ) : (
                  <p className="booking-side-muted">{t('dp_availability_note')}</p>
                )}
              </div>

              <div className="booking-side-row">
                <span className="booking-side-label">{t('dp_availability')}</span>
                {availText ? (
                  <p className="booking-side-body">{availText}</p>
                ) : (
                  <p className="booking-side-muted">{t('dp_availability_note')}</p>
                )}
              </div>

              <Link
                to={`/channeling?book=${encodeURIComponent(provider.id)}`}
                className="btn btn-primary booking-side-cta"
              >
                {t('dp_book')}
              </Link>
              <Link to="/contact" className="btn btn-outline booking-side-cta">
                {t('dp_contact_support')}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default DoctorProfile;
