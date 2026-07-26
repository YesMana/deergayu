import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import { getProviderTitle, providerPublicPath } from '../utils/doctorUtils';
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
export function FacilityDirectory({ group, title, siTitle, lead, basePath }) {
  const { data: facilities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['facilities', group],
    queryFn: () => fetchFacilities(group),
    staleTime: 60 * 1000,
  });

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
          {siTitle && <p className="pub-si">{siTitle}</p>}
          <p className="pub-lead">{lead}</p>
          <div className="pub-actions">
            <Link to="/doctors" className="btn btn-primary">
              Find a Doctor
            </Link>
            <Link to="/join-as-clinic" className="btn btn-outline">
              Join as a clinic
            </Link>
          </div>
        </div>
      </section>
      <section className="pub-section">
        <div className="container">
          {isLoading && <div className="pub-loading">Loading…</div>}
          {isError && (
            <div className="pub-error">
              Could not load directory.{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && facilities.length === 0 && (
            <div className="pub-empty">
              <p>
                No {title.toLowerCase()} are listed yet. Deergayu does not show placeholder facilities.
              </p>
              <p>
                Clinics and hospitals are added by our team when verified. Meanwhile,{' '}
                <Link to="/doctors">browse doctors</Link> or{' '}
                <Link to="/contact">contact support</Link>.
              </p>
            </div>
          )}
          <div className="doctor-card-grid">
            {facilities.map((f) => (
              <article key={f.id} className="doctor-card">
                <h3>{f.name}</h3>
                <div className="doctor-meta">{f.type?.replace(/_/g, ' ')}</div>
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
                    View
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

export function FacilityProfile({ basePath, kindLabel }) {
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
          {kindLabel} not found. <Link to={basePath}>Back</Link>
        </div>
      </div>
    );
  }

  const canonical = `https://deergayu.com${basePath}/${data.slug}`;

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
              <p className="profile-title">{String(data.type || '').replace(/_/g, ' ')}</p>
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
    title="Clinics"
    siTitle="සායන"
    lead="Verified clinics and Ayurveda centres on Deergayu. Empty until real facilities are published."
    basePath="/clinics"
  />
);

export const Hospitals = () => (
  <FacilityDirectory
    group="hospitals"
    title="Hospitals"
    siTitle="රෝහල්"
    lead="Verified hospitals on Deergayu. Empty until real facilities are published."
    basePath="/hospitals"
  />
);

export const ClinicProfile = () => <FacilityProfile basePath="/clinics" kindLabel="Clinics" />;
export const HospitalProfile = () => (
  <FacilityProfile basePath="/hospitals" kindLabel="Hospitals" />
);

export default Clinics;
