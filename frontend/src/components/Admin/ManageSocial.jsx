import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Save, ExternalLink } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { API_URL } from '../../config/api';


const EMPTY = {
  facebook: '',
  tiktok: '',
  instagram: '',
  youtube: '',
  whatsapp: '',
};

const FIELDS = [
  {
    key: 'facebook',
    label: 'Facebook Page',
    hint: 'Your Facebook page URL',
    placeholder: 'https://facebook.com/deergayu',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    hint: 'Profile or channel URL',
    placeholder: 'https://tiktok.com/@deergayu',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    hint: 'Profile URL',
    placeholder: 'https://instagram.com/deergayu',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    hint: 'Channel URL',
    placeholder: 'https://youtube.com/@deergayu',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    hint: 'Phone number (071…) or wa.me link',
    placeholder: '0719909299',
  },
];

export default function ManageSocial() {
  const { success, error } = useToast();
  const [links, setLinks] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getToken = () => auth.currentUser?.getIdToken();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setLinks({ ...EMPTY, ...(data.socialLinks || {}) });
    } catch (e) {
      error(e.message || 'Could not load social links');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ socialLinks: links }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.socialLinks) setLinks({ ...EMPTY, ...data.socialLinks });
      success('Social links saved — check Home page & Footer');
    } catch (e) {
      error(e.message || 'Save failed. Is the API redeployed?');
    } finally {
      setSaving(false);
    }
  };

  const filled = FIELDS.filter((f) => (links[f.key] || '').trim()).length;

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>Social Media Links</h1>
          <p className="page-subtitle">
            These show on the Home page (above the footer) and in the site Footer — {filled} of{' '}
            {FIELDS.length} set
          </p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving || loading}>
          <Save size={16} style={{ marginRight: 6 }} />
          {saving ? 'Saving…' : 'Save Social Links'}
        </button>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3>
            <Share2 size={15} /> Your channels
          </h3>
        </div>

        {loading ? (
          <div className="loading-state" style={{ padding: '2rem' }}>
            <div className="spinner spinner-sm" /> Loading…
          </div>
        ) : (
          <div className="settings-card" style={{ margin: '0 1rem 1.25rem' }}>
            <div
              style={{
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                borderRadius: 12,
                background: 'rgba(124,179,66,0.1)',
                border: '1px solid rgba(124,179,66,0.25)',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: 'var(--secondary-color)' }}>Where visitors see this:</strong>
              <br />
              1) Home page — bottom section “Follow Deergayu” (just above the footer)
              <br />
              2) Every page footer — icon row under the Deergayu logo
              <br />
              Empty fields stay hidden. After save, hard-refresh the Home page.
            </div>

            <div className="settings-grid">
              {FIELDS.map(({ key, label, hint, placeholder }) => (
                <div className="form-group" key={key} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{label}</span>
                    {links[key] ? (
                      <a
                        href={
                          key === 'whatsapp' && !/^https?:/i.test(links[key])
                            ? `https://wa.me/${String(links[key]).replace(/\D/g, '').replace(/^0/, '94')}`
                            : links[key]
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--primary-color)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Open <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </label>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {hint}
                  </p>
                  <input
                    className="form-control"
                    type="text"
                    placeholder={placeholder}
                    value={links[key] || ''}
                    onChange={(e) => setLinks({ ...links, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
