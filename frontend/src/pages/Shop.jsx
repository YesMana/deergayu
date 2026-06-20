import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Heart } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import './Shop.css';

const Shop = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const { addToCart } = useCart();
  const { success, error } = useToast();
  const navigate = useNavigate();

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

  const handleAddToCart = async (product) => {
    try {
      const isAdded = await addToCart(product);
      if (isAdded) {
        success(`${product.name} added to cart!`);
      }
    } catch (err) {
      if (err.message.includes("log in")) {
        error("Please log in to add items to your cart.");
        navigate('/login?returnUrl=/shop');
      } else {
        error("Failed to add item to cart.");
      }
    }
  };

  const categories = ['All', ...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });
  
  return (
    <div className="shop-page animate-fade-in" style={{ position: 'relative' }}>

      <div className="shop-header">
        <div className="container">
          <h1 className="shop-title">Ayurvedic Pharmacy</h1>
          <p className="shop-subtitle">Authentic, pure, and trusted herbal remedies for your holistic wellbeing.</p>
          
          <div className="shop-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div className="search-bar glass-panel" style={{ flex: '1', minWidth: '250px' }}>
              <Search size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search for medicines, herbs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filter-dropdown glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', borderRadius: '30px' }}>
              <Filter size={20} style={{ color: 'var(--primary-color)', marginRight: '0.5rem' }} />
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ border: 'none', background: 'transparent', padding: '0.8rem', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="container shop-content">
        <div className="product-grid">
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>No products match your search.</div>
          ) : 
            filteredProducts.map(product => (
              <div key={product.id} className="product-card glass-panel">
                <div className="product-image-container">
                  {/* Using a placeholder if no image exists yet */}
                  <img src={product.imageUrl || product.image || "https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80"} alt={product.name} className="product-image" />
                  <button className="wishlist-btn">
                    <Heart size={20} />
                  </button>
                  <div className="product-category">{product.category}</div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <div className="product-meta">
                    <span className="product-rating">★ {product.rating || '4.5'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>By {product.vendorName || 'Deergayu'}</span>
                  </div>
                  <div className="product-bottom">
                    <span className="product-price">Rs. {product.price}</span>
                    <button className="btn btn-primary add-to-cart-btn" onClick={() => handleAddToCart(product)}>
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
