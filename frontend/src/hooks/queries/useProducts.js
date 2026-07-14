import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Fetch all products (optionally filtered by status)
 */
export const useProductsQuery = (status = null) => {
  return useQuery({
    queryKey: ['products', { status }],
    queryFn: async () => {
      const col = collection(db, 'products');
      const q = status ? query(col, where('status', '==', status)) : query(col);
      const snap = await getDocs(q);
      const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return products;
    },
  });
};

/**
 * Fetch products with cursor-based pagination.
 * When status is null/"All", load without status filter so admin sees every vendor product.
 */
export const useInfiniteProductsQuery = ({ pageSize = 12, status = null }) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', { status: status || 'all' }],
    queryFn: async ({ pageParam = null }) => {
      const col = collection(db, 'products');
      const constraints = [];

      if (status) {
        constraints.push(where('status', '==', status));
      }

      // Prefer createdAt ordering when possible; fall back without order if index missing
      try {
        const ordered = [
          ...constraints,
          orderBy('createdAt', 'desc'),
          limit(pageSize),
        ];
        if (pageParam) ordered.push(startAfter(pageParam));
        const snap = await getDocs(query(col, ...ordered));
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        return {
          products: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          nextCursor: lastDoc,
        };
      } catch (err) {
        // Missing composite index — fetch and sort client-side
        console.warn('Products query falling back (index?):', err?.code || err?.message);
        const snap = await getDocs(
          status ? query(col, where('status', '==', status), limit(200)) : query(col, limit(200))
        );
        let products = snap.docs.map((d) => ({ id: d.id, ...d.data(), _doc: d }));
        products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return {
          products: products.map(({ _doc, ...p }) => p),
          nextCursor: null,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};
