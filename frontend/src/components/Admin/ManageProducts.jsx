import React, { useState, useCallback } from 'react';
import { Package, RefreshCw, Search, Trash2, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { fmtCurrency, StatusPill } from './AdminUtils';
import { useInfiniteProductsQuery } from '../../hooks/queries/useProducts';

const API_URL = import.meta.env.VITE_API_URL || '';
const ITEMS_PER_PAGE = 20;

export default function ManageProducts() {
  const { success, error } = useToast();
  const [productSearch, setProductSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    refetch,
    status
  } = useInfiniteProductsQuery({ 
    pageSize: ITEMS_PER_PAGE, 
    status: filterProduct === 'All' ? null : filterProduct 
  });

  const products = data ? data.pages.flatMap(page => page.products) : [];

  const getToken = () => auth.currentUser?.getIdToken();

  const handleProductAction = async (id, action) => {
    const newStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'rejected';
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/products/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) { 
        success(`Product ${action}d!`); 
        refetch(); 
      } else { 
        error('Error updating product status');
      }
    } catch (e) { 
      error('Error updating product'); 
    }
  };

  const filteredProducts = products.filter(p => {
    const s = productSearch.toLowerCase();
    const matchSearch = !s || p.name?.toLowerCase().includes(s) || p.vendorName?.toLowerCase().includes(s);
    return matchSearch;
  });

  return (
    <>
      <div className="admin-page-header">
        <div><h1>Product Approvals</h1><p className="page-subtitle">Review vendor products before they go live</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => refetch()} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} className={isFetching && !isFetchingNextPage ? 'spin' : ''} /> Refresh
        </button>
      </div>
      <div className="table-container">
        <div className="table-toolbar">
          <span className="table-title"><Package size={16} /> {filteredProducts.length} products</span>
          <div className="table-controls">
            <div className="search-box">
              <Search size={14} />
              <input placeholder="Search product or vendor…" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
            </div>
            <div className="filter-chips">
              {['All','pending','approved','hidden','rejected'].map(s => (
                <button key={s} className={`filter-chip ${filterProduct === s ? 'active' : ''}`} onClick={() => setFilterProduct(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="loading-state"><div className="spinner spinner-sm" /> Loading products…</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state"><div className="icon">📦</div><h4>No products found</h4></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr>
                <th>Product</th><th>Vendor</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        {(p.imageUrl || (p.images && p.images[0])) ? (
                          <img
                            src={p.imageUrl || p.images[0]}
                            alt={p.name}
                            className="product-thumb"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📦</div>
                        )}
                        <div>
                          <div className="name">{p.name}</div>
                          <div className="desc">{p.description || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.vendorName || p.vendorId?.slice(0, 8) || '—'}</td>
                    <td>{p.category || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(p.price || p.basePrice)}</td>
                    <td>{p.stock ?? '—'}</td>
                    <td><StatusPill status={p.status} /></td>
                    <td>
                       <div className="action-btns">
                         <button
                           className="btn-xs edit-btn"
                           onClick={() => setSelectedProduct(p)}
                           style={{ background: 'var(--primary-color)', color: 'white' }}
                         >
                           View Details
                         </button>
                         {p.status === 'pending' && (
                           <button className="btn-xs approve" onClick={() => handleProductAction(p.id, 'approve')}>Approve</button>
                          )}
                         {p.status === 'approved' && (
                           <button className="btn-xs hide-btn" onClick={() => handleProductAction(p.id, 'hide')}>
                             <EyeOff size={12} style={{ display: 'inline', marginRight: '3px' }} />Hide
                           </button>
                         )}
                         {(p.status === 'hidden' || p.status === 'rejected') && (
                           <button className="btn-xs approve" onClick={() => handleProductAction(p.id, 'approve')}>
                             <Eye size={12} style={{ display: 'inline', marginRight: '3px' }} />Re-Approve
                           </button>
                         )}
                         {p.status === 'pending' && (
                           <button className="btn-xs reject" onClick={() => handleProductAction(p.id, 'reject')}>Reject</button>
                         )}
                         <button className="btn-xs delete-btn" onClick={() => handleProductAction(p.id, 'delete')}>
                           <Trash2 size={12} style={{ display: 'inline', marginRight: '3px' }} />Del
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasNextPage && (
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? 'Loading more...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {selectedProduct && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>📦</div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{selectedProduct.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Category: {selectedProduct.category || 'Ayurveda Item'}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '150px', flexShrink: 0 }}>
                  {(selectedProduct.imageUrl || (selectedProduct.images && selectedProduct.images[0])) ? (
                    <img 
                      src={selectedProduct.imageUrl || selectedProduct.images[0]} 
                      alt={selectedProduct.name} 
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Image</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Price:</strong>
                      <div style={{ marginTop: '0.2rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                        {fmtCurrency(selectedProduct.price || selectedProduct.basePrice)}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Stock:</strong>
                      <div style={{ marginTop: '0.2rem' }}>
                        {selectedProduct.stock ?? 0} items available
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Vendor:</strong>
                      <div style={{ marginTop: '0.2rem' }}>{selectedProduct.vendorName || selectedProduct.vendorId || '—'}</div>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Status:</strong>
                      <div style={{ marginTop: '0.2rem' }}><StatusPill status={selectedProduct.status} /></div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <strong style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Description:</strong>
                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5, marginTop: '0.4rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px' }}>
                      {selectedProduct.description || 'No description provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProduct(null)}>Close</button>
              {selectedProduct.status === 'pending' && (
                <button className="btn btn-primary btn-sm" onClick={() => { handleProductAction(selectedProduct.id, 'approve'); setSelectedProduct(null); }}>Approve</button>
              )}
              {selectedProduct.status === 'pending' && (
                <button className="btn btn-outline btn-sm" onClick={() => { handleProductAction(selectedProduct.id, 'reject'); setSelectedProduct(null); }} style={{ color: 'red', borderColor: 'rgba(255,0,0,0.3)' }}>Reject</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
