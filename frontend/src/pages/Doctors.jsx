import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  collectSpecialtiesFromProviders,
  consultationTypeLabel,
  fetchPublicConsultationPrice,
  fetchPublicProviders,
  formatAvailabilitySummary,
  getConsultationTypes,
  getProviderSpecialties,
  getProviderTitle,
  isApprovedProvider,
  providerPublicPath,
} from '../utils/doctorUtils';
import './PublicPages.css';

const Doctors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [nameQ, setNameQ] = useState(searchParams.get('q') || '');
  const [specialty, setSpecialty] = useState(searchParams.get('specialty') || 'all');
  const [consultType, setConsultType] = useState(searchParams.get('type') || 'all');
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || 'all');
  const [city, setCity] = useState(searchParams.get('city') || 'all');
  const [facilityId, setFacilityId] = useState(searchParams.get('facility') || 'all');
  const [prices, setPrices] = useState({});

  const queryKey = ['public_doctors', nameQ, specialty, consultType, dateFilter, district, city, facilityId];

  const { data: providers = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      fetchPublicProviders(API_URL, {
        q: nameQ.trim() || undefined,
        specialty: specialty !== 'all' ? specialty : undefined,
        type: consultType !== 'all' ? consultType : undefined,
        date: dateFilter || undefined,
        district: district !== 'all' ? district : undefined,
        city: city !== 'all' ? city : undefined,
        facility: facilityId !== 'all' ? facilityId : undefined,
      }),
    staleTime: 60 * 1000,
  });

  // Specialty / location options from unfiltered directory (structured fields only)
  const { data: allForSpecs = [] } = useQuery({
    queryKey: ['public_doctors_specs'],
    queryFn: () => fetchPublicProviders(API_URL, { includeNext: '0' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeFacilities = [] } = useQuery({
    queryKey: ['public_facilities_active'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/facilities`);
      if (!res.ok) return [];
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const specialties = useMemo(
    () => collectSpecialtiesFromProviders(allForSpecs.length ? allForSpecs : providers),
    [allForSpecs, providers]
  );

  const districtOptions = useMemo(() => {
    const set = new Set();
    for (const p of allForSpecs) {
      const d = String(p?.profileDetails?.district || '').trim();
      if (d) set.add(d);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allForSpecs]);

  const cityOptions = useMemo(() => {
    const set = new Set();
    for (const p of allForSpecs) {
      const c = String(p?.profileDetails?.city || '').trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [allForSpecs]);

  const showDistrictFilter = districtOptions.length > 0;
  const showCityFilter = cityOptions.length > 0;
  const showFacilityFilter = activeFacilities.length > 0;

  useEffect(() => {
    const next = new URLSearchParams();
    if (nameQ.trim()) next.set('q', nameQ.trim());
    if (specialty !== 'all') next.set('specialty', specialty);
    if (consultType !== 'all') next.set('type', consultType);
    if (dateFilter) next.set('date', dateFilter);
    if (showDistrictFilter && district !== 'all') next.set('district', district);
    if (showCityFilter && city !== 'all') next.set('city', city);
    if (showFacilityFilter && facilityId !== 'all') next.set('facility', facilityId);
    setSearchParams(next, { replace: true });
  }, [
    nameQ,
    specialty,
    consultType,
    dateFilter,
    district,
    city,
    facilityId,
    showDistrictFilter,
    showCityFilter,
    showFacilityFilter,
    setSearchParams,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        providers.slice(0, 40).map(async (p) => {
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
  }, [providers]);

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title="Find a Doctor | Deergayu"
        description="Find approved doctors and healthcare providers on Deergayu. Filter by name, specialty, consultation type, and real availability date."
        url="https://deergayu.com/doctors"
        canonical="https://deergayu.com/doctors"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>Find a Doctor</h1>
          <p className="pub-si">ඔබේ වෛද්‍යවරයා සොයා ගන්න</p>
          <p className="pub-lead">
            Browse approved providers on Deergayu. Date filter uses real schedule data only — no fake
            availability.
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
          <div className="doctor-filters doctor-filters-4" role="search" aria-label="Filter doctors">
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
            <label className="sr-only" htmlFor="doc-date">
              Available on date
            </label>
            <input
              id="doc-date"
              type="date"
              value={dateFilter}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Show providers with real open slots on this date (Asia/Colombo)"
            />
            {showDistrictFilter && (
              <select
                id="doc-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                aria-label="District"
              >
                <option value="all">All districts</option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            {showCityFilter && (
              <select
                id="doc-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="City"
              >
                <option value="all">All cities</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {showFacilityFilter && (
              <select
                id="doc-facility"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                aria-label="Facility"
              >
                <option value="all">All facilities</option>
                {activeFacilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {dateFilter && (
            <p className="pub-note" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              Showing providers with open slots on <strong>{dateFilter}</strong> (Asia/Colombo).{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDateFilter('')}>
                Clear date
              </button>
            </p>
          )}

          {isLoading && <div className="pub-loading">Loading doctors…</div>}
          {isError && (
            <div className="pub-error">
              Could not load doctors.{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && providers.length === 0 && (
            <div className="pub-empty">
              {dateFilter
                ? 'No providers have open slots on that date. Try another day or clear the date filter.'
                : 'No doctors match your filters. Try another specialty or '}
              {!dateFilter && <Link to="/contact">contact support</Link>}
              {!dateFilter && '.'}
            </div>
          )}

          <div className="doctor-card-grid">
            {providers.map((p) => {
              const specs = getProviderSpecialties(p);
              const types = p.consultationTypes?.length ? p.consultationTypes : getConsultationTypes(p);
              const pic = p.profileDetails?.profileImageUrl;
              const price = prices[p.id];
              const initial = (p.name || 'D')[0].toUpperCase();
              const avail = formatAvailabilitySummary(p.availabilitySummary);
              const path = providerPublicPath(p);
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
                          <span className="doctor-badge verified">Deergayu Approved</span>
                        )}
                        {types.map((t) => (
                          <span key={t} className="doctor-badge muted">
                            {consultationTypeLabel(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {p.locationSummary && (
                    <div className="doctor-meta">{p.locationSummary}</div>
                  )}
                  {avail && <div className="doctor-meta doctor-avail">{avail}</div>}
                  {price ? (
                    <div className="doctor-meta">
                      Consultation from {price.currency}{' '}
                      {Number(price.consultationPrice).toLocaleString()}
                    </div>
                  ) : (
                    <div className="doctor-meta">Consultation fee: see booking / profile</div>
                  )}
                  <div className="doctor-card-actions">
                    <Link to={path} className="btn btn-outline btn-sm">
                      View profile
                    </Link>
                    <Link
                      to={`/channeling?book=${encodeURIComponent(p.id)}`}
                      className="btn btn-primary btn-sm"
                    >
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
