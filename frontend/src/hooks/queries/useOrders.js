import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../../firebase';

const API_URL = import.meta.env.VITE_API_URL || '';

export const useOrdersQuery = (status = null) => {
  return useQuery({
    queryKey: ['orders', { status }],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      
      let orders = await res.json();
      if (status) {
        orders = orders.filter(o => o.status === status);
      }
      return orders;
    },
  });
};

export const useInfiniteOrdersQuery = ({ pageSize = 12, status = null }) => {
  // Fallback to basic query since backend might not support pagination yet
  return useInfiniteQuery({
    queryKey: ['orders', 'infinite', { status }],
    queryFn: async ({ pageParam = 0 }) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      
      let orders = await res.json();
      if (status) {
        orders = orders.filter(o => o.status === status);
      }
      
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const pageData = orders.slice(start, end);
      
      return {
        orders: pageData,
        nextCursor: end < orders.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage, allPages) => lastPage.nextCursor,
  });
};
