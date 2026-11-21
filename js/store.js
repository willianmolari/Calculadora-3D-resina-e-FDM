/* ============================================================
   store.js — Estado, persistência local (IndexedDB) e nuvem (Supabase)
   ============================================================ */
(function (global) {
  'use strict';

  const DB_NAME = 'molari3d';
  const DB_STORE = 'kv';
  const STATE_KEY = 'app-state';

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaults() {
    return {
      version: 1,
      workspaceId: uid('ws'),
      settings: {
        company: {
          name: 'Molari 3D',
          tagline: 'Impressão 3D sob medida',
          owner: 'Willian Molari',
          document: '',
          email: '',
          phone: '',
          address: 'Curitiba, PR',
          pix: '',
          bankInfo: '',
          validityDays: 7,
          minimumOrder: 15,
          quotePrefix: 'ORC'
        },
        appearance: { theme: 'light' },
        materials: {
          pla: { label: 'PLA', price: 110, unit: 'kg', color: '#0a84ff' },
          petg: { label: 'PET-G', price: 110, unit: 'kg', color: '#30d158' },
          tpu: { label: 'TPU', price: 130, unit: 'kg', color: '#ff9f0a' },
          resin: { label: 'Resina SLA', price: 150, unit: 'L', color: '#bf5af2' }
        },
        painting: { simple: 20, complex: 50 },
        energy: {
          pricePerKwh: 1.01,
          fdmWatts: 80,
          petgWatts: 75,
          tpuWatts: 85,
          resinWatts: 65,
          standbyWatts: 7,
          source: 'Copel B1 · R$ 0,768/kWh + impostos · bandeira verde (11/2026)'
        },
        machines: {
          fdmName: 'Bambu Lab A1 mini + AMS',
          fdmPrice: 1900,
          fdmLifespan: 5000,
          fdmMaintenance: 0.35,
          purgeGrams: 5,
          purgeMinutes: 1.5,
          resinName: 'Impressora de resina',
          resinPrice: 1500,
          resinLifespan: 3000,
          resinMaintenance: 0.5,
          washCureCost: 5
        },
        labor: { hourlyRate: 35, modelingRate: 80 },
        margins: { ideal: 65, minimum: 40 },
        costs: {
          waste: 5,
          failureFdm: 8,
          failureResin: 12,
          platformFee: 0,
          extraFixed: 0
        },
        market: { perGramMin: 0.8, perGramMax: 2.5 },
        cloud: { url: '', anonKey: '', autoSync: false, lastSync: '' }
      },
      clients: [],
      quotes: [],
      sales: [],
      products: [],
      stock: [
        { id: uid('stk'), material: 'pla', name: 'PLA', brand: 'Bambu / Genérico', qty: 1, unit: 'kg', min: 0.5, cost: 110, updatedAt: new Date().toISOString() },
        { id: uid('stk'), material: 'petg', name: 'PET-G', brand: 'Bambu / Genérico', qty: 1, unit: 'kg', min: 0.5, cost: 110, updatedAt: new Date().toISOString() },
        { id: uid('stk'), material: 'tpu', name: 'TPU', brand: 'Genérico', qty: 0.5, unit: 'kg', min: 0.3, cost: 130, updatedAt: new Date().toISOString() },
        { id: uid('stk'), material: 'resin', name: 'Resina SLA', brand: 'Genérico', qty: 1, unit: 'L', min: 0.3, cost: 150, updatedAt: new Date().toISOString() }
      ],
      movements: [],
      services: [
        { id: uid('srv'), name: 'Modelagem 3D', description: 'Criação ou ajuste de arquivo 3D', price: 80, unit: 'hora' },
        { id: uid('srv'), name: 'Pintura simples', description: 'Pintura básica com tinta acrílica/aerossol', price: 20, unit: 'peça' },
        { id: uid('srv'), name: 'Pintura complexa', description: 'Mascarário, degradê ou detalhes finos', price: 50, unit: 'peça' },
        { id: uid('srv'), name: 'Pós-processamento', description: 'Lavagem, cura UV e lixamento', price: 15, unit: 'peça' }
      ]
    };
  }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) return reject(new Error('IndexedDB indisponível'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function readLocal() {
    let local = null;
    try { const raw = localStorage.getItem(STATE_KEY); local = raw ? JSON.parse(raw) : null; }
    catch (e) { local = null; }

    let indexed = null;
    try {
      const db = await openDB();
      indexed = await new Promise(function (resolve, reject) {
        const tx = db.transaction(DB_STORE, 'readonly');
        const req = tx.objectStore(DB_STORE).get(STATE_KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    } catch (e) { /* usa localStorage */ }

    if (!local) return indexed;
    if (!indexed) return local;
    return (indexed.savedAt || 0) > (local.savedAt || 0) ? indexed : local;
  }

  async function writeLocal(state) {
    state.savedAt = Date.now();
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
    catch (e) { /* sem espaço no localStorage: segue com IndexedDB */ }
    try {
      const db = await openDB();
      await new Promise(function (resolve, reject) {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(state, STATE_KEY);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    } catch (e) {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (err) { /* sem persistência */ }
    }
  }

  /* ---------- Supabase ---------- */
  const TABLE = 'workspace';

  function cloudHeaders(s, extra) {
    return Object.assign({
      'apikey': s.anonKey,
      'Authorization': 'Bearer ' + s.anonKey,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  async function cloudPush(state) {
    const c = state.settings.cloud;
    if (!c.url || !c.anonKey) throw new Error('Configure a URL e a chave do Supabase em Configurações.');
    const url = c.url.replace(/\/$/, '') + '/rest/v1/' + TABLE + '?on_conflict=id';
    const payload = [{ id: state.workspaceId, data: state, updated_at: new Date().toISOString() }];
    const res = await fetch(url, {
      method: 'POST',
      headers: cloudHeaders(c, { 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Falha ao enviar (HTTP ' + res.status + '): ' + (await res.text()).slice(0, 180));
    c.lastSync = new Date().toISOString();
  }

  async function cloudPull(state) {
    const c = state.settings.cloud;
    if (!c.url || !c.anonKey) throw new Error('Configure a URL e a chave do Supabase em Configurações.');
    const url = c.url.replace(/\/$/, '') + '/rest/v1/' + TABLE + '?id=eq.' + encodeURIComponent(state.workspaceId) + '&select=data,updated_at';
    const res = await fetch(url, { method: 'GET', headers: cloudHeaders(c) });
    if (!res.ok) throw new Error('Falha ao buscar (HTTP ' + res.status + '): ' + (await res.text()).slice(0, 180));
    const rows = await res.json();
    c.lastSync = new Date().toISOString();
    return rows && rows.length ? rows[0].data : null;
  }

  /* ---------- API pública ---------- */
  let state = defaults();
  let listeners = [];
  let saveTimer = null;

  const Store = {
    uid: uid,
    get state() { return state; },
    get settings() { return state.settings; },

    async init() {
      const saved = await readLocal();
      if (saved && saved.settings) {
        state = deepMerge(defaults(), saved);
      }
      await writeLocal(state);
      return state;
    },

    onChange(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },

    notify() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); },

    save(options) {
      options = options || {};
      clearTimeout(saveTimer);
      writeLocal(state);
      if (state.settings.cloud.autoSync && options.cloud !== false) {
        saveTimer = setTimeout(function () {
          cloudPush(state).then(function () {
            state.settings.cloud.lastSync = new Date().toISOString();
            writeLocal(state);
            Store.notify();
          }).catch(function (e) { console.warn('Sync:', e.message); });
        }, 1200);
      }
      Store.notify();
    },

    replace(next) {
      state = next;
      writeLocal(state);
      Store.notify();
    },

    pushCloud() { return cloudPush(state); },
    pullCloud() {
      return cloudPull(state).then(function (remote) {
        if (!remote) return false;
        state = deepMerge(defaults(), remote);
        writeLocal(state);
        Store.notify();
        return true;
      });
    },

    exportJSON() { return JSON.stringify(state, null, 2); },

    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.settings) throw new Error('Arquivo inválido: não contém configurações.');
      state = deepMerge(defaults(), parsed);
      writeLocal(state);
      Store.notify();
    },

    reset() {
      state = defaults();
      writeLocal(state);
      Store.notify();
    }
  };

  function deepMerge(base, extra) {
    if (extra === undefined) return base;
    if (Array.isArray(extra)) return extra.slice();
    if (extra === null || typeof extra !== 'object') return extra;
    if (base === null || typeof base !== 'object' || Array.isArray(base)) return extra;
    const out = {};
    Object.keys(base).forEach(function (k) { out[k] = deepMerge(base[k], extra[k]); });
    Object.keys(extra).forEach(function (k) { if (!(k in out)) out[k] = extra[k]; });
    return out;
  }

  global.Store = Store;
})(window);
