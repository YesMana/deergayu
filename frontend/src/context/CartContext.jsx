import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const API_URL = import.meta.env.VITE_API_URL || '';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data = await res.json();
      const items = data.items || [];
      setCartItems(items);
      setCartCount(items.reduce((sum, item) => sum + (item.quantity || 1), 0));
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch cart when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchCart();
      } else {
        setCartItems([]);
        setCartCount(0);
      }
    });
    return () => unsubscribe();
  }, [fetchCart]);

  const addToCart = async (product) => {
    try {
      if (!auth.currentUser) throw new Error('Please log in to add items to cart');
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product.id || product.productId,
          name: product.name,
          price: product.price,
          quantity: product.quantity || 1,
          vendorId: product.vendorId || '',
          vendorName: product.vendorName || '',
          imageUrl: product.imageUrl || product.image || '',
          category: product.category || ''
        })
      });
      if (!res.ok) throw new Error('Failed to add to cart');
      await fetchCart();
      return true;
    } catch (err) {
      console.error('Error adding to cart:', err);
      throw err;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/cart/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove from cart');
      await fetchCart();
    } catch (err) {
      console.error('Error removing from cart:', err);
      throw err;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      if (!auth.currentUser) return;
      if (quantity < 1) {
        return removeFromCart(productId);
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/cart/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      if (!res.ok) throw new Error('Failed to update quantity');
      await fetchCart();
    } catch (err) {
      console.error('Error updating quantity:', err);
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      if (!auth.currentUser) return;
      const token = await auth.currentUser.getIdToken();
      // Remove all items one by one
      await Promise.all(cartItems.map(item =>
        fetch(`${API_URL}/api/cart/${item.productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      ));
      setCartItems([]);
      setCartCount(0);
    } catch (err) {
      console.error('Error clearing cart:', err);
      throw err;
    }
  };

  const checkout = async (paymentMethod, deliveryAddress, phone, notes) => {
    try {
      if (!auth.currentUser) throw new Error('Please log in to checkout');
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ paymentMethod, deliveryAddress, phone, notes })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Checkout failed');
      }
      const data = await res.json();
      setCartItems([]);
      setCartCount(0);
      return data;
    } catch (err) {
      console.error('Error during checkout:', err);
      throw err;
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      loading,
      fetchCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout
    }}>
      {children}
    </CartContext.Provider>
  );
};
