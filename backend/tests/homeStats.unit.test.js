/**
 * Home stats trust cleanup — real counts only, no floors.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildHomeStatsPayload, fetchHomeStats } = require('../homeStats');
const { DEFAULT_SETTINGS } = require('../platformUtils');
const { createMemoryFirestore } = require('./memoryFirestore');

describe('home stats trust — no fabricated floors', () => {
  it('returns zero when all counts are zero', () => {
    assert.deepEqual(buildHomeStatsPayload({}), {
      expertCount: 0,
      productCount: 0,
      appointmentCount: 0,
      orderCount: 0,
    });
    assert.deepEqual(
      buildHomeStatsPayload({
        expertCount: 0,
        productCount: 0,
        appointmentCount: 0,
        orderCount: 0,
      }),
      { expertCount: 0, productCount: 0, appointmentCount: 0, orderCount: 0 }
    );
  });

  it('returns real small counts without inflating to legacy floors 50/1000/120', () => {
    const payload = buildHomeStatsPayload({
      expertCount: 2,
      appointmentCount: 5,
      productCount: 3,
      orderCount: 1,
    });
    assert.equal(payload.expertCount, 2);
    assert.equal(payload.appointmentCount, 5);
    assert.equal(payload.productCount, 3);
    assert.notEqual(payload.expertCount, 50);
    assert.notEqual(payload.appointmentCount, 1000);
    assert.notEqual(payload.productCount, 120);
  });

  it('never applies Math.max with configured floors', () => {
    const floor = { expertCount: 50, productCount: 120, appointmentCount: 1000 };
    const real = { expertCount: 2, productCount: 3, appointmentCount: 5, orderCount: 0 };
    // Simulate the FORBIDDEN old behaviour and prove we do not do it
    const inflated = {
      expertCount: Math.max(real.expertCount, floor.expertCount),
      productCount: Math.max(real.productCount, floor.productCount),
      appointmentCount: Math.max(real.appointmentCount, floor.appointmentCount),
    };
    const honest = buildHomeStatsPayload(real);
    assert.notDeepEqual(honest, {
      expertCount: inflated.expertCount,
      productCount: inflated.productCount,
      appointmentCount: inflated.appointmentCount,
      orderCount: 0,
    });
    assert.deepEqual(honest, {
      expertCount: 2,
      productCount: 3,
      appointmentCount: 5,
      orderCount: 0,
    });
  });

  it('DEFAULT_SETTINGS.homeStatsFloor is deprecated zeros (unused by fetch)', () => {
    assert.deepEqual(DEFAULT_SETTINGS.homeStatsFloor, {
      expertCount: 0,
      productCount: 0,
      appointmentCount: 0,
    });
  });

  it('appointmentPaymentsEnabled remains false', () => {
    assert.equal(DEFAULT_SETTINGS.appointmentPaymentsEnabled, false);
  });

  it('fetchHomeStats returns real sizes from memory Firestore', async () => {
    const db = createMemoryFirestore();
    // approved providers
    await db.collection('users').doc('d1').set({ role: 'doctor', status: 'approved' });
    await db.collection('users').doc('d2').set({ role: 'doctor', status: 'approved' });
    await db.collection('users').doc('pending').set({ role: 'doctor', status: 'pending' });
    await db.collection('users').doc('patient').set({ role: 'user', status: 'approved' });
    // products
    await db.collection('products').doc('p1').set({ status: 'approved' });
    await db.collection('products').doc('p2').set({ status: 'approved' });
    await db.collection('products').doc('p3').set({ status: 'approved' });
    await db.collection('products').doc('hidden').set({ status: 'pending' });
    // appointments (includes cancelled — total recorded)
    for (let i = 0; i < 5; i++) {
      await db.collection('appointments').doc(`a${i}`).set({ status: i === 0 ? 'cancelled' : 'pending' });
    }
    await db.collection('orders').doc('o1').set({ status: 'pending' });

    let stats;
    try {
      stats = await fetchHomeStats(db);
    } catch (err) {
      assert.fail(`fetchHomeStats should work with memoryFirestore: ${err.message}`);
    }

    assert.equal(stats.expertCount, 2);
    assert.equal(stats.productCount, 3);
    assert.equal(stats.appointmentCount, 5);
    assert.equal(stats.orderCount, 1);
  });
});
