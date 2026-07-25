import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { useProvidersQuery } from '../../hooks/queries/useProviders';
import { API_URL } from '../../config/api';

const TYPES = ['in_person', 'video', 'audio'];

const emptyForm = {
  consultationType: 'in_person',
  consultationPrice: '',
  providerPayout: '',
  platformGross: '',
  facilityFee: '0',
  active: true,
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export default function ManageCommercialTerms() {
  const { success, error } = useToast();
  const { data: providers = [], isLoading: loadingProviders, refetch: refetchProviders } =
    useProvidersQuery();
  const [providerId, setProviderId] = useState('');
  const [terms, setTerms] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const approvedProviders = useMemo(
    () =>
      (providers || [])
        .filter((p) => ['doctor', 'clinic', 'organization', 'vendor'].includes(p.role))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [providers]
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/commercial-defaults`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setDefaults(await res.json());
      } catch {
        /* optional */
      }
    })();
  }, []);

  const loadTerms = async (id) => {
    if (!id) {
      setTerms(null);
      return;
    }
    setLoadingTerms(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/admin/providers/${id}/commercial-terms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load commercial terms');
      const data = await res.json();
      setTerms(data);
    } catch (e) {
      error(e.message || 'Failed to load terms');
      setTerms(null);
    } finally {
      setLoadingTerms(false);
    }
  };

  useEffect(() => {
    loadTerms(providerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const equationOk = useMemo(() => {
    const fee = num(form.consultationPrice);
    const pay = num(form.providerPayout);
    const gross = num(form.platformGross);
    const fac = num(form.facilityFee);
    if ([fee, pay, gross, fac].some((x) => Number.isNaN(x))) return false;
    return Math.abs(fee - (pay + gross + fac)) < 0.001;
  }, [form]);

  const fillSuggested = () => {
    const t = defaults?.suggestedAdminFormTemplate;
    if (!t) {
      error('Suggested template not available from API');
      return;
    }
    setForm((prev) => ({
      ...prev,
      consultationPrice: String(t.consultationPrice ?? ''),
      providerPayout: String(t.providerPayout ?? ''),
      platformGross: String(t.platformGross ?? ''),
      facilityFee: String(t.facilityFee ?? 0),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!providerId) {
      error('Select a provider');
      return;
    }
    if (
      form.consultationPrice === '' ||
      form.providerPayout === '' ||
      form.platformGross === ''
    ) {
      error('consultationPrice, providerPayout, and platformGross are required (no silent defaults)');
      return;
    }
    if (!equationOk) {
      error('Invalid split: consultationFee must equal providerPayout + platformGross + facilityFee');
      return;
    }
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/admin/providers/${providerId}/commercial-terms`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consultationType: form.consultationType,
          consultationPrice: num(form.consultationPrice),
          providerPayout: num(form.providerPayout),
          platformGross: num(form.platformGross),
          facilityFee: num(form.facilityFee) || 0,
          active: !!form.active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      success('Commercial terms saved');
      await loadTerms(providerId);
    } catch (err) {
      error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const loadTypeIntoForm = (type) => {
    const term = terms?.types?.[type];
    if (!term) {
      setForm({ ...emptyForm, consultationType: type });
      return;
    }
    setForm({
      consultationType: type,
      consultationPrice: String(term.consultationPrice ?? ''),
      providerPayout: String(term.providerPayout ?? ''),
      platformGross: String(term.platformGross ?? ''),
      facilityFee: String(term.facilityFee ?? 0),
      active: term.active !== false,
    });
  };

  return (
    <div className="admin-section animate-fade-in">
      <div className="admin-page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', margin: 0 }}>Commercial Terms</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>
            Equation: consultationFee = providerPayout + platformGross + facilityFee. Fields are
            required explicitly — defaults are never saved silently.
          </p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => refetchProviders()}>
          <RefreshCw size={14} /> Refresh providers
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <label htmlFor="ct-provider">Provider</label>
        <select
          id="ct-provider"
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          disabled={loadingProviders}
          style={{ width: '100%', minHeight: 44, marginTop: 6 }}
        >
          <option value="">Select provider…</option>
          {approvedProviders.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.email} ({p.role}) — {p.status || 'n/a'}
            </option>
          ))}
        </select>
      </div>

      {providerId && (
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Configured types</h3>
          {loadingTerms ? (
            <p>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {TYPES.map((t) => {
                const term = terms?.types?.[t];
                return (
                  <button
                    key={t}
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => loadTypeIntoForm(t)}
                  >
                    {t}
                    {term
                      ? ` · LKR ${Number(term.consultationPrice || 0).toLocaleString()}${
                          term.active === false ? ' (off)' : ''
                        }`
                      : ' · none'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <form className="glass-panel" style={{ padding: '1.25rem' }} onSubmit={handleSave}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.85rem',
          }}
        >
          <div>
            <label htmlFor="ct-type">Consultation type</label>
            <select
              id="ct-type"
              value={form.consultationType}
              onChange={(e) => setForm((p) => ({ ...p, consultationType: e.target.value }))}
              style={{ width: '100%', minHeight: 44, marginTop: 4 }}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ct-fee">Patient price (consultationFee)</label>
            <input
              id="ct-fee"
              type="number"
              min="0"
              step="1"
              value={form.consultationPrice}
              onChange={(e) => setForm((p) => ({ ...p, consultationPrice: e.target.value }))}
              required
              style={{ width: '100%', minHeight: 44, marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="ct-payout">Provider payout</label>
            <input
              id="ct-payout"
              type="number"
              min="0"
              step="1"
              value={form.providerPayout}
              onChange={(e) => setForm((p) => ({ ...p, providerPayout: e.target.value }))}
              required
              style={{ width: '100%', minHeight: 44, marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="ct-gross">Deergayu gross</label>
            <input
              id="ct-gross"
              type="number"
              min="0"
              step="1"
              value={form.platformGross}
              onChange={(e) => setForm((p) => ({ ...p, platformGross: e.target.value }))}
              required
              style={{ width: '100%', minHeight: 44, marginTop: 4 }}
            />
          </div>
          <div>
            <label htmlFor="ct-facility">Facility fee</label>
            <input
              id="ct-facility"
              type="number"
              min="0"
              step="1"
              value={form.facilityFee}
              onChange={(e) => setForm((p) => ({ ...p, facilityFee: e.target.value }))}
              style={{ width: '100%', minHeight: 44, marginTop: 4 }}
            />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: '1rem' }}>
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
          />
          Active for this consultation type
        </label>

        <p
          className="admin-hint"
          style={{
            marginTop: '0.85rem',
            color: equationOk ? 'var(--primary-color)' : '#c62828',
            fontWeight: 600,
          }}
        >
          {equationOk
            ? '✓ Equation balanced'
            : '✗ Fill all money fields so fee = payout + gross + facility'}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving || !providerId}>
            {saving ? 'Saving…' : 'Save terms'}
          </button>
          <button type="button" className="btn btn-outline" onClick={fillSuggested}>
            Fill suggested template (review before save)
          </button>
        </div>
        {defaults?.note && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            {defaults.note}
          </p>
        )}
      </form>
    </div>
  );
}
