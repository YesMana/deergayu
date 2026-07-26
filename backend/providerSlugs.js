/**
 * P1-B provider public slugs — server-generated, unique, URL-safe.
 * Stored on users/{uid}.publicSlug; uniqueness via providerSlugs/{slug} index docs.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugifyProviderName(name = '', role = 'doctor') {
  let base = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (!base) base = 'provider';
  // Prefer dr- prefix for physician-style roles when not already present
  if ((role === 'doctor' || role === 'vendor') && !base.startsWith('dr-') && !base.startsWith('clinic-')) {
    base = `dr-${base}`.slice(0, 72);
  }
  if (role === 'clinic' && !base.startsWith('clinic-')) {
    base = `clinic-${base}`.slice(0, 72);
  }
  if (role === 'organization' && !base.startsWith('org-')) {
    base = `org-${base}`.slice(0, 72);
  }
  return base.replace(/^-+|-+$/g, '') || 'provider';
}

function isValidSlug(slug) {
  return typeof slug === 'string' && slug.length >= 2 && slug.length <= 80 && SLUG_RE.test(slug);
}

/**
 * Reserve a unique slug for providerId. Collision → suffix -2, -3, …
 * If provider already has publicSlug, returns it unchanged (immutable after publish).
 */
async function ensureProviderSlug(db, { providerId, name, role, existingSlug }) {
  if (existingSlug && isValidSlug(existingSlug)) {
    return existingSlug;
  }
  const base = slugifyProviderName(name, role);
  let candidate = base;
  let n = 1;
  // Cap attempts
  while (n < 200) {
    const ref = db.collection('providerSlugs').doc(candidate);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.providerId === providerId) {
      await ref.set(
        {
          providerId,
          slug: candidate,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await db.collection('users').doc(providerId).set(
        {
          publicSlug: candidate,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return candidate;
    }
    n += 1;
    candidate = `${base}-${n}`;
  }
  // Fallback: append short id fragment
  candidate = `${base}-${String(providerId).slice(0, 6).toLowerCase()}`;
  await db.collection('providerSlugs').doc(candidate).set({
    providerId,
    slug: candidate,
    updatedAt: new Date().toISOString(),
  });
  await db.collection('users').doc(providerId).set(
    { publicSlug: candidate, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return candidate;
}

async function resolveProviderIdBySlugOrId(db, idOrSlug) {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;
  // Prefer UID doc
  const byId = await db.collection('users').doc(key).get();
  if (byId.exists) {
    const data = byId.data() || {};
    if (['doctor', 'clinic', 'organization', 'vendor'].includes(String(data.role || ''))) {
      return { id: byId.id, data, via: 'id' };
    }
  }
  // Slug index
  const slugKey = key.toLowerCase();
  const slugDoc = await db.collection('providerSlugs').doc(slugKey).get();
  if (slugDoc.exists) {
    const providerId = slugDoc.data()?.providerId;
    if (providerId) {
      const user = await db.collection('users').doc(providerId).get();
      if (user.exists) return { id: user.id, data: user.data(), via: 'slug' };
    }
  }
  // Fallback scan by publicSlug field (legacy until index exists)
  const q = await db.collection('users').where('publicSlug', '==', slugKey).limit(1).get();
  if (!q.empty) {
    const doc = q.docs[0];
    return { id: doc.id, data: doc.data(), via: 'publicSlug' };
  }
  return null;
}

module.exports = {
  SLUG_RE,
  slugifyProviderName,
  isValidSlug,
  ensureProviderSlug,
  resolveProviderIdBySlugOrId,
};
