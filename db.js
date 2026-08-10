// db.js — IndexedDB-lager. Primär lagring för övningar, rutiner, pass och mätvärden.
// All data lever här. localStorage används medvetet INTE (rensas lättare).

const DB_NAME = 'styrka-app';
const DB_VERSION = 1;

export const STORE_EXERCISES = 'exercises';
export const STORE_ROUTINES = 'routines';
export const STORE_SESSIONS = 'sessions';
export const STORE_CHECKINS = 'checkins';
export const STORE_META = 'meta';

const ALL_DATA_STORES = [STORE_EXERCISES, STORE_ROUTINES, STORE_SESSIONS, STORE_CHECKINS];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_EXERCISES)) {
        db.createObjectStore(STORE_EXERCISES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ROUTINES)) {
        db.createObjectStore(STORE_ROUTINES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const s = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        s.createIndex('date', 'date');
        s.createIndex('status', 'status');
      }
      if (!db.objectStoreNames.contains(STORE_CHECKINS)) {
        // En check-in per datum → datumet är nyckeln.
        db.createObjectStore(STORE_CHECKINS, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function store(name, mode) {
  return openDB().then((db) => db.transaction(name, mode).objectStore(name));
}

// ---- Generiska operationer per store ----

export async function getAll(name) {
  const s = await store(name, 'readonly');
  return reqToPromise(s.getAll());
}

export async function get(name, key) {
  const s = await store(name, 'readonly');
  return reqToPromise(s.get(key));
}

export async function put(name, value) {
  const s = await store(name, 'readwrite');
  await reqToPromise(s.put(value));
  return value;
}

export async function remove(name, key) {
  const s = await store(name, 'readwrite');
  return reqToPromise(s.delete(key));
}

export async function clear(name) {
  const s = await store(name, 'readwrite');
  return reqToPromise(s.clear());
}

// Skriv många poster i en transaktion (import och inläsning av program).
export async function bulkPut(name, values) {
  if (!values || !values.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(name, 'readwrite');
    const s = t.objectStore(name);
    for (const v of values) s.put(v);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

// Töm all träningsdata men behåll metadata (används vid "Ersätt allt").
export async function clearAllData() {
  for (const name of ALL_DATA_STORES) await clear(name);
}

// ---- Bekvämlighetsfunktioner ----

export const getExercises = () => getAll(STORE_EXERCISES);
export const getExercise = (id) => get(STORE_EXERCISES, id);
export const putExercise = (e) => put(STORE_EXERCISES, e);
export const deleteExercise = (id) => remove(STORE_EXERCISES, id);

export const getRoutines = () => getAll(STORE_ROUTINES);
export const getRoutine = (id) => get(STORE_ROUTINES, id);
export const putRoutine = (r) => put(STORE_ROUTINES, r);
export const deleteRoutine = (id) => remove(STORE_ROUTINES, id);

export const getSessions = () => getAll(STORE_SESSIONS);
export const getSession = (id) => get(STORE_SESSIONS, id);
export const putSession = (s) => put(STORE_SESSIONS, s);
export const deleteSession = (id) => remove(STORE_SESSIONS, id);

export const getCheckins = () => getAll(STORE_CHECKINS);
export const putCheckin = (c) => put(STORE_CHECKINS, c);
export const deleteCheckin = (date) => remove(STORE_CHECKINS, date);

// Hämta ett pågående pass (status 'active'), om något finns.
export async function getActiveSession() {
  const all = await getSessions();
  return all.find((s) => s.status === 'active') || null;
}

// ---- Metadata (nyckel/värde) ----

export async function getMeta(key, fallback = null) {
  const row = await get(STORE_META, key);
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  return put(STORE_META, { key, value });
}

// ---- Persistent lagring ----
// Be webbläsaren att inte vräka ut datan. Viktigt mot iOS Safaris rensning.
export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function storageEstimate() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
}
