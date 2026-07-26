import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../components/SEO';
import { API_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import { localizeSpecialty } from '../i18n/catalogLabels';
import {
  collectSpecialtiesFromProviders,
  specialtyToSlug,
  slugToSpecialtyLookup,
} from '../utils/doctorUtils';
import './PublicPages.css';

const Specialties = () => {
  const { t } = useLanguage();
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
          {t('spec_not_found')} <Link to="/specialties">{t('spec_all_specialties')}</Link>
        </div>
      </div>
    );
  }

  if (slug && matched) {
    const matchedLabel = localizeSpecialty(matched, t);
    return (
      <div className="pub-page animate-fade-in">
        <SEO
          title={`${matchedLabel} | ${t('spec_page_title')} | Deergayu`}
          description={`${t('spec_approved_listing')}: ${matchedLabel}.`}
          url={`https://deergayu.com/specialties/${slug}`}
          canonical={`https://deergayu.com/specialties/${slug}`}
        />
        <section className="pub-hero">
          <div className="container">
            <h1>{matchedLabel}</h1>
            <p className="pub-lead">{t('spec_approved_listing')}</p>
            <div className="pub-actions">
              <Link
                to={`/doctors?specialty=${encodeURIComponent(matched)}`}
                className="btn btn-primary"
              >
                {t('spec_view_doctors')}
              </Link>
              <Link to="/specialties" className="btn btn-outline">
                {t('spec_all_specialties')}
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
        title={`${t('spec_page_title')} | Deergayu`}
        description={t('spec_page_sub')}
        url="https://deergayu.com/specialties"
        canonical="https://deergayu.com/specialties"
      />
      <section className="pub-hero">
        <div className="container">
          <h1>{t('spec_page_title')}</h1>
          <p className="pub-lead">{t('spec_page_sub')}</p>
        </div>
      </section>
      <section className="pub-section">
        <div className="container">
          {isLoading && <div className="pub-loading">{t('spec_loading')}</div>}
          {isError && (
            <div className="pub-error">
              {t('spec_error')}{' '}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => refetch()}>
                {t('common_retry')}
              </button>
            </div>
          )}
          {!isLoading && !isError && specialties.length === 0 && (
            <div className="pub-empty">
              {t('spec_empty')} <Link to="/doctors">{t('spec_browse_doctors')}</Link>.
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
                <h3>{localizeSpecialty(s, t)}</h3>
                <p>{t('spec_view_doctors')}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Specialties;
