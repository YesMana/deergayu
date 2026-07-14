import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, startAfter, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Fetch all products (optionally filtered by status)
 * Good for admin panels or small lists where infinite scrolling isn't needed.
 */
export const useProductsQuery = (status = null) => {
  return useQuery({
    queryKey: ['products', { status }],
    queryFn: async () => {
      const col = collection(db, 'products');
      const q = status ? query(col, where('status', '==', status)) : query(col);
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
  });
};

/**
 * Fetch products with cursor-based pagination.
 * Good for consumer-facing Shop pages.
 * Note: Since Firestore requires composite indexes for sorting + filtering,
 * we handle search/category client-side on the loaded data for simplicity,
 * or server-side if strict indexes exist.
 */
export const useInfiniteProductsQuery = ({ pageSize = 12, status = 'approved' }) => {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', { status }],
    queryFn: async ({ pageParam = null }) => {
      const col = collection(db, 'products');
      let constraints = [
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      ];

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(col, ...constraints);
      const snap = await getDocs(q);
      
      const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      return {
        products,
        nextCursor: lastDoc,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};
