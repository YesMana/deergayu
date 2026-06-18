import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Heart } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import './Shop.css';

const Shop = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedProducts = async () => {
      try {
        const q = query(collection(db, 'products'), where('status', '==', 'approved'));
        const querySnapshot = await getDocs(q);
        const fetchedProducts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(fetchedProducts);
      } catch (err) {
        console.error("Error fetching approved products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedProducts();
  }, []);
  
  return (
    <div className="shop-page animate-fade-in">
      <div className="shop-header">
        <div className="container">
          <h1 className="shop-title">Ayurvedic Pharmacy</h1>
          <p className="shop-subtitle">Authentic, pure, and trusted herbal remedies for your holistic wellbeing.</p>
          
          <div className="shop-controls">
            <div className="search-bar glass-panel">
              <Search size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search for medicines, herbs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn btn-outline filter-btn">
              <Filter size={20} /> Filter
            </button>
          </div>
        </div>
      </div>

      <div className="container shop-content">
        <div className="product-grid">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>No approved products found yet.</div>
          ) : 
            products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
              <div key={product.id} className="product-card glass-panel">
                <div className="product-image-container">
                  {/* Using a placeholder if no image exists yet */}
                  <img src={product.image || "https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80"} alt={product.name} className="product-image" />
                  <button className="wishlist-btn">
                    <Heart size={20} />
                  </button>
                  <div className="product-category">{product.category}</div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                <div className="product-meta">
                  <span className="product-rating">★ {product.rating}</span>
                </div>
                <div className="product-bottom">
                  <span className="product-price">Rs. {product.price}</span>
                  <button className="btn btn-primary add-to-cart-btn">
                    <ShoppingCart size={18} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Shop;
