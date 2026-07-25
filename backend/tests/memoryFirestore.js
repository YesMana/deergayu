/**
 * Minimal in-memory Firestore mock for finance unit tests.
 * Supports: doc get/set/update, add, where==, limit, runTransaction, subcollections.
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
        return makeCollection([...parts, sub]);
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
        const prefix = pathKey(colParts) + '/';
        const depth = colParts.length + 1;
        let docs = [];
        for (const [k, v] of store.entries()) {
          const segs = k.split('/');
          if (!k.startsWith(prefix) && k !== pathKey(colParts)) continue;
          if (segs.length !== depth) continue;
          if (!k.startsWith(pathKey(colParts) + '/')) continue;
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
        return {
          empty: docs.length === 0,
          docs,
          size: docs.length,
        };
      },
    };
  }

  function makeCollection(parts) {
    return {
      doc(id) {
        return makeDocRef([...parts, id || `auto_${Math.random().toString(36).slice(2, 10)}`]);
      },
      async add(value) {
        const id = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const ref = makeDocRef([...parts, id]);
        await ref.set(value);
        return ref;
      },
      where(field, op, value) {
        return makeQuery(parts, [{ field, value }]).where
          ? makeQuery(parts, [{ field, value }])
          : makeQuery(parts, [{ field, value }]);
      },
      limit(n) {
        return makeQuery(parts, [], n);
      },
      async get() {
        return makeQuery(parts).get();
      },
    };
  }

  // Fix where chaining — redefine collection properly
  function makeCollectionFixed(parts) {
    const api = {
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
    return api;
  }

  return {
    collection(name) {
      return makeCollectionFixed([name]);
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          return ref.get();
        },
        set(ref, value, opts) {
          // synchronous queue — apply immediately for this mock
          return ref.set(value, opts || {});
        },
        update(ref, value) {
          return ref.update(value);
        },
      };
      return fn(tx);
    },
    _store: store,
  };
}

module.exports = { createMemoryFirestore };
