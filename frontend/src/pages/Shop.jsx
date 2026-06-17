import React, { useState } from 'react';
import { Search, Filter, ShoppingCart, Heart } from 'lucide-react';
import './Shop.css';

// Dummy data for initial display
const dummyProducts = [
  { id: 1, name: "Ashwagandha Extract", price: 2500, category: "Immunity", rating: 4.8, image: "https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80" },
  { id: 2, name: "Triphala Churna", price: 1200, category: "Digestion", rating: 4.5, image: "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=500&q=80" },
  { id: 3, name: "Brahmi Vati", price: 1800, category: "Brain Health", rating: 4.9, image: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?w=500&q=80" },
  { id: 4, name: "Neem Face Pack", price: 850, category: "Skin Care", rating: 4.6, image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&q=80" },
  { id: 5, name: "Kumkumadi Tailam", price: 3200, category: "Skin Care", rating: 4.7, image: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?w=500&q=80" }, // Reusing image for demo
  { id: 6, name: "Chyawanprash", price: 2100, category: "Immunity", rating: 4.8, image: "https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=500&q=80" }
];

const Shop = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
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
          {dummyProducts.map(product => (
            <div key={product.id} className="product-card glass-panel">
              <div className="product-image-container">
                <img src={product.image} alt={product.name} className="product-image" />
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
