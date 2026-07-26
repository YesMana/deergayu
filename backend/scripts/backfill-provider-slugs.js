#!/usr/bin/env node
/**
 * Explicit operational backfill for approved providers missing publicSlug.
 *
 * SAFE: does not run automatically on deploy/merge. Must be invoked manually.
 *
 * Usage:
 *   node backend/scripts/backfill-provider-slugs.js --dry-run
 *   node backend/scripts/backfill-provider-slugs.js --apply
 *
 * Requirements:
 *   - GOOGLE_APPLICATION_CREDENTIALS or default Firebase Admin credentials
 *   - Idempotent: providers that already have publicSlug are skipped
 *   - Only writes publicSlug + providerSlugs index (via ensureProviderSlug)
 *   - Does not mutate Manu/test specialty/address fields
 */

const path = require('path');

// Load backend firebase the same way as server when possible
process.chdir(path.join(__dirname, '..'));

const admin = require('firebase-admin');
const { ensureProviderSlug, isValidSlug } = require('../providerSlugs');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !args.includes('--apply');

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
  const db = admin.firestore();

  console.log(`Provider slug backfill — mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  const snap = await db
    .collection('users')
    .where('role', 'in', ['doctor', 'clinic', 'organization'])
    .where('status', '==', 'approved')
    .get();

  const report = {
    scanned: snap.size,
    alreadyHaveSlug: 0,
    wouldCreate: [],
    created: [],
    errors: [],
  };

  for (const doc of snap.docs) {
    const data = doc.data() || {};
    if (data.publicSlug && isValidSlug(data.publicSlug)) {
      report.alreadyHaveSlug += 1;
      continue;
    }
    const planned = {
      providerId: doc.id,
      name: data.name || '',
      role: data.role,
    };
    if (dryRun) {
      report.wouldCreate.push(planned);
      continue;
    }
    try {
      const slug = await ensureProviderSlug(db, {
        providerId: doc.id,
        name: data.name,
        role: data.role,
        existingSlug: data.publicSlug,
      });
      report.created.push({ ...planned, slug });
    } catch (e) {
      report.errors.push({ providerId: doc.id, error: e.message });
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (dryRun) {
    console.log('\nDry-run only. Re-run with --apply to write slugs.');
  }
  if (report.errors.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
