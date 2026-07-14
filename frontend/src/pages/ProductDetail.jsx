import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { ShoppingCart, Star, Heart, ArrowLeft, UserCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { success, error } = useToast();
  const { t, lang } = useLanguage();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [selectedImage, setSelectedImage] = useState(0); // index into images array
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const fetchProductAndReviews = async () => {
      try {
        const productRef = doc(db, 'products', id);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...productSnap.data() });
        } else {
          error("Product not found");
          navigate('/shop');
          return;
        }

        // Fetch reviews
        const reviewsRef = collection(db, 'products', id, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'));
        const reviewSnap = await getDocs(q);
        const fetchedReviews = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReviews(fetchedReviews);
      } catch (err) {
        console.error("Error fetching product:", err);
        error("Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndReviews();
  }, [id, navigate, error]);

  const handleAddToCart = async () => {
    try {
      if (product.stock === 0) return;
      const isAdded = await addToCart(product);
      if (isAdded) {
        success(`${product.name} added to cart!`);
      }
    } catch (err) {
      if (err.message.includes("log in")) {
        error("Please log in to add items to your cart.");
        navigate('/login?returnUrl=/product/' + id);
      } else {
        error("Failed to add to cart");
      }
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      error("Please login to leave a review.");
      return;
    }
    if (!reviewText.trim()) {
      error("Please write a review comment.");
      return;
    }
    
    setSubmittingReview(true);
    try {
      const token = await user.getIdToken();
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetType: 'product', targetId: id, rating: Number(rating), comment: reviewText }),
      });
      if (!res.ok) throw new Error('Review failed');
      const data = await res.json();
      setReviews([{ id: data.id, userName: data.userName, rating: data.rating, comment: data.comment, createdAt: data.createdAt }, ...reviews]);
      if (data.aggregates) setProduct((p) => ({ ...p, rating: data.aggregates.rating, reviewCount: data.aggregates.reviewCount }));
      setReviewText('');
      setRating(5);
      success("Review submitted successfully!");
    } catch (err) {
      console.error("Error adding review:", err);
      error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <div style={{ paddingTop: '100px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div className="spinner"></div></div>;
  }

  if (!product) return null;

  return (
    <div className="product-detail-page" style={{ paddingTop: '100px', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      <div className="container">
        
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none' }}>
          <ArrowLeft size={20} /> Back to Shop
        </button>

        <div className="product-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
          
          {/* Left: Image Gallery */}
          <div className="product-image-container glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', background: 'var(--surface-color)' }}>
            {/* Main image */}
            {(() => {
              const allImages = [
                product.imageUrl || product.image,
                ...(product.images || []).filter(img => img !== product.imageUrl && img !== product.image)
              ].filter(Boolean);
              const dedupedImages = [...new Set(allImages)];
              const mainImg = dedupedImages[selectedImage] || dedupedImages[0] || 'https://images.unsplash.com/photo-1611078516086-6ab28122db63?w=800&q=80';
              
              return (
                <>
                  <img 
                    src={mainImg}
                    alt={product.name} 
                    style={{ width: '100%', maxWidth: '400px', height: '320px', objectFit: 'cover', borderRadius: '0.5rem', display: 'block', margin: '0 auto' }} 
                  />
                  {/* Thumbnails if multiple images */}
                  {dedupedImages.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {dedupedImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          style={{
                            width: '60px', height: '60px',
                            borderRadius: '6px', overflow: 'hidden',
                            border: selectedImage === i ? '2px solid var(--primary-color)' : '2px solid transparent',
                            padding: 0, cursor: 'pointer',
                            opacity: selectedImage === i ? 1 : 0.65,
                            transition: 'all 0.2s',
                            flexShrink: 0
                          }}
                        >
                          <img src={img} alt={`View ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Right: Info */}
          <div className="product-info-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--secondary-color)' }}>{product.name}</h1>
              <button className="btn btn-icon" onClick={() => success('Added to wishlist!')} style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', border: 'none', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                <Heart size={24} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>By {product.vendorName || 'Deergayu Store'}</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#f1c40f' }}>
                {[1,2,3,4,5].map(star => (
                  <Star key={star} size={18} fill={star <= (product.rating || 4.5) ? "currentColor" : "none"} />
                ))}
                <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.9rem' }}>({reviews.length} reviews)</span>
              </div>
              <span className="type-badge" style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>{product.category}</span>
              {product.stock === 0 && <span className="type-badge" style={{ background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>Out of Stock</span>}
            </div>

            <h2 style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '2rem' }}>Rs. {product.price}</h2>

            <div className="product-description" style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Description</h3>
              <p>{product.description || 'No detailed description provided for this Ayurvedic product. It is sourced from verified vendors to ensure high quality and authenticity.'}</p>
            </div>

            <button 
              className="btn btn-primary btn-full" 
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              style={{ padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: product.stock === 0 ? 0.5 : 1, width: '100%', cursor: product.stock === 0 ? 'not-allowed' : 'pointer' }}
            >
              <ShoppingCart size={20} /> {product.stock === 0 ? 'Currently Unavailable' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-section glass-panel" style={{ padding: '2rem', borderRadius: '1rem', marginBottom: '4rem' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Star className="star-icon" fill="currentColor" /> Customer Reviews
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            {/* Review Form */}
            {user ? (
              <form onSubmit={handleReviewSubmit} className="review-form" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Write a Review</h3>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Rating (1-5)</label>
                  <select value={rating} onChange={(e) => setRating(e.target.value)} className="form-control" style={{ width: '100px', background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    {[5,4,3,2,1].map(num => <option key={num} value={num}>{num} Stars</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Your Review</label>
                  <textarea 
                    required 
                    rows="3" 
                    value={reviewText} 
                    onChange={(e) => setReviewText(e.target.value)} 
                    placeholder="Share your experience with this product..." 
                    className="form-control" 
                    style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', width: '100%' }}
                  />
                </div>
                <button type="submit" disabled={submittingReview} className="btn btn-primary" style={{ cursor: 'pointer' }}>
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div style={{ padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '0.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Please <button onClick={() => navigate('/login?returnUrl=/product/'+id)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>log in</button> to write a review.
              </div>
            )}

            {/* Review List */}
            <div className="review-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="review-card" style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                        <UserCircle size={20} style={{ color: 'var(--primary-color)' }} /> {review.userName}
                      </div>
                      <div style={{ color: '#f1c40f', display: 'flex' }}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>{review.comment}</p>
                    <small style={{ color: 'var(--text-secondary)', opacity: 0.5, marginTop: '0.5rem', display: 'block' }}>
                      {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                    </small>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
