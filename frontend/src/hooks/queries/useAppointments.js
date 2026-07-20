import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config/api';

async function fetchAppointments(status = null) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const res = await fetch(`${API_URL}/api/appointments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to fetch appointments (${res.status})`);
  }

  let appointments = await res.json();
  if (status) {
    appointments = appointments.filter((a) => a.status === status);
  }
  return appointments;
}

export const useAppointmentsQuery = (status = null) => {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['appointments', { status }],
    queryFn: () => fetchAppointments(status),
    enabled: !loading && !!user,
    retry: 2,
  });
};

export const useInfiniteAppointmentsQuery = ({ pageSize = 12, status = null }) => {
  const { user, loading } = useAuth();
  return useInfiniteQuery({
    queryKey: ['appointments', 'infinite', { status }],
    queryFn: async ({ pageParam = 0 }) => {
      const appointments = await fetchAppointments(status);
      const start = pageParam * pageSize;
      const end = start + pageSize;
      return {
        appointments: appointments.slice(start, end),
        nextCursor: end < appointments.length ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !loading && !!user,
    retry: 2,
  });
};
