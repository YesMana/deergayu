import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { API_URL } from '../config/api';

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Light client compress → JPEG blob (keeps uploads fast on mobile networks). */
async function compressForUpload(file, maxEdge = 1400, quality = 0.82) {
  if (!file.type?.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

async function uploadViaApi(file, filename) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again');
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append('image', file, filename);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
    if (!data.url) throw new Error('No image URL returned from server');
    return data.url;
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Upload timed out — check your connection and try again');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadViaFirebase(file, objectPath) {
  const storageRef = ref(storage, objectPath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Upload an image. Prefers the API (reliable), then Firebase Storage.
 * Firebase client attempts are hard-capped so the UI never sticks on "Uploading…".
 */
export async function uploadImageDurable(file, folder = 'uploads') {
  if (!file) throw new Error('No file selected');
  if (!file.type?.startsWith('image/')) throw new Error('Please select a valid image file');

  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again');

  const prepared = await compressForUpload(file);
  const ext = (prepared.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
  const objectPath = `${String(folder || 'uploads').replace(/^\/+|\/+$/g, '')}/${filename}`;

  const errors = [];

  // 1) API first — completes even when Firebase Storage rules/CORS are missing
  try {
    return await uploadViaApi(prepared, filename);
  } catch (err) {
    errors.push(err?.message || String(err));
    console.warn('API upload failed:', err?.message || err);
  }

  // 2) Firebase Storage with a short timeout (never hang the Upload button)
  try {
    const url = await withTimeout(uploadViaFirebase(prepared, objectPath), 12_000, 'Firebase Storage');
    if (url) return url;
  } catch (err) {
    errors.push(err?.message || String(err));
    console.warn('Firebase Storage upload failed:', err?.message || err);
  }

  throw new Error(errors.filter(Boolean).join(' · ') || 'Upload failed');
}
