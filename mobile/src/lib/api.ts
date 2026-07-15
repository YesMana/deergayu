import { API_URL, mediaUrl } from '../constants/api';
import { auth } from './firebase';

async function authHeaders(json = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = {
    ...(await authHeaders(method !== 'GET')),
    ...(options.headers as Record<string, string> | undefined),
  };
  // Always attach auth if available
  if (!headers.Authorization && auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export type HomeStats = {
  expertCount: number;
  productCount: number;
  orderCount: number;
  appointmentCount: number;
};

export type Product = {
  id: string;
  name?: string;
  price?: number;
  basePrice?: number;
  category?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  vendorId?: string;
  vendorName?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  status?: string;
  stock?: number;
};

export type ShippingZone = { id: string; name: string; fee: number };

export type StorefrontSettings = {
  shippingZones?: ShippingZone[];
  bankDetails?: {
    bank?: string;
    branch?: string;
    accountName?: string;
    accountNo?: string;
  };
  payhereEnabled?: boolean;
  contactEmail?: string;
};

export type CheckoutResult = {
  message?: string;
  orderIds?: string[];
  shippingFee?: number;
  shippingZone?: ShippingZone;
  payhereReady?: boolean;
};

export type Review = {
  id: string;
  userName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
};

export type Provider = {
  id: string;
  name?: string;
  role?: string;
  rating?: number;
  reviewCount?: number;
  profileDetails?: {
    specialty?: string | string[];
    profileImageUrl?: string;
    bio?: string;
    experience?: string;
    doctorType?: string;
    province?: string;
    address?: string;
    astrologyServices?: string[];
  };
};

export type GuideItem = {
  id: string;
  status?: string;
  order?: number;
  image?: string;
  category?: string;
  en?: Record<string, string>;
  si?: Record<string, string>;
  ta?: Record<string, string>;
};

export type VideoItem = {
  id: string;
  title?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  category?: string;
};

export type Order = {
  id: string;
  status?: string;
  total?: number;
  grandTotal?: number;
  createdAt?: string;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
};

export type Appointment = {
  id: string;
  providerName?: string;
  date?: string;
  time?: string;
  status?: string;
  consultationType?: string;
  notes?: string;
};

export function productImage(p: Product): string | null {
  return mediaUrl(p.imageUrl || p.image || p.images?.[0]);
}

export const fetchHomeStats = () => request<HomeStats>('/api/home-stats');
export const fetchFeaturedProducts = () => request<Product[]>('/api/featured-products');
export const fetchFeaturedProviders = () => request<Provider[]>('/api/featured-providers');
export const fetchProducts = (limit = 50) => request<Product[]>(`/api/products?limit=${limit}`);
export const fetchProduct = (id: string) => request<Product>(`/api/products/${id}`);
export const fetchProviders = () => request<Provider[]>('/api/providers');
export const fetchStorefrontSettings = () =>
  request<StorefrontSettings>('/api/storefront-settings');

export const postCheckout = (body: {
  paymentMethod: string;
  deliveryAddress: string;
  phone: string;
  notes?: string;
  shippingZoneId?: string;
}) =>
  request<CheckoutResult>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const createPayHereHash = (orderId: string, amount: number, currency = 'LKR') =>
  request<{
    merchant_id: string;
    hash: string;
    sandbox?: boolean;
    return_url?: string;
    cancel_url?: string;
    notify_url?: string;
    launchUrl?: string;
  }>('/api/payments/payhere/hash', {
    method: 'POST',
    body: JSON.stringify({ orderId, amount, currency }),
  });

export const fetchWishlist = () => request<{ items?: string[] }>('/api/wishlist');
export const toggleWishlist = (productId: string) =>
  request<{ added: boolean; items: string[] }>(`/api/wishlist/${productId}`, {
    method: 'POST',
    body: '{}',
  });

export const fetchProductReviews = (productId: string) =>
  request<Review[]>(`/api/reviews/product/${productId}`);
export const postReview = (body: {
  targetType: 'product' | 'provider';
  targetId: string;
  rating: number;
  comment?: string;
}) => request('/api/reviews', { method: 'POST', body: JSON.stringify(body) });
export const fetchGuideRemedies = () => request<GuideItem[]>('/api/guide/remedies');
export const fetchGuideRoutines = () => request<GuideItem[]>('/api/guide/routines');
export const fetchVideos = () => request<VideoItem[]>('/api/videos');

export const fetchAvailableSlots = (providerId: string, date: string) =>
  request<{ allSlots?: string[]; bookedSlots?: string[] }>(
    `/api/appointments/available/${providerId}?date=${encodeURIComponent(date)}`
  );

export const bookAppointment = (body: {
  providerId: string;
  providerName: string;
  date: string;
  time: string;
  phone?: string;
  notes?: string;
  consultationType?: string;
}) =>
  request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const fetchMyAppointments = () => request<Appointment[]>('/api/my-appointments');
export const cancelAppointment = (id: string) =>
  request(`/api/my-appointments/${id}/cancel`, { method: 'POST', body: '{}' });

export const fetchMyOrders = () => request<Order[]>('/api/my-orders');
export const fetchAuthMe = () => request<any>('/api/auth/me');

export const fetchServerCart = () => request<{ items?: any[] }>('/api/cart');
export const addServerCartItem = (payload: Record<string, unknown>) =>
  request('/api/cart', { method: 'POST', body: JSON.stringify(payload) });
export const updateServerCartQty = (productId: string, quantity: number) =>
  request(`/api/cart/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
export const deleteServerCartItem = (productId: string) =>
  request(`/api/cart/${productId}`, { method: 'DELETE' });

export const postChat = (message: string, lang = 'en') =>
  request<{ reply?: string; message?: string }>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, lang }),
  });

export const postSymptomCheck = (symptom: string, lang = 'en') =>
  request<any>('/api/symptom-check', {
    method: 'POST',
    body: JSON.stringify({ symptom, lang }),
  });

export const postAstrology = (body: Record<string, unknown>) =>
  request('/api/astrology', { method: 'POST', body: JSON.stringify(body) });

export const postContact = (body: Record<string, unknown>) =>
  request('/api/contact', { method: 'POST', body: JSON.stringify(body) });

export const postRegisterNotify = (body: Record<string, unknown>) =>
  request('/api/auth/register-notify', { method: 'POST', body: JSON.stringify(body) });

// ── Admin APIs ──────────────────────────────────────────────
export type AdminOverview = {
  pendingExperts: number;
  pendingProducts: number;
  pendingOrders: number;
  pendingAppointments: number;
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
};

export type AdminExpert = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  profileDetails?: Provider['profileDetails'];
};

export type AdminOrder = Order & {
  customerName?: string;
  customerEmail?: string;
  totalPrice?: number;
  paymentMethod?: string;
  phone?: string;
  deliveryAddress?: string;
};

export type AdminAppointment = Appointment & {
  customerName?: string;
  customerEmail?: string;
  providerId?: string;
};

export const fetchAdminOverview = () => request<AdminOverview>('/api/admin/overview');
export const fetchAdminExperts = (status?: string) =>
  request<AdminExpert[]>(`/api/admin/experts${status ? `?status=${encodeURIComponent(status)}` : ''}`);
export const fetchAdminProducts = (status?: string) =>
  request<Product[]>(`/api/admin/products${status ? `?status=${encodeURIComponent(status)}` : ''}`);
export const fetchAdminOrders = () => request<AdminOrder[]>('/api/orders');
export const fetchAdminAppointments = () => request<AdminAppointment[]>('/api/appointments');

export const setUserStatus = (uid: string, status: string) =>
  request(`/api/users/${uid}/status`, { method: 'POST', body: JSON.stringify({ status }) });
export const setProductStatus = (id: string, status: string) =>
  request(`/api/products/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
export const setOrderStatus = (id: string, status: string) =>
  request(`/api/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
export const setAppointmentStatus = (id: string, status: string) =>
  request(`/api/appointments/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
