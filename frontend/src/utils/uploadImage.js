import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { API_URL } from '../config/api';

/**
 * Upload an image to durable storage (Firebase Storage first, API disk fallback).
 * Returns a permanent HTTPS URL suitable for storing in Firestore.
 */
export async function uploadImageDurable(file, folder = 'uploads') {
  if (!file) throw new Error('No file selected');
  if (!file.type?.startsWith('image/')) throw new Error('Please select a valid image file');

  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const objectPath = `${folder}/${filename}`;

  // 1) Firebase Storage — survives Render restarts
  try {
    const storageRef = ref(storage, objectPath);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    if (url) return url;
  } catch (err) {
    console.warn('Firebase Storage upload failed, trying API:', err?.message || err);
  }

  // 2) Backend API (may be ephemeral on Render — last resort)
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append('image', file, filename);
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  if (!data.url) throw new Error('No image URL returned from server');
  return data.url;
}
