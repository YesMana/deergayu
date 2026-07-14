import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../../firebase';

const API_URL = import.meta.env.VITE_API_URL || '';

export const useAppointmentsQuery = (status = null) => {
  return useQuery({
    queryKey: ['appointments', { status }],
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      
      let appointments = await res.json();
      if (status) {
        appointments = appointments.filter(a => a.status === status);
      }
      return appointments;
    },
  });
};

export const useInfiniteAppointmentsQuery = ({ pageSize = 12, status = null }) => {
  return useInfiniteQuery({
    queryKey: ['appointments', 'infinite', { status }],
    queryFn: async ({ pageParam = 0 }) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch appointments');
      
      let appointments = await res.json();
      if (status) {
        appointments = appointments.filter(a => a.status === status);
      }
      
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const pageData = appointments.slice(start, end);
      
      return {
        appointments: pageData,
        nextCursor: end < appointments.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage, allPages) => lastPage.nextCursor,
  });
};
