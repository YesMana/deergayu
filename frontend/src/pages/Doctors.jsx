import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  collectSpecialtiesFromProviders,
  consultationTypeLabel,
  fetchPublicConsultationPrice,
  getConsultationTypes,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
} from '../utils/doctorUtils';
import './PublicPages.css';

const Doctors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nameQ, setNameQ] = useState(searchParams.get('q') || '');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || 'all');
  const [consultType, setConsultType] = useState(searchParams.get('type') || 'all');
  const [prices, setPrices] = useState({});

  const { data: providers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public_doctors'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/providers`);
      if (!res.ok) throw new Error('Failed to load doctors');
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const specialties = useMemo(() => collectSpecialtiesFromProviders(providers), [providers]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (nameQ.trim()) next.set('q', nameQ.trim());
    if (specialty !== 'all') next.set('specialty', specialty);
    if (consultType !== 'all') next.set('type', consultType);
    setSearchParams(next, { replace: true });
  }, [nameQ, specialty, consultType, setSearchParams]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const specs = getProviderSpecialties(p);
      const types = getConsultationTypes(p);
      const matchName =
        !nameQ.trim() ||
        String(p.name || '').toLowerCase().includes(nameQ.trim().toLowerCase()) ||
        specs.some((s) => s.toLowerCase().includes(nameQ.trim().toLowerCase()));
      const matchSpec =
        specialty === 'all' ||
        specs.some((s) => s.toLowerCase() === specialty.toLowerCase() || s.includes(specialty));
      const matchType = consultType === 'all' || types.includes(consultType);
      return matchName && matchSpec && matchType;
    });
  }, [providers, nameQ, specialty, consultType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        filtered.slice(0, 40).map(async (p) => {
          const price = await fetchPublicConsultationPrice(API_URL, p.id, 'in_person');
          return [p.id, price];
        })
      );
      if (cancelled) return;
      const map = {};
      entries.forEach(([id, price]) => {
        if (price) map[id] = price;
      });
      setPrices(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered]);

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title="Find a Doctor | Deergayu"
        description="Find approved doctors and healthcare providers on Deergayu. Filter by name, specialty, and consultation type."
        url="https://deergayu.com/doctors"
        canonical="https://deergayu.com/doctors"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>Find a Doctor</h1>
          <p className="pub-si">ඔබේ වෛද්‍යවරයා සොයා ගන්න</p>
          <p className="pub-lead">
            Browse approved providers on Deergayu. Book an appointment when you are ready — no fake
            availability or inflated counts.
          </p>
          <div className="pub-actions">
            <Link to="/channeling" className="btn btn-outline">
              Book / Channel a Doctor
            </Link>
            <Link to="/specialties" className="btn btn-outline">
              Browse specialties
            </Link>
          </div>
        </div>
      </section>

      <section className="pub-section">
        <div className="container">
          <div className="doctor-filters" role="search" aria-label="Filter doctors">
            <label className="sr-only" htmlFor="doc-name">
              Doctor name
            </label>
            <input
              id="doc-name"
              type="search"
              placeholder="Search by name or specialty"
              value={nameQ}
              onChange={(e) => setNameQ(e.target.value)}
            />
            <label className="sr-only" htmlFor="doc-specialty">
              Specialty
            </label>
            <select
              id="doc-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            >
              <option value="all">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="doc-type">
              Consultation type
            </label>
            <select
              id="doc-type"
              value={consultType}
              onChange={(e) => setConsultType(e.target.value)}
            >
              <option value="all">All consultation types</option>
              <option value="in_person">In person</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </div>

          {isLoading && <div className="pub-loading">Loading doctors…</div>}
          {isError && (
            <div className="pub-error">
              Could not load doctors.{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="pub-empty">
              No doctors match your filters. Try another specialty or{' '}
              <Link to="/contact">contact support</Link>.
            </div>
          )}

          <div className="doctor-card-grid">
            {filtered.map((p) => {
              const specs = getProviderSpecialties(p);
              const types = getConsultationTypes(p);
              const pic = p.profileDetails?.profileImageUrl;
              const price = prices[p.id];
              const initial = (p.name || 'D')[0].toUpperCase();
              return (
                <article key={p.id} className="doctor-card">
                  <div className="doctor-card-top">
                    {pic ? (
                      <img src={pic} alt={p.name || 'Doctor'} className="doctor-avatar" />
                    ) : (
                      <div className="doctor-avatar-fallback" aria-hidden>
                        {initial}
                      </div>
                    )}
                    <div>
                      <h3>{p.name || 'Provider'}</h3>
                      <div className="doctor-meta">{getProviderTitle(p)}</div>
                      <div className="doctor-meta">
                        {specs.length ? specs.slice(0, 2).join(' · ') : 'Specialty not listed'}
                      </div>
                      <div className="doctor-badges">
                        {isApprovedProvider(p) && (
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
                  {p.profileDetails?.languages && (
                    <div className="doctor-meta">
                      Languages: {Array.isArray(p.profileDetails.languages)
                        ? p.profileDetails.languages.join(', ')
                        : p.profileDetails.languages}
                    </div>
                  )}
                  {price ? (
                    <div className="doctor-meta">
                      Consultation from {price.currency} {Number(price.consultationPrice).toLocaleString()}
                    </div>
                  ) : (
                    <div className="doctor-meta">Consultation fee: see booking / profile</div>
                  )}
                  <div className="doctor-card-actions">
                    <Link to={`/doctors/${p.id}`} className="btn btn-outline btn-sm">
                      View profile
                    </Link>
                    <Link to={`/channeling?book=${encodeURIComponent(p.id)}`} className="btn btn-primary btn-sm">
                      Book
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Doctors;
