/**
 * Assert mobile home trust strip has no fabricated numeric floors.
 * Run with: npx tsc --noEmit (types) + this static check via node.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const indexPath = path.join(__dirname, '../../mobile/src/app/(tabs)/index.tsx');
const homeStatsPath = path.join(__dirname, '../../mobile/src/constants/homeStats.ts');
const indexSrc = fs.readFileSync(indexPath, 'utf8');
const homeStatsSrc = fs.readFileSync(homeStatsPath, 'utf8');

assert.ok(indexSrc.includes('Approved providers'), 'mobile trust label missing');
assert.ok(indexSrc.includes('Secure booking'), 'mobile trust label missing');
assert.ok(indexSrc.includes('Ayurvedic products'), 'mobile trust label missing');
assert.ok(!indexSrc.includes('fetchHomeStats'), 'mobile home must not fetch floored stats for display');
assert.ok(!indexSrc.includes('displayHomeStats'), 'mobile home must not map numeric home stats');
assert.ok(!/value:\s*shown\.(expert|product|appointment)Count/.test(indexSrc), 'numeric counters still present');
assert.ok(!/expertCount:\s*50|appointmentCount:\s*1000|productCount:\s*120/.test(homeStatsSrc), 'no hardcoded floor literals');
assert.ok(!/Math\.max\([^)]+,\s*(50|120|1000)/.test(homeStatsSrc), 'no Math.max floor inflation');
assert.ok(homeStatsSrc.includes('HOME_STATS_FALLBACK = null'), 'fallback must be null');

console.log('mobile home stats trust static check: PASS');
