import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Activity } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const API_URL = import.meta.env.VITE_API_URL || '';

const ManageSettings = () => {
  const { success, error } = useToast();
  const [settings, setSettings] = useState({ commissionPercent: 10, autoApproveExperts: false, autoApproveProducts: false });
  const [savingSettings, setSavingSettings] = useState(false);

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) success('Settings saved!');
      else error('Failed to save');
    } catch (e) { error(e.message); } finally { setSavingSettings(false); }
  };

  return (
    <>
      <div className="admin-page-header">
        <div><h1>Platform Settings</h1><p className="page-subtitle">Configure global platform behavior</p></div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3><DollarSign size={15} /> Revenue & Commission</h3>
        </div>
        <div className="settings-grid">
          <div className="settings-card">
            <h4>Platform Commission Rate</h4>
            <p>Percentage taken from each vendor sale</p>
            <div className="form-group">
              <input
                type="number"
                min="0"
                max="50"
                value={settings.commissionPercent}
                onChange={e => setSettings({ ...settings, commissionPercent: Number(e.target.value) })}
                className="form-control"
                style={{ maxWidth: '120px' }}
              />
            </div>
            <div className="commission-preview">
              <span>On a Rs. 1,000 sale:</span>
              <span className="highlight">Rs. {Math.round(1000 * settings.commissionPercent / 100)} commission</span>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3><Activity size={15} /> Auto-Approval Rules</h3>
        </div>
        <div className="settings-grid">
          <div className="settings-card">
            <h4>Auto-Approve Verified Clinics</h4>
            <p>Instantly approve new clinic/doctor registrations without manual review</p>
            <div className="toggle-group">
              <div
                className={`toggle-option ${settings.autoApproveExperts ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, autoApproveExperts: true })}
              >
                ✓ Yes, Auto-Approve
              </div>
              <div
                className={`toggle-option ${!settings.autoApproveExperts ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, autoApproveExperts: false })}
              >
                ✗ Manual Review
              </div>
            </div>
          </div>
          <div className="settings-card">
            <h4>Auto-Approve Products</h4>
            <p>Instantly approve new vendor products without manual review</p>
            <div className="toggle-group">
              <div
                className={`toggle-option ${settings.autoApproveProducts ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, autoApproveProducts: true })}
              >
                ✓ Yes, Auto-Approve
              </div>
              <div
                className={`toggle-option ${!settings.autoApproveProducts ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, autoApproveProducts: false })}
              >
                ✗ Manual Review
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {savingSettings ? <><div className="spinner spinner-sm" /> Saving…</> : '💾 Save Settings'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ManageSettings;
