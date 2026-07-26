/**
 * P1-B provider public slugs — server-generated, unique, URL-safe.
 *
 * Lifecycle (writes only on privileged/admin paths — never on public GET):
 *   A. Admin approval (POST /users/:uid/status → approved)
 *   B. Approved provider completes/updates profile (PUT /me/profile) when slug missing
 *   C. Explicit operational backfill: `node backend/scripts/backfill-provider-slugs.js`
 *
 * Immutability: once `users.publicSlug` is set, it is never changed by ensureProviderSlug.
 * Future provider name changes do NOT republish a new slug (SEO stability).
 * Manual slug changes require an explicit admin/ops procedure (not implemented as self-serve).
 *
 * Index: providerSlugs/{slug} → { providerId }. Client SDK cannot write (Firestore rules).
 * Deleting/deactivating a provider does not reassign their slug to another provider.
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
 * Reserve a unique slug for providerId using a Firestore transaction (concurrency-safe).
 * If provider already has publicSlug, returns it unchanged (immutable after publish).
 * Does not modify unrelated provider fields.
 */
async function ensureProviderSlug(db, { providerId, name, role, existingSlug }) {
  if (existingSlug && isValidSlug(existingSlug)) {
    return existingSlug;
  }
  // Re-read user in case another writer already set the slug
  const userRef = db.collection('users').doc(providerId);
  const fresh = await userRef.get();
  const freshSlug = fresh.exists ? fresh.data()?.publicSlug : null;
  if (freshSlug && isValidSlug(freshSlug)) {
    return freshSlug;
  }

  const base = slugifyProviderName(name, role);
  let n = 1;
  while (n < 200) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    try {
      const reserved = await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const current = userSnap.exists ? userSnap.data()?.publicSlug : null;
        if (current && isValidSlug(current)) {
          return current;
        }
        const slugRef = db.collection('providerSlugs').doc(candidate);
        const slugSnap = await tx.get(slugRef);
        if (slugSnap.exists && slugSnap.data()?.providerId !== providerId) {
          return null; // collision — try next
        }
        const now = new Date().toISOString();
        tx.set(
          slugRef,
          { providerId, slug: candidate, updatedAt: now },
          { merge: true }
        );
        tx.set(userRef, { publicSlug: candidate, updatedAt: now }, { merge: true });
        return candidate;
      });
      if (reserved) return reserved;
    } catch (e) {
      // Contention — retry same candidate once more via loop increment
    }
    n += 1;
  }
  // Fallback: append short id fragment (still transactional)
  const fallback = `${base}-${String(providerId).slice(0, 6).toLowerCase()}`;
  return db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const current = userSnap.exists ? userSnap.data()?.publicSlug : null;
    if (current && isValidSlug(current)) return current;
    const slugRef = db.collection('providerSlugs').doc(fallback);
    const slugSnap = await tx.get(slugRef);
    if (slugSnap.exists && slugSnap.data()?.providerId !== providerId) {
      throw new Error('Unable to reserve unique provider slug');
    }
    const now = new Date().toISOString();
    tx.set(slugRef, { providerId, slug: fallback, updatedAt: now }, { merge: true });
    tx.set(userRef, { publicSlug: fallback, updatedAt: now }, { merge: true });
    return fallback;
  });
}

async function resolveProviderIdBySlugOrId(db, idOrSlug) {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;
  // Prefer UID doc — legacy routes work even before slug backfill
  const byId = await db.collection('users').doc(key).get();
  if (byId.exists) {
    const data = byId.data() || {};
    if (['doctor', 'clinic', 'organization', 'vendor'].includes(String(data.role || ''))) {
      return { id: byId.id, data, via: 'id' };
    }
  }
  // Slug index (exact doc id = lowercase slug)
  const slugKey = key.toLowerCase();
  if (!isValidSlug(slugKey)) {
    // Malformed slug-like keys that are not UIDs → not found (UID path already tried)
    return null;
  }
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
