import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import { getProviderTitle, providerPublicPath } from '../utils/doctorUtils';
import { useLanguage } from '../context/LanguageContext';
import { localizeFacilityType } from '../i18n/catalogLabels';
import './PublicPages.css';

async function fetchFacilities(group) {
  const qs = group ? `?group=${encodeURIComponent(group)}` : '';
  const res = await fetch(`${API_URL}/api/facilities${qs}`);
  if (!res.ok) throw new Error('Failed to load');
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

async function fetchFacility(slugOrId) {
  const res = await fetch(`${API_URL}/api/facilities/${encodeURIComponent(slugOrId)}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'NOT_FOUND' : 'Failed');
  return res.json();
}

/** Shared directory for /clinics and /hospitals — empty state, never fake listings. */
export function FacilityDirectory({ group, titleKey, leadKey, basePath }) {
  const { t } = useLanguage();
  const { data: facilities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['facilities', group],
    queryFn: () => fetchFacilities(group),
    staleTime: 60 * 1000,
  });
  const title = t(titleKey);
  const lead = t(leadKey);

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title={`${title} | Deergayu`}
        description={lead}
        url={`https://deergayu.com${basePath}`}
        canonical={`https://deergayu.com${basePath}`}
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{title}</h1>
          <p className="pub-lead">{lead}</p>
          <div className="pub-actions">
            <Link to="/doctors" className="btn btn-primary">
              {t('fac_find_doctor')}
            </Link>
            <Link to="/join-as-clinic" className="btn btn-outline">
              {t('fac_join_clinic')}
            </Link>
          </div>
        </div>
      </section>
      <section className="pub-section">
        <div className="container">
          {isLoading && <div className="pub-loading">{t('fac_loading')}</div>}
          {isError && (
            <div className="pub-error">
              {t('fac_error')}{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                {t('common_retry')}
              </button>
            </div>
          )}
          {!isLoading && !isError && facilities.length === 0 && (
            <div className="pub-empty">
              <p>{t('fac_empty')}</p>
              <p>
                <Link to="/doctors">{t('fac_find_doctor')}</Link>
              </p>
            </div>
          )}
          <div className="doctor-card-grid">
            {facilities.map((f) => (
              <article key={f.id} className="doctor-card">
                <h3>{f.name}</h3>
                <div className="doctor-meta">{localizeFacilityType(f.type, t)}</div>
                {(f.city || f.district || f.address) && (
                  <div className="doctor-meta">
                    {[f.address, f.city, f.district].filter(Boolean).join(', ')}
                  </div>
                )}
                {f.publicDescription && (
                  <p className="doctor-meta">{f.publicDescription.slice(0, 160)}</p>
                )}
                <div className="doctor-card-actions">
                  <Link
                    to={`${basePath}/${encodeURIComponent(f.slug)}`}
                    className="btn btn-outline btn-sm"
                  >
                    {t('fac_view_doctors')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function FacilityProfile({ basePath, kindLabelKey }) {
  const { t } = useLanguage();
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['facility', slug],
    queryFn: () => fetchFacility(slug),
    enabled: Boolean(slug),
  });

  const providers = useMemo(() => data?.providers || [], [data]);

  if (isLoading) {
    return (
      <div className="pub-page">
        <div className="container pub-loading">Loading…</div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="pub-page">
        <div className="container pub-error">
          {t('fac_not_found')} <Link to={basePath}>{t('common_back')}</Link>
        </div>
      </div>
    );
  }

  const canonical = `https://deergayu.com${basePath}/${data.slug}`;
  const kindLabel = t(kindLabelKey);

  return (
    <div className="pub-page doctor-profile-page animate-fade-in">
      <SEO
        title={`${data.name} | Deergayu`}
        description={data.publicDescription || `${data.name} on Deergayu`}
        url={canonical}
        canonical={canonical}
      />
      <section className="profile-crumb">
        <div className="container">
          <p className="profile-crumb-text">
            <Link to={basePath}>{kindLabel}</Link>
            <span aria-hidden="true"> / </span>
            <span>{data.name}</span>
          </p>
        </div>
      </section>
      <section className="pub-section profile-section">
        <div className="container">
          <header className="profile-header-card" style={{ marginBottom: '1rem' }}>
            <div className="profile-header-text">
              <h1>{data.name}</h1>
              <p className="profile-title">{localizeFacilityType(data.type, t)}</p>
              {(data.address || data.city) && (
                <p className="doctor-meta">
                  {[data.address, data.city, data.district, data.province].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </header>
          {data.publicDescription && (
            <section className="profile-block">
              <h2>About</h2>
              <p className="profile-block-body pre-wrap">{data.publicDescription}</p>
            </section>
          )}
          <section className="profile-block">
            <h2>Providers</h2>
            {providers.length === 0 ? (
              <p className="profile-block-meta">No affiliated providers listed yet.</p>
            ) : (
              <ul className="profile-chip-list">
                {providers.map((p) => (
                  <li key={p.id}>
                    <Link to={providerPublicPath(p)}>
                      {p.name} — {getProviderTitle(p)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export const Clinics = () => (
  <FacilityDirectory
    group="clinics"
    titleKey="fac_clinics_title"
    leadKey="fac_clinics_sub"
    basePath="/clinics"
  />
);

export const Hospitals = () => (
  <FacilityDirectory
    group="hospitals"
    titleKey="fac_hospitals_title"
    leadKey="fac_hospitals_sub"
    basePath="/hospitals"
  />
);

export const ClinicProfile = () => <FacilityProfile basePath="/clinics" kindLabelKey="fac_clinics_title" />;
export const HospitalProfile = () => (
  <FacilityProfile basePath="/hospitals" kindLabelKey="fac_hospitals_title" />
);

export default Clinics;
