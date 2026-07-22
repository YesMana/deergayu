import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, startAfter, getCountFromServer } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { API_URL } from '../../config/api';

async function fetchPublicProviders(status = null) {
  const res = await fetch(`${API_URL}/api/providers`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch providers (${res.status})`);
  }
  let list = await res.json();
  if (!Array.isArray(list)) list = [];
  if (status) list = list.filter((u) => u.status === status);
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

async function fetchAdminProviders(status = null) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_URL}/api/admin/experts${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch experts (${res.status})`);
  }
  return res.json();
}

async function fetchProvidersWithFallback(status = null) {
  try {
    const col = collection(db, 'users');
    const constraints = [where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor'])];
    if (status) constraints.push(where('status', '==', status));
    const snap = await getDocs(query(col, ...constraints));
    const providers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    providers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return providers;
  } catch (err) {
    console.warn('Providers Firestore failed, using API:', err?.code || err?.message || err);
    try {
      return await fetchPublicProviders(status);
    } catch {
      return fetchAdminProviders(status);
    }
  }
}

export const useProvidersQuery = (status = null) => {
  return useQuery({
    queryKey: ['providers', { status }],
    queryFn: () => fetchProvidersWithFallback(status),
    retry: 1,
  });
};

export const useInfiniteProvidersQuery = ({ pageSize = 12, status = null }) => {
  return useInfiniteQuery({
    queryKey: ['providers', 'infinite', { status }],
    queryFn: async ({ pageParam = null }) => {
      try {
        const col = collection(db, 'users');
        const constraints = [
          where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor']),
          limit(pageSize),
        ];
        if (status) constraints.push(where('status', '==', status));
        if (pageParam && typeof pageParam !== 'number') constraints.push(startAfter(pageParam));

        const snap = await getDocs(query(col, ...constraints));
        const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
        const providers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        providers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return { providers, nextCursor: lastDoc };
      } catch (err) {
        console.warn('Providers infinite Firestore failed, using API:', err?.code || err?.message || err);
        const all = await fetchPublicProviders(status);
        const pageIndex = typeof pageParam === 'number' ? pageParam : 0;
        const start = pageIndex * pageSize;
        const slice = all.slice(start, start + pageSize);
        return {
          providers: slice,
          nextCursor: start + pageSize < all.length ? pageIndex + 1 : undefined,
        };
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: 1,
  });
};

export const useProvidersCountQuery = (status = null) => {
  return useQuery({
    queryKey: ['providers', 'count', { status }],
    queryFn: async () => {
      try {
        const col = collection(db, 'users');
        const constraints = [where('role', 'in', ['doctor', 'clinic', 'organization', 'vendor'])];
        if (status) constraints.push(where('status', '==', status));
        const snap = await getCountFromServer(query(col, ...constraints));
        return snap.data().count;
      } catch {
        const list = await fetchPublicProviders(status);
        return list.length;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};
