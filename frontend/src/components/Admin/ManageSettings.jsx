import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Activity, Mail, Tag, Shield, Send, Truck, CreditCard } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const DEFAULT_SETTINGS = {
  commissionPercent: 10,
  bookingCommissionPercent: 10,
  minCommissionRs: 300,
  autoApproveExperts: false,
  autoApproveProducts: false,
  adminEmails: ['yes.manujaya@gmail.com'],
  categories: [
    { id: 'medicine', name: 'Medicine', commissionPercent: 10 },
    { id: 'hair-care', name: 'Hair Care', commissionPercent: 12 },
    { id: 'skin-care', name: 'Skin Care', commissionPercent: 12 },
    { id: 'wellness', name: 'Wellness', commissionPercent: 10 },
    { id: 'general', name: 'General', commissionPercent: 10 },
  ],
  shippingZones: [
    { id: 'colombo', name: 'Colombo Metro', fee: 250 },
    { id: 'western', name: 'Western Province', fee: 350 },
    { id: 'island', name: 'Island-wide', fee: 500 },
  ],
  bankDetails: {
    bank: "People's Bank",
    branch: 'Colombo 03',
    accountName: 'Deergayu (Pvt) Ltd',
    accountNo: '123-4567-8901-00',
  },
  payhereEnabled: false,
};

