/**
 * Minimal in-memory Firestore mock for finance unit tests.
 * Supports: doc get/set/update, add, where==, limit, runTransaction, subcollections.
 * Transaction writes are applied synchronously (like Admin SDK transaction buffer semantics).
 */

function deepClone(v) {
  return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
}

function createMemoryFirestore() {
  /** @type {Map<string, any>} */
  const store = new Map();

  function pathKey(parts) {
    return parts.join('/');
  }

  function makeDocRef(parts) {
    const key = pathKey(parts);
    return {
      id: parts[parts.length - 1],
      path: key,
      collection(sub) {
        return makeCollectionFixed([...parts, sub]);
      },
      async get() {
        const data = store.get(key);
        return {
          id: parts[parts.length - 1],
          exists: data !== undefined,
          data: () => (data === undefined ? undefined : deepClone(data)),
        };
      },
      async set(value, opts = {}) {
        if (opts.merge && store.has(key)) {
          store.set(key, { ...store.get(key), ...deepClone(value) });
        } else {
          store.set(key, deepClone(value));
        }
      },
      async update(value) {
        if (!store.has(key)) throw new Error(`NOT_FOUND: ${key}`);
        store.set(key, { ...store.get(key), ...deepClone(value) });
      },
      /** Sync helpers for transactions */
      _setSync(value, opts = {}) {
        if (opts.merge && store.has(key)) {
          store.set(key, { ...store.get(key), ...deepClone(value) });
        } else {
          store.set(key, deepClone(value));
        }
      },
      _updateSync(value) {
        if (!store.has(key)) throw new Error(`NOT_FOUND: ${key}`);
        store.set(key, { ...store.get(key), ...deepClone(value) });
      },
      _getSync() {
        const data = store.get(key);
        return {
          id: parts[parts.length - 1],
          exists: data !== undefined,
          data: () => (data === undefined ? undefined : deepClone(data)),
        };
      },
    };
  }

  function makeQuery(colParts, filters = [], lim = null) {
    return {
      where(field, op, value) {
        if (op !== '==') throw new Error(`memoryFirestore only supports ==, got ${op}`);
        return makeQuery(colParts, [...filters, { field, value }], lim);
      },
      limit(n) {
        return makeQuery(colParts, filters, n);
      },
      async get() {
        const prefix = `${pathKey(colParts)}/`;
        const depth = colParts.length + 1;
        let docs = [];
        for (const [k, v] of store.entries()) {
          const segs = k.split('/');
          if (segs.length !== depth) continue;
          if (!k.startsWith(prefix)) continue;
          let ok = true;
          for (const f of filters) {
            if (v?.[f.field] !== f.value) ok = false;
          }
          if (ok) {
            docs.push({
              id: segs[segs.length - 1],
              data: () => deepClone(v),
              ref: makeDocRef(segs),
              exists: true,
            });
          }
        }
        if (lim != null) docs = docs.slice(0, lim);
        return { empty: docs.length === 0, docs, size: docs.length };
      },
    };
  }

  function makeCollectionFixed(parts) {
    return {
      doc(id) {
        if (!id) id = `auto_${Math.random().toString(36).slice(2, 10)}`;
        return makeDocRef([...parts, id]);
      },
      async add(value) {
        const id = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const ref = makeDocRef([...parts, id]);
        await ref.set(value);
        return ref;
      },
      where(field, op, value) {
        return makeQuery(parts, []).where(field, op, value);
      },
      limit(n) {
        return makeQuery(parts, [], n);
      },
      async get() {
        return makeQuery(parts).get();
      },
    };
  }

  /** Serialize transactions to approximate Firestore contention safety in tests */
  let txChain = Promise.resolve();

  return {
    collection(name) {
      return makeCollectionFixed([name]);
    },
    async runTransaction(fn) {
      const run = async () => {
        const tx = {
          async get(ref) {
            return ref._getSync();
          },
          set(ref, value, opts) {
            ref._setSync(value, opts || {});
          },
          update(ref, value) {
            ref._updateSync(value);
          },
        };
        return fn(tx);
      };
      const next = txChain.then(run, run);
      // Keep chain alive even if a transaction fails
      txChain = next.catch(() => {});
      return next;
    },
    _store: store,
  };
}

module.exports = { createMemoryFirestore };
