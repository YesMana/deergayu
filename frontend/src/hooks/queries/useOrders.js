import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

async function fetchOrders(status = null) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const res = await fetch(`${API_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch orders (${res.status})`);
  }

  let orders = await res.json();
  if (status) {
    orders = orders.filter((o) => o.status === status);
  }
  return orders;
}

export const useOrdersQuery = (status = null) => {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['orders', { status }],
    queryFn: () => fetchOrders(status),
    enabled: !loading && !!user,
    retry: 2,
  });
};

export const useInfiniteOrdersQuery = ({ pageSize = 12, status = null }) => {
  const { user, loading } = useAuth();
  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', { status }],
    queryFn: async ({ pageParam = 0 }) => {
      const orders = await fetchOrders(status);
      const start = pageParam * pageSize;
      const end = start + pageSize;
      return {
        orders: orders.slice(start, end),
        nextCursor: end < orders.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !loading && !!user,
    retry: 2,
  });
};