const ManageSettings = () => {
  const { success, error } = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [broadcast, setBroadcast] = useState({ subject: '', message: '', audience: 'all' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', commissionPercent: 10 });
  const [shippingJson, setShippingJson] = useState(JSON.stringify(DEFAULT_SETTINGS.shippingZones, null, 2));

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = { ...DEFAULT_SETTINGS, ...(await res.json()) };
        setSettings(data);
        setShippingJson(JSON.stringify(data.shippingZones || DEFAULT_SETTINGS.shippingZones, null, 2));
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  useEffect(() => {
    fetch(`${API_URL}/api/email/status`)
      .then((r) => r.json())
      .then(setEmailStatus)
      .catch(() => setEmailStatus(null));
  }, []);

  const handleEmailTest = async () => {
    setTestingEmail(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/email-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.send?.ok) {
        error(data.error || data.send?.error || data.verify?.error || 'SMTP test failed — check cPanel Node env vars');
        console.error('email-test', data);
      } else {
        success(`Test email sent to ${data.to}`);
      }
    } catch (e) {
      error(e.message);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      let zones = settings.shippingZones;
      try {
        const parsed = JSON.parse(shippingJson);
        if (!Array.isArray(parsed)) throw new Error('shippingZones must be an array');
        zones = parsed;
      } catch (e) {
        error(e.message || 'Invalid shippingZones JSON');
        setSavingSettings(false);
        return;
      }
      const payload = { ...settings, shippingZones: zones };
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettings(payload);
        success('Settings saved!');
      } else error('Failed to save');
    } catch (e) { error(e.message); } finally { setSavingSettings(false); }
  };

  const handleBroadcast = async () => {
    if (!broadcast.subject || !broadcast.message) return error('Subject and message required');
    if (!window.confirm(`Send email to ${broadcast.audience} users?`)) return;
    setSendingBroadcast(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(broadcast),
      });
      const data = await res.json();
      if (res.ok) success(`Sent to ${data.sent} users`);
      else error(data.error || 'Broadcast failed');
    } catch (e) { error(e.message); } finally { setSendingBroadcast(false); }
  };

  const addCategory = () => {
    if (!newCategory.name.trim()) return;
    const id = newCategory.name.toLowerCase().replace(/\s+/g, '-');
    setSettings({
      ...settings,
      categories: [...(settings.categories || []), { id, name: newCategory.name.trim(), commissionPercent: Number(newCategory.commissionPercent) || 10 }],
    });
    setNewCategory({ name: '', commissionPercent: 10 });
  };

  const addAdminEmail = () => {
    if (!newAdminEmail.trim()) return;
    const emails = [...(settings.adminEmails || [])];
    if (!emails.includes(newAdminEmail.trim())) emails.push(newAdminEmail.trim());
    setSettings({ ...settings, adminEmails: emails });
    setNewAdminEmail('');
  };

  return (
    <>
      <div className="admin-page-header">
        <div><h1>Platform Settings</h1><p className="page-subtitle">Commission, categories, admins & email broadcast</p></div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? 'Saving…' : '💾 Save All Settings'}
        </button>
      </div>

      {/* Commission */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><DollarSign size={15} /> Revenue & Commission</h3></div>
        <div className="settings-grid">
          <div className="settings-card">
            <h4>Product Sale Commission (%)</h4>
            <p>Default when category has no specific rate</p>
            <input type="number" min="0" max="50" value={settings.commissionPercent}
              onChange={(e) => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
              className="form-control" style={{ maxWidth: 120 }} />
          </div>
          <div className="settings-card">
            <h4>Booking / Appointment Commission (%)</h4>
            <p>Platform fee on doctor consultations</p>
            <input type="number" min="0" max="50" value={settings.bookingCommissionPercent ?? 10}
              onChange={(e) => setSettings({ ...settings, bookingCommissionPercent: Number(e.target.value) })}
              className="form-control" style={{ maxWidth: 120 }} />
          </div>
          <div className="settings-card">
            <h4>Minimum Commission (Rs.)</h4>
            <p>Minimum platform fee per product</p>
            <input type="number" min="0" value={settings.minCommissionRs ?? 300}
              onChange={(e) => setSettings({ ...settings, minCommissionRs: Number(e.target.value) })}
              className="form-control" style={{ maxWidth: 120 }} />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Tag size={15} /> Product Categories & Commission</h3></div>
        <div className="table-container" style={{ marginBottom: '1rem' }}>
          <table className="admin-table">
            <thead><tr><th>Category</th><th>Commission %</th><th></th></tr></thead>
            <tbody>
              {(settings.categories || []).map((cat, idx) => (
                <tr key={cat.id || idx}>
                  <td><input value={cat.name} className="form-control"
                    onChange={(e) => {
                      const cats = [...settings.categories];
                      cats[idx] = { ...cat, name: e.target.value };
                      setSettings({ ...settings, categories: cats });
                    }} /></td>
                  <td><input type="number" min="0" max="50" value={cat.commissionPercent} className="form-control" style={{ maxWidth: 80 }}
                    onChange={(e) => {
                      const cats = [...settings.categories];
                      cats[idx] = { ...cat, commissionPercent: Number(e.target.value) };
                      setSettings({ ...settings, categories: cats });
                    }} /></td>
                  <td><button className="btn-xs" style={{ color: '#ef5350' }}
                    onClick={() => setSettings({ ...settings, categories: settings.categories.filter((_, i) => i !== idx) })}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 1rem 1rem' }}>
          <input placeholder="New category name" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} className="form-control" style={{ maxWidth: 200 }} />
          <input type="number" placeholder="%" value={newCategory.commissionPercent} onChange={(e) => setNewCategory({ ...newCategory, commissionPercent: e.target.value })} className="form-control" style={{ maxWidth: 80 }} />
          <button className="btn btn-outline" onClick={addCategory}>+ Add Category</button>
        </div>
      </div>

      {/* Shipping zones */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Truck size={15} /> Shipping Zones</h3></div>
        <div className="settings-card" style={{ margin: '0 1rem 1rem' }}>
          <p>Shown at checkout. Edit as JSON array of {'{ id, name, fee }'}.</p>
          <textarea
            className="form-control"
            rows={6}
            value={shippingJson}
            onChange={(e) => setShippingJson(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* Bank + PayHere */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><CreditCard size={15} /> Payments</h3></div>
        <div className="settings-grid">
          <div className="settings-card">
            <h4>Bank Details</h4>
            <p>Shown after bank transfer / QR checkout</p>
            {['bank', 'branch', 'accountName', 'accountNo'].map((key) => (
              <div className="form-group" key={key} style={{ marginBottom: '0.65rem' }}>
                <label style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  className="form-control"
                  value={settings.bankDetails?.[key] || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    bankDetails: { ...(settings.bankDetails || {}), [key]: e.target.value },
                  })}
                />
              </div>
            ))}
          </div>
          <div className="settings-card">
            <h4>PayHere Card Payments</h4>
            <p>Enable when PAYHERE_MERCHANT_ID is set on the server</p>
            <div className="toggle-group">
              <div
                className={`toggle-option ${settings.payhereEnabled ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, payhereEnabled: true })}
              >✓ Enabled</div>
              <div
                className={`toggle-option ${!settings.payhereEnabled ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, payhereEnabled: false })}
              >✗ Disabled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admins */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Shield size={15} /> Admin Accounts</h3></div>
        <div className="settings-card" style={{ margin: '0 1rem 1rem' }}>
          <p>These emails get full admin access. You can also set <code>role: admin</code> on a user in All Users.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
            {(settings.adminEmails || []).map((email) => (
              <span key={email} style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50', padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: '0.85rem' }}>
                {email}
                {email !== 'yes.manujaya@gmail.com' && (
                  <button onClick={() => setSettings({ ...settings, adminEmails: settings.adminEmails.filter((e) => e !== email) })}
                    style={{ background: 'none', border: 'none', color: '#ef5350', marginLeft: 6, cursor: 'pointer' }}>×</button>
                )}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="email" placeholder="Add admin email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="form-control" style={{ maxWidth: 280 }} />
            <button className="btn btn-outline" onClick={addAdminEmail}>Add Admin</button>
          </div>
        </div>
      </div>

      {/* SMTP status */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Mail size={15} /> Outbound Email (SMTP)</h3></div>
        <div className="settings-card" style={{ margin: '0 1rem 1rem' }}>
          {emailStatus ? (
            <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
              Mode: <strong>{emailStatus.mode}</strong>
              {' · '}Configured: <strong>{emailStatus.configured ? 'Yes' : 'No — SMTP_PASS missing'}</strong>
              {' · '}From: <strong>{emailStatus.user}</strong>
              {' · '}Host: <strong>{emailStatus.host}:{emailStatus.port}</strong>
              <br />
              <span style={{ fontSize: '0.85rem' }}>{emailStatus.okHint}</span>
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                .env file: <strong>{emailStatus.envFilePresent ? 'found' : 'NOT found'}</strong>
                {' · '}pass length: <strong>{emailStatus.passLength ?? '?'}</strong>
                {emailStatus.appDir ? <> {' · '}app: <code>{emailStatus.appDir}</code></> : null}
                {Array.isArray(emailStatus.envKeysSeen) ? (
                  <>
                    <br />
                    Env keys: <code>{emailStatus.envKeysSeen.length ? emailStatus.envKeysSeen.join(', ') : '(none)'}</code>
                  </>
                ) : null}
              </span>
            </p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Loading email status…</p>
          )}
          <button type="button" className="btn btn-primary" onClick={handleEmailTest} disabled={testingEmail}>
            {testingEmail ? 'Testing…' : 'Send test email to ADMIN_EMAIL'}
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 0 }}>
            {emailStatus?.appDir?.includes('/opt/render')
              ? 'API is still on Render — cPanel SMTP will keep timing out. Point deergayu.com DNS to cPanel Shared IP, use /home/dilspxws/api, then Suspend Render.'
              : emailStatus?.mode === 'resend' || emailStatus?.resendConfigured
                ? 'Using Resend API. Optional: verify deergayu.com in Resend Domains, then set RESEND_FROM=Deergayu &lt;info@deergayu.com&gt;.'
                : 'cPanel API: set SMTP_HOST=localhost, SMTP_PORT=587, SMTP_SECURE=false, SMTP_PASS="password" in /home/dilspxws/api/.env → Restart Node app.'}
          </p>
        </div>
      </div>

      {/* Email Broadcast */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Send size={15} /> Email Broadcast (via info@deergayu.com)</h3></div>
        <div className="settings-card" style={{ margin: '0 1rem 1rem' }}>
          <div className="form-group">
            <label>Send to</label>
            <select value={broadcast.audience} onChange={(e) => setBroadcast({ ...broadcast, audience: e.target.value })} className="form-control" style={{ maxWidth: 240 }}>
              <option value="all">Everyone</option>
              <option value="customers">Customers only</option>
              <option value="experts">All Experts (doctors + vendors)</option>
              <option value="doctors">Doctors / Clinics / Astrologers</option>
              <option value="vendors">Vendors only</option>
            </select>
          </div>
          <div className="form-group">
            <label>Subject</label>
            <input value={broadcast.subject} onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })} className="form-control" placeholder="Email subject" />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} className="form-control" rows={5} placeholder="Your message to users…" />
          </div>
          <button className="btn btn-primary" onClick={handleBroadcast} disabled={sendingBroadcast}>
            {sendingBroadcast ? 'Sending…' : <><Mail size={14} /> Send Broadcast Email</>}
          </button>
        </div>
      </div>

      {/* Auto-approve */}
      <div className="dash-section">
        <div className="dash-section-header"><h3><Activity size={15} /> Auto-Approval Rules</h3></div>
        <div className="settings-grid">
          <div className="settings-card">
            <h4>Auto-Approve Experts</h4>
            <div className="toggle-group">
              <div className={`toggle-option ${settings.autoApproveExperts ? 'active' : ''}`} onClick={() => setSettings({ ...settings, autoApproveExperts: true })}>✓ Yes</div>
              <div className={`toggle-option ${!settings.autoApproveExperts ? 'active' : ''}`} onClick={() => setSettings({ ...settings, autoApproveExperts: false })}>✗ Manual</div>
            </div>
          </div>
          <div className="settings-card">
            <h4>Auto-Approve Products</h4>
            <div className="toggle-group">
              <div className={`toggle-option ${settings.autoApproveProducts ? 'active' : ''}`} onClick={() => setSettings({ ...settings, autoApproveProducts: true })}>✓ Yes</div>
              <div className={`toggle-option ${!settings.autoApproveProducts ? 'active' : ''}`} onClick={() => setSettings({ ...settings, autoApproveProducts: false })}>✗ Manual</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageSettings;
