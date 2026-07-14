import { API_URL, mediaUrl } from '../constants/api';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
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
  category?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  description?: string;
  status?: string;
};

export function productImage(p: Product): string | null {
  return mediaUrl(p.imageUrl || p.image || p.images?.[0]);
}

export type Provider = {
  id: string;
  name?: string;
  role?: string;
  rating?: number;
  reviewCount?: number;
  profileDetails?: {
    specialty?: string;
    profileImageUrl?: string;
    bio?: string;
  };
};

export const fetchHomeStats = () => getJson<HomeStats>('/api/home-stats');
export const fetchFeaturedProducts = () => getJson<Product[]>('/api/featured-products');
export const fetchFeaturedProviders = () => getJson<Provider[]>('/api/featured-providers');
export const fetchProducts = (limit = 50) => getJson<Product[]>(`/api/products?limit=${limit}`);
export const fetchProviders = () => getJson<Provider[]>('/api/providers');
