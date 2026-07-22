import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { API_URL } from '../../config/api';

async function fetchPublicProducts(status = null) {
  const res = await fetch(`${API_URL}/api/products?limit=100`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch products (${res.status})`);
  }
  let products = await res.json();
  if (!Array.isArray(products)) products = [];
  if (status) products = products.filter((p) => p.status === status);
  products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return products;
}

async function fetchAdminProducts(status = null) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_URL}/api/admin/products${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch products (${res.status})`);
  }
  return res.json();
}

async function fetchProductsWithFallback(status = null) {
  try {
    const col = collection(db, 'products');
    const q = status ? query(col, where('status', '==', status)) : query(col);
    const snap = await getDocs(q);
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return products;
  } catch (err) {
    console.warn('Products Firestore failed, using API:', err?.code || err?.message || err);
    try {
      return await fetchPublicProducts(status);
    } catch (publicErr) {
      // Admin-only list (all statuses) when signed in
      return fetchAdminProducts(status);
    }
  }
}

/**
 * Fetch all products (optionally filtered by status)
 */
export const useProductsQuery = (status = null) => {
  return useQuery({
    queryKey: ['products', { status }],
    queryFn: () => fetchProductsWithFallback(status),
    retry: 1,
  });
};

/**
 * Fetch products with cursor-based pagination.
 * Falls back to public /api/products when Firestore client reads are denied.
 */
export const useInfiniteProductsQuery = ({ pageSize = 12, status = null }) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', { status: status || 'all' }],
    queryFn: async ({ pageParam = null }) => {
      const col = collection(db, 'products');
      const constraints = [];
      if (status) constraints.push(where('status', '==', status));

      try {
        const ordered = [...constraints, orderBy('createdAt', 'desc'), limit(pageSize)];
        if (pageParam && typeof pageParam !== 'number') ordered.push(startAfter(pageParam));
        const snap = await getDocs(query(col, ...ordered));
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        return {
          products: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          nextCursor: lastDoc,
        };
      } catch (err) {
        // permission-denied, missing index, etc. → public API + client pagination
        console.warn('Products infinite Firestore failed, using API:', err?.code || err?.message || err);
        const all = await fetchPublicProducts(status);
        const pageIndex = typeof pageParam === 'number' ? pageParam : 0;
        const start = pageIndex * pageSize;
        const slice = all.slice(start, start + pageSize);
        return {
          products: slice,
          nextCursor: start + pageSize < all.length ? pageIndex + 1 : undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 1,
  });
};
