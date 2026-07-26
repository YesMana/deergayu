import React, { useState, useEffect } from 'react';
import { X, DollarSign, Star, Package, ShoppingBag, Calendar, Mail } from 'lucide-react';
import { auth } from '../../firebase';
import { fmtCurrency, fmtDate, StatusPill, userInitials } from './AdminUtils';
import { API_URL } from '../../config/api';
import {
  computeProfileCompletion,
  normalizeQualifications,
  normalizeLanguages,
  parseSpecialtyList,
  looksLikeSuspiciousSpecialty,
} from '../../utils/providerProfileCompletion';

function FieldRow({ label, children }) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <strong style={{ minWidth: 160 }}>{label}</strong>
      <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{children}</span>
    </div>
  );
}

export default function AdminUserProfileModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_URL}/api/admin/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (!userId) return null;
  const u = data?.user;
  const pd = u?.profileDetails || {};
  const completion =
    data?.profileCompletion ||
    (u && ['doctor', 'clinic', 'organization', 'vendor'].includes(u.role)
      ? computeProfileCompletion(u)
      : null);
  const suspiciousSpecs = parseSpecialtyList(pd.specialty).filter(looksLikeSuspiciousSpecialty);
  const suspiciousAddress = looksLikeSuspiciousSpecialty(pd.address) ? [String(pd.address).trim()] : [];
  const quals = normalizeQualifications(pd.qualifications);
  const langs = normalizeLanguages(pd.languages);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Provider review — Admin</h2>
          <button onClick={onClose} className="btn btn-outline" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>Loading full profile…</div>
        ) : !u ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef5350' }}>Failed to load profile</div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                flexWrap: 'wrap',
              }}
            >
              <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>
                {pd.profileImageUrl ? <img src={pd.profileImageUrl} alt="" /> : userInitials(u)}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{u.name}</h3>
                <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)' }}>{u.email}</p>
                <StatusPill status={u.status || 'approved'} />{' '}
                <span style={{ marginLeft: 8, textTransform: 'capitalize' }}>{u.role}</span>
                {u.publicSlug && (
                  <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    /{u.publicSlug}
                  </span>
                )}
              </div>
            </div>

            {completion && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  border: '1px solid rgba(212,175,55,0.3)',
                  borderRadius: 8,
                }}
              >
                <strong>Profile completion: {completion.percent}%</strong>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {data?.approvalNote ||
                    'Deergayu Approved is directory review only — not medical/legal credential verification.'}
                </p>
                {completion.missingRequired?.length > 0 && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                    Missing required: {completion.missingRequired.map((m) => m.action).join('; ')}
                  </p>
                )}
              </div>
            )}

            {(suspiciousSpecs.length > 0 || suspiciousAddress.length > 0) && (
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(239,83,80,0.12)',
                  borderRadius: 8,
                  color: '#ef9a9a',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Suspicious / legacy fields (do not auto-delete):</strong>
                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                  {suspiciousSpecs.map((s) => (
                    <li key={`s-${s}`}>specialty: &quot;{s}&quot;</li>
                  ))}
                  {suspiciousAddress.map((s) => (
                    <li key={`a-${s}`}>legacy address: &quot;{s}&quot;</li>
                  ))}
                </ul>
              </div>
            )}

            {data.stats && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div className="kpi-card">
                  <DollarSign size={16} />
                  <div>
                    <small>Total Sales</small>
                    <strong>{fmtCurrency(data.stats.totalSales)}</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <DollarSign size={16} />
                  <div>
                    <small>Vendor Earnings</small>
                    <strong>{fmtCurrency(data.stats.vendorEarnings)}</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <DollarSign size={16} />
                  <div>
                    <small>Platform Fees</small>
                    <strong>{fmtCurrency(data.stats.platformFees)}</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <Package size={16} />
                  <div>
                    <small>Products</small>
                    <strong>{data.stats.productCount}</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <ShoppingBag size={16} />
                  <div>
                    <small>Orders</small>
                    <strong>{data.stats.orderCount}</strong>
                  </div>
                </div>
                <div className="kpi-card">
                  <Calendar size={16} />
                  <div>
                    <small>Appointments</small>
                    <strong>{data.stats.appointmentCount}</strong>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['overview', 'products', 'orders', 'appointments', 'reviews'].map((t) => (
                <button
                  key={t}
                  className={`btn ${tab === t ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', textTransform: 'capitalize' }}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <FieldRow label="Identity">{u.name}</FieldRow>
                <FieldRow label="Title">{pd.title || pd.doctorType || '—'}</FieldRow>
                <FieldRow label="Specialties">
                  {parseSpecialtyList(pd.specialty).join(', ') || '—'}
                </FieldRow>
                <FieldRow label="Registration">{pd.registrationNumber || '—'}</FieldRow>
                <FieldRow label="Languages">{langs.join(', ') || '—'}</FieldRow>
                <FieldRow label="Consultation">
                  {[
                    pd.offersInPerson === true && 'In-person',
                    (pd.offersVideo === true || pd.videoConsultation === true) && 'Video',
                    pd.offersAudio === true && 'Audio',
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Not explicitly set (legacy default in-person)'}
                </FieldRow>
                <FieldRow label="Location">
                  {[pd.city, pd.district, pd.province, pd.country].filter(Boolean).join(', ') || '—'}
                </FieldRow>
                <FieldRow label="Private address">{pd.address || '—'}</FieldRow>
                <FieldRow label="Phone">{pd.telephone || '—'}</FieldRow>
                <FieldRow label="Bio">{pd.bio || '—'}</FieldRow>
                <FieldRow label="Qualifications">
                  {quals.length
                    ? quals
                        .map((q) =>
                          [q.qualificationName, q.institution, q.country, q.year].filter(Boolean).join(' · ')
                        )
                        .join('; ')
                    : '—'}
                </FieldRow>
                <FieldRow label="Schedule">
                  {pd.schedule?.workingDays
                    ? Object.entries(pd.schedule.workingDays)
                        .filter(([, d]) => d && d.active !== false)
                        .map(([day, d]) => `${day} ${d.start || '?'}-${d.end || '?'}`)
                        .join('; ') || 'No active days'
                    : '—'}
                </FieldRow>
                <FieldRow label="Slot duration">{pd.schedule?.slotDuration ? `${pd.schedule.slotDuration} min` : null}</FieldRow>
                <a href={`mailto:${u.email}`} className="btn btn-outline" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                  <Mail size={14} /> Email User
                </a>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Approve / reject / request correction via Manage Experts status controls. Do not silently rewrite provider data.
                </p>
              </div>
            )}

            {tab === 'products' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Base</th>
                    <th>Site Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.products || []).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>{fmtCurrency(p.basePrice)}</td>
                      <td>{fmtCurrency(p.price)}</td>
                      <td>
                        <StatusPill status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'orders' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Vendor Gets</th>
                    <th>Platform Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.vendorOrders || []).map((o) => (
                    <tr key={o.id}>
                      <td>{o.id?.slice(-8).toUpperCase()}</td>
                      <td>{o.customerName}</td>
                      <td>{fmtCurrency(o.totalPrice)}</td>
                      <td>{fmtCurrency(o.vendorEarnings)}</td>
                      <td>{fmtCurrency(o.platformFee)}</td>
                      <td>
                        <StatusPill status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'appointments' && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.appointmentsAsProvider || []).map((a) => (
                    <tr key={a.id}>
                      <td>{a.customerName}</td>
                      <td>{a.date}</td>
                      <td>{a.time}</td>
                      <td>
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(data.reviews || []).length === 0 ? (
                  <p>No reviews yet</p>
                ) : (
                  data.reviews.map((r) => (
                    <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Star size={14} fill="currentColor" /> {r.rating}/5 — <strong>{r.userName}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{fmtDate(r.createdAt)}</span>
                      </div>
                      <p style={{ margin: '0.5rem 0 0' }}>{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
