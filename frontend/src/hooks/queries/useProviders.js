import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, startAfter, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Fetch all experts (doctors, clinics, organizations, vendors).
 */
export const useProvidersQuery = (status = null) => {
  return useQuery({
    queryKey: ['providers', { status }],
    queryFn: async () => {
      const col = collection(db, 'users');
      const constraints = [where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor'])];
      if (status) constraints.push(where('status', '==', status));
      
      const q = query(col, ...constraints);
      const snap = await getDocs(q);
      
      const providers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side to avoid composite index requirement
      providers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return providers;
    },
  });
};

/**
 * Fetch experts with cursor-based pagination.
 * Used in Channeling page and Admin ManageProviders.
 */
export const useInfiniteProvidersQuery = ({ pageSize = 12, status = null }) => {
  return useInfiniteQuery({
    queryKey: ['providers', 'infinite', { status }],
    queryFn: async ({ pageParam = null }) => {
      const col = collection(db, 'users');
      let constraints = [
        where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']),
        limit(pageSize)
      ];

      if (status) {
        constraints.push(where('status', '==', status));
      }

      if (pageParam) {
        constraints.push(startAfter(pageParam));
      }

      const q = query(col, ...constraints);
      const snap = await getDocs(q);
      
      const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      const providers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort client-side to avoid composite index requirement
      providers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return {
        providers,
        nextCursor: lastDoc,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });
};

/**
 * Fetch total count of providers (e.g. for badges or stats)
 */
export const useProvidersCountQuery = (status = null) => {
  return useQuery({
    queryKey: ['providers', 'count', { status }],
    queryFn: async () => {
      const col = collection(db, 'users');
      const constraints = [where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor'])];
      if (status) constraints.push(where('status', '==', status));
      
      const q = query(col, ...constraints);
      const snap = await getCountFromServer(q);
      return snap.data().count;
    },
    staleTime: 5 * 60 * 1000,
  });
};
