// backup.js — Export/import av hela databasen som JSON.
// version-fältet finns från start så framtida format kan läsa gamla backuper.

import {
  STORE_EXERCISES, STORE_ROUTINES, STORE_SESSIONS, STORE_CHECKINS,
  getAll, get, bulkPut, clearAllData, getMeta, setMeta,
} from './db.js';
import {
  normalizeExercise, normalizeRoutine, normalizeSession, normalizeCheckin, dateKey,
} from './model.js';

export const EXPORT_VERSION = 1;

// Metadata som följer med i backupen. Övrigt (t.ex. lastExportAt) är lokalt.
const META_KEYS = ['programStartDate', 'bodyWeight'];

const PARTS = [
  { store: STORE_EXERCISES, key: 'exercises', normalize: normalizeExercise, idKey: 'id' },
  { store: STORE_ROUTINES, key: 'routines', normalize: normalizeRoutine, idKey: 'id' },
  { store: STORE_SESSIONS, key: 'sessions', normalize: normalizeSession, idKey: 'id' },
  { store: STORE_CHECKINS, key: 'checkins', normalize: normalizeCheckin, idKey: 'date' },
];

export async function buildExport() {
  const data = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    meta: {},
  };
  for (const part of PARTS) data[part.key] = await getAll(part.store);
  for (const k of META_KEYS) data.meta[k] = await getMeta(k, null);
  return data;
}

export async function exportToFile() {
  const data = await buildExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `styrka-${dateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await setMeta('lastExportAt', data.exportedAt);
  return data;
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Filen är inte giltig JSON.');
  if (typeof obj.version !== 'number') throw new Error('Saknar version-fält.');
  if (obj.version > EXPORT_VERSION) {
    throw new Error(`Backupen är från en nyare appversion (v${obj.version}). Uppdatera appen först.`);
  }
  if (!Array.isArray(obj.exercises)) throw new Error('Saknar övningslista (exercises).');
  if (!Array.isArray(obj.routines)) throw new Error('Saknar rutinlista (routines).');
  if (obj.sessions && !Array.isArray(obj.sessions)) throw new Error('sessions måste vara en lista.');
  if (obj.checkins && !Array.isArray(obj.checkins)) throw new Error('checkins måste vara en lista.');
  return true;
}

export async function readImportFile(file) {
  const text = await file.text();
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Kunde inte tolka filen som JSON.');
  }
  validateImport(obj);
  return obj;
}

export function importSummary(obj) {
  return {
    exercises: (obj.exercises || []).length,
    routines: (obj.routines || []).length,
    sessions: (obj.sessions || []).length,
    checkins: (obj.checkins || []).length,
  };
}

// Ersätt allt: töm databasen och skriv in backupens innehåll.
export async function importReplace(obj) {
  validateImport(obj);
  await clearAllData();
  const counts = {};
  for (const part of PARTS) {
    const rows = (obj[part.key] || []).map(part.normalize);
    await bulkPut(part.store, rows);
    counts[part.key] = rows.length;
  }
  await restoreMeta(obj);
  return counts;
}

// Slå ihop: per id/datum. Vid konflikt vinner den senast ändrade posten.
export async function importMerge(obj) {
  validateImport(obj);
  const counts = {};
  for (const part of PARTS) {
    let added = 0;
    let updated = 0;
    const toWrite = [];
    for (const raw of obj[part.key] || []) {
      const incoming = part.normalize(raw);
      const existing = await get(part.store, incoming[part.idKey]);
      if (!existing) {
        toWrite.push(incoming);
        added++;
      } else if (changedAt(incoming) > changedAt(existing)) {
        toWrite.push(incoming);
        updated++;
      }
    }
    await bulkPut(part.store, toWrite);
    counts[part.key] = { added, updated };
  }
  await restoreMeta(obj);
  return counts;
}

async function restoreMeta(obj) {
  if (!obj.meta) return;
  for (const k of META_KEYS) {
    if (obj.meta[k] != null) await setMeta(k, obj.meta[k]);
  }
}

function changedAt(row) {
  return Date.parse(row.updatedAt || row.finishedAt || row.startedAt || row.createdAt || 0) || 0;
}

// ---- Påminnelse om backup ----
// Påminn om senaste export var > 7 dagar sen, eller om något ändrats sen dess.
export async function backupReminder({ sessions = [], exercises = [], routines = [] } = {}) {
  const hasData = sessions.length || exercises.length || routines.length;
  const lastExportAt = await getMeta('lastExportAt', null);
  if (!lastExportAt) {
    if (sessions.length > 0) return { due: true, reason: 'Du har aldrig exporterat en backup.' };
    return { due: false };
  }
  const last = Date.parse(lastExportAt);
  const days = (Date.now() - last) / 86400000;
  if (days >= 7 && hasData) {
    return { due: true, reason: `Senaste backup var ${Math.floor(days)} dagar sedan.` };
  }
  const changed = [...sessions, ...exercises, ...routines]
    .some((row) => changedAt(row) > last);
  if (changed) return { due: true, reason: 'Du har loggat eller ändrat något sedan senaste backup.' };
  return { due: false };
}
