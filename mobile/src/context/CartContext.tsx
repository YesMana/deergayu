import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import type { Product } from '../lib/api';
import {
  addServerCartItem,
  deleteServerCartItem,
  fetchServerCart,
  updateServerCartQty,
} from '../lib/api';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'deergayu_cart_v1';

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image?: string | null;
  qty: number;
  vendorId?: string;
  vendorName?: string;
  category?: string;
};

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  subtotal: number;
  loading: boolean;
  addToCart: (product: Product, qty?: number) => Promise<void>;
  updateQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function mapServerItems(raw: any[]): CartItem[] {
  return (raw || []).map((i) => ({
    productId: i.productId || i.id,
    name: i.name || 'Product',
    price: Number(i.price) || 0,
    image: i.imageUrl || i.image || null,
    qty: Number(i.quantity || i.qty || 1),
    vendorId: i.vendorId,
    vendorName: i.vendorName,
    category: i.category,
  }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadLocal = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }, []);

  const saveLocal = useCallback(async (next: CartItem[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const refreshCart = useCallback(async () => {
    if (!user) {
      const local = await loadLocal();
      setItems(local);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchServerCart();
      setItems(mapServerItems(data.items || []));
    } catch (e) {
      console.warn('cart refresh', e);
    } finally {
      setLoading(false);
    }
  }, [user, loadLocal]);

  // Load guest cart, then sync to server on login
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        const local = await loadLocal();
        if (!cancelled) {
          setItems(local);
          setReady(true);
        }
        return;
      }
      setLoading(true);
      try {
        const local = await loadLocal();
        // Merge guest cart into server cart once
        for (const item of local) {
          try {
            await addServerCartItem({
              productId: item.productId,
              name: item.name,
              price: item.price,
              basePrice: item.price,
              quantity: item.qty,
              vendorId: item.vendorId || '',
              vendorName: item.vendorName || '',
              imageUrl: item.image || '',
              category: item.category || '',
            });
          } catch {
            /* ignore per-item merge errors */
          }
        }
        if (local.length) await AsyncStorage.removeItem(STORAGE_KEY);
        const data = await fetchServerCart();
        if (!cancelled) setItems(mapServerItems(data.items || []));
      } catch (e) {
        console.warn('cart sync', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loadLocal]);

  useEffect(() => {
    if (!ready || user) return;
    saveLocal(items);
  }, [items, ready, user, saveLocal]);

  const addToCart = useCallback(
    async (product: Product, qty = 1) => {
      const productId = product.id;
      const name = product.name || 'Product';
      const price = Number(product.price) || 0;
      const image = product.imageUrl || product.image || product.images?.[0] || null;

      if (!user) {
        setItems((prev) => {
          const existing = prev.find((i) => i.productId === productId);
          if (existing) {
            return prev.map((i) =>
              i.productId === productId ? { ...i, qty: i.qty + qty } : i
            );
          }
          return [
            ...prev,
            {
              productId,
              name,
              price,
              image,
              qty,
              vendorId: product.vendorId,
              vendorName: product.vendorName,
              category: product.category,
            },
          ];
        });
        return;
      }

      try {
        await addServerCartItem({
          productId,
          name,
          price,
          basePrice: product.basePrice ?? price,
          quantity: qty,
          vendorId: product.vendorId || '',
          vendorName: product.vendorName || '',
          imageUrl: image || '',
          category: product.category || '',
        });
        await refreshCart();
      } catch (e: any) {
        Alert.alert('Cart', e?.message || 'Could not add to cart');
        throw e;
      }
    },
    [user, refreshCart]
  );

  const updateQty = useCallback(
    async (productId: string, qty: number) => {
      if (!user) {
        setItems((prev) => {
          if (qty <= 0) return prev.filter((i) => i.productId !== productId);
          return prev.map((i) => (i.productId === productId ? { ...i, qty } : i));
        });
        return;
      }
      if (qty <= 0) {
        await deleteServerCartItem(productId);
      } else {
        await updateServerCartQty(productId, qty);
      }
      await refreshCart();
    },
    [user, refreshCart]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      if (!user) {
        setItems((prev) => prev.filter((i) => i.productId !== productId));
        return;
      }
      await deleteServerCartItem(productId);
      await refreshCart();
    },
    [user, refreshCart]
  );

  const clearCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    for (const item of items) {
      try {
        await deleteServerCartItem(item.productId);
      } catch {
        /* ignore */
      }
    }
    await refreshCart();
  }, [user, items, refreshCart]);

  const value = useMemo(() => {
    const cartCount = items.reduce((n, i) => n + i.qty, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
    return {
      items,
      cartCount,
      subtotal,
      loading,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      refreshCart,
    };
  }, [items, loading, addToCart, updateQty, removeFromCart, clearCart, refreshCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
