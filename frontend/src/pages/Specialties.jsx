import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import {
  collectSpecialtiesFromProviders,
  specialtyToSlug,
  slugToSpecialtyLookup,
} from '../utils/doctorUtils';
import './PublicPages.css';

const Specialties = () => {
  const { slug } = useParams();

  const { data: providers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['public_doctors_specialties'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/providers`);
      if (!res.ok) throw new Error('Failed');
      const list = await res.json();
      return Array.isArray(list) ? list : [];
    },
  });

  const specialties = useMemo(() => collectSpecialtiesFromProviders(providers), [providers]);
  const matched = slug ? slugToSpecialtyLookup(slug, specialties) : null;

  if (slug && !isLoading && specialties.length && !matched) {
    return (
      <div className="pub-page">
        <div className="container pub-empty">
          Specialty not found. <Link to="/specialties">View all specialties</Link>
        </div>
      </div>
    );
  }

  if (slug && matched) {
    return (
      <div className="pub-page animate-fade-in">
        <SEO
          title={`${matched} | Specialties | Deergayu`}
          description={`Find Deergayu doctors for ${matched}.`}
          url={`https://deergayu.com/specialties/${slug}`}
          canonical={`https://deergayu.com/specialties/${slug}`}
        />
        <section className="pub-hero">
          <div className="container">
            <h1>{matched}</h1>
            <p className="pub-lead">Approved providers listing this specialty.</p>
            <div className="pub-actions">
              <Link
                to={`/doctors?specialty=${encodeURIComponent(matched)}`}
                className="btn btn-primary"
              >
                View doctors
              </Link>
              <Link to="/specialties" className="btn btn-outline">
                All specialties
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pub-page animate-fade-in">
      <SEO
        title="Specialties | Deergayu"
        description="Browse doctor specialties available on Deergayu."
        url="https://deergayu.com/specialties"
        canonical="https://deergayu.com/specialties"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>Specialties</h1>
          <p className="pub-lead">
            Specialties shown here come from real provider profiles — we do not invent counts or
            categories.
          </p>
        </div>
      </section>
      <section className="pub-section">
        <div className="container">
          {isLoading && <div className="pub-loading">Loading specialties…</div>}
          {isError && (
            <div className="pub-error">
              Could not load specialties.{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && specialties.length === 0 && (
            <div className="pub-empty">
              No specialties listed yet. <Link to="/doctors">Browse doctors</Link> or{' '}
              <Link to="/contact">contact us</Link>.
            </div>
          )}
          <div className="pub-grid-3">
            {specialties.map((s) => (
              <Link
                key={s}
                to={`/specialties/${specialtyToSlug(s)}`}
                className="pub-card"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <h3>{s}</h3>
                <p>View doctors in this specialty</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Specialties;
