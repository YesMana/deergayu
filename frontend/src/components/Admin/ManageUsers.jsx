import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit, startAfter, getCountFromServer, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { fmtDate, userInitials, StatusPill } from './AdminUtils';

const API_URL = import.meta.env.VITE_API_URL || '';
const PAGE_SIZE = 20;

export default function ManageUsers() {
  const { success, error } = useToast();
  const [platformUsers, setPlatformUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pagesCursors, setPagesCursors] = useState([null]);

  // Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalTab, setUserModalTab] = useState('profile');
  const [userAppts, setUserAppts] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingUserAppts, setLoadingUserAppts] = useState(false);
  const [loadingUserOrders, setLoadingUserOrders] = useState(false);

  const getToken = () => auth.currentUser?.getIdToken();

  const fetchUsers = useCallback(async (startCursor) => {
    setLoadingUsers(true);
    try {
      const usersCol = collection(db, 'users');
      const constraints = [];
      
      if (userRoleFilter !== 'all') {
        constraints.push(where('role', '==', userRoleFilter));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }
      
      constraints.push(limit(PAGE_SIZE));
      if (startCursor) constraints.push(startAfter(startCursor));

      const q = query(usersCol, ...constraints);
      const snap = await getDocs(q);
      let userList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (userRoleFilter !== 'all') {
        userList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      if (userSearch.trim()) {
        const term = userSearch.toLowerCase();
        userList = userList.filter(u => u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
      }

      const lastDoc = snap.docs[snap.docs.length - 1];
      setPagesCursors(prev => { const u = [...prev]; u[currentPage] = lastDoc || null; return u; });
      setPlatformUsers(userList);

      if (!startCursor) {
        try {
          const countQ = userRoleFilter !== 'all'
            ? query(usersCol, where('role', '==', userRoleFilter))
            : query(usersCol);
          const countSnap = await getCountFromServer(countQ);
          setTotalUsers(countSnap.data().count);
        } catch { setTotalUsers(0); }
      }
    } catch (e) { 
      console.error(e); 
      error('Failed to fetch users');
    } finally { 
      setLoadingUsers(false); 
    }
  }, [userRoleFilter, userSearch, currentPage, error]);

  useEffect(() => {
    fetchUsers(pagesCursors[currentPage - 1]);
  }, [fetchUsers, currentPage]);

  const handleNextPage = () => {
    if (pagesCursors[currentPage]) setCurrentPage(p => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleApproveUser = async (uid) => {
    if (!window.confirm('Approve this expert?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) { 
        success('Expert approved!'); 
        fetchUsers(pagesCursors[currentPage - 1]); 
      } else {
        error('Failed to approve');
      }
    } catch (e) { 
      error(e.message); 
    }
  };

  const handleUpdateRole = async (uid, newRole) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/users/${uid}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) { 
        success('Role updated!'); 
        fetchUsers(pagesCursors[currentPage - 1]); 
      } else {
        error('Failed to update role');
      }
    } catch (e) { 
      error(e.message); 
    }
  };

  const handleDeleteUser = async (uid, name) => {
    if (!window.confirm(`Delete ${name || 'this user'}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setPlatformUsers(prev => prev.filter(u => u.id !== uid));
      success('User deleted.');
      try {
        const token = await getToken();
        await fetch(`${API_URL}/api/users/${uid}/delete`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    } catch (e) { 
      error(`Error: ${e.message}`); 
    }
  };

  const fetchUserAppointments = async (uid) => {
    setLoadingUserAppts(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('customerId', '==', uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
      setUserAppts(list.slice(0, 50));
    } catch (e) {
      console.error("Error fetching user appointments:", e);
    } finally {
      setLoadingUserAppts(false);
    }
  };

  const fetchUserOrders = async (uid) => {
    setLoadingUserOrders(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerId', '==', uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUserOrders(list.slice(0, 50));
    } catch (e) {
      console.error("Error fetching user orders:", e);
    } finally {
      setLoadingUserOrders(false);
    }
  };

  return (
    <>
      <div className="admin-page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">
            {totalUsers > 0 ? `${totalUsers.toLocaleString()} registered users` : 'All platform users'}
          </p>
        </div>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title"><ShieldAlert size={16} /> Users</span>
          <div className="table-controls">
            <div className="search-box">
              <Search size={14} />
              <input placeholder="Search name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>
            <div className="filter-chips">
              {['all','user','doctor','clinic','organization','vendor'].map(r => (
                <button key={r} className={`filter-chip ${userRoleFilter === r ? 'active' : ''}`} onClick={() => setUserRoleFilter(r)}>
                  {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loadingUsers ? (
          <div className="loading-state"><div className="spinner spinner-sm" /> Loading users…</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead><tr>
                  <th>#</th><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {platformUsers.length === 0 ? (
                    <tr><td colSpan="6"><div className="empty-state"><div className="icon">👤</div><p>No users found</p></div></td></tr>
                  ) : platformUsers.map((u, idx) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">{userInitials(u)}</div>
                          <div>
                            <div className="name">{u.name || '—'}</div>
                            <div className="email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="role-select"
                          value={u.role || 'user'}
                          onChange={e => handleUpdateRole(u.id, e.target.value)}
                          disabled={u.email === 'yes.manujaya@gmail.com'}
                        >
                          {['user','doctor','clinic','organization','vendor'].map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                          {u.email === 'yes.manujaya@gmail.com' && <option value="admin">Admin</option>}
                        </select>
                      </td>
                      <td><StatusPill status={u.status === 'pending' ? 'pending' : 'active'} /></td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{fmtDate(u.createdAt)}</td>
                      <td>
                        <div className="action-btns">
                          {u.status === 'pending' && (
                            <button className="btn-xs approve" onClick={() => handleApproveUser(u.id)}>Approve</button>
                          )}
                          <button
                            className="btn-xs edit-btn"
                            onClick={() => {
                              setSelectedUser(u);
                              setUserModalTab('profile');
                              fetchUserAppointments(u.id);
                              fetchUserOrders(u.id);
                            }}
                            style={{ background: 'var(--primary-color)', color: 'white' }}
                          >
                            View Details
                          </button>
                          <button
                            className="btn-xs delete-btn"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={u.email === 'yes.manujaya@gmail.com'}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="users-pagination">
              <button className="btn btn-ghost btn-sm" onClick={handlePrevPage} disabled={currentPage <= 1 || loadingUsers}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="page-info">
                Page <strong>{currentPage}</strong>
                {totalUsers > 0 && ` of ${Math.ceil(totalUsers / PAGE_SIZE)}`}
                {totalUsers > 0 && <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>({totalUsers.toLocaleString()} total)</span>}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleNextPage} disabled={!pagesCursors[currentPage] || loadingUsers}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem', overflow: 'hidden', borderRadius: '50%' }}>
                  {userInitials(selectedUser)}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedUser.name || 'User'}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    👤 Role: {selectedUser.role} · Member since: {fmtDate(selectedUser.createdAt)}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
              <button
                className={`dashboard-tab ${userModalTab === 'profile' ? 'active' : ''}`}
                onClick={() => setUserModalTab('profile')}
                style={{ background: 'none', border: 'none', color: userModalTab === 'profile' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'profile' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Overview & Info
              </button>
              <button
                className={`dashboard-tab ${userModalTab === 'appointments' ? 'active' : ''}`}
                onClick={() => setUserModalTab('appointments')}
                style={{ background: 'none', border: 'none', color: userModalTab === 'appointments' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'appointments' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Booked Appointments ({userAppts.length})
              </button>
              <button
                className={`dashboard-tab ${userModalTab === 'orders' ? 'active' : ''}`}
                onClick={() => setUserModalTab('orders')}
                style={{ background: 'none', border: 'none', color: userModalTab === 'orders' ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: userModalTab === 'orders' ? '2px solid var(--primary-color)' : 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
              >
                Order History ({userOrders.length})
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
              {userModalTab === 'profile' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        <a href={`mailto:${selectedUser.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>{selectedUser.email}</a>
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Account Status:</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        <StatusPill status={selectedUser.status === 'pending' ? 'pending' : 'active'} />
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>User ID:</strong>
                      <div style={{ marginTop: '0.2rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedUser.id}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Joined Date:</strong>
                      <div style={{ marginTop: '0.2rem' }}>{fmtDate(selectedUser.createdAt)}</div>
                    </div>
                  </div>
                </div>
              )}

              {userModalTab === 'appointments' && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0 0 0.75rem' }}>
                    Appointments booked by this user
                  </h3>
                  {loadingUserAppts ? (
                    <div className="loading-state"><div className="spinner spinner-sm" /> Loading appointments…</div>
                  ) : userAppts.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem 0' }}><p>No appointments found.</p></div>
                  ) : (
                    <table className="admin-table" style={{ fontSize: '0.8rem' }}>
                      <thead><tr><th>Date</th><th>Provider</th><th>Status</th></tr></thead>
                      <tbody>
                        {userAppts.map(apt => (
                          <tr key={apt.id}>
                            <td>{fmtDate(apt.date)}<br/><span style={{color:'var(--text-muted)'}}>{apt.time}</span></td>
                            <td>{apt.providerName}</td>
                            <td><StatusPill status={apt.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {userModalTab === 'orders' && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem', margin: '0 0 0.75rem' }}>
                    Orders placed by this user
                  </h3>
                  {loadingUserOrders ? (
                    <div className="loading-state"><div className="spinner spinner-sm" /> Loading orders…</div>
                  ) : userOrders.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem 0' }}><p>No orders found.</p></div>
                  ) : (
                    <table className="admin-table" style={{ fontSize: '0.8rem' }}>
                      <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {userOrders.map(ord => (
                          <tr key={ord.id}>
                            <td>{fmtDate(ord.createdAt)}</td>
                            <td>LKR {ord.totalAmount?.toLocaleString()}</td>
                            <td><StatusPill status={ord.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
