// model.js — Domänmodellen: övningar, rutiner, pass och set.
// Håller all normalisering på ett ställe så backuper från äldre versioner kan läsas in.

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function today() {
  return dateKey(new Date());
}

export function dateKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// =====================================================================
//  Mätsätt — styr vilka fält ett set loggar
// =====================================================================

export const METRICS = {
  weight_reps: { label: 'Vikt × reps', fields: ['weight', 'reps'] },
  reps: { label: 'Reps (kroppsvikt)', fields: ['reps'] },
  time: { label: 'Tid (sekunder)', fields: ['seconds'] },
  distance: { label: 'Distans (meter)', fields: ['meters', 'weight'] },
};

export const FIELD_LABELS = {
  weight: 'Vikt (kg)',
  reps: 'Reps',
  seconds: 'Sek',
  meters: 'Meter',
  rir: 'RIR',
};

export const FIELD_SHORT = { weight: 'kg', reps: 'reps', seconds: 's', meters: 'm', rir: 'RIR' };

export function metricFields(metric) {
  return (METRICS[metric] || METRICS.weight_reps).fields;
}

// Övningskategorier — styr filter och vilka rutiner de hör hemma i.
export const CATEGORIES = {
  styrka: 'Styrka',
  explosivt: 'Explosivt',
  kondition: 'Kondition',
  prehab: 'Prehab / axel',
  rorlighet: 'Rörlighet',
  bal: 'Bål',
};

export const ROUTINE_TYPES = {
  styrka: 'Styrka',
  kondition: 'Kondition',
  rorlighet: 'Rörlighet',
  prehab: 'Prehab',
};

// =====================================================================
//  Övning
// =====================================================================

export function createExercise(data = {}) {
  const now = new Date().toISOString();
  return normalizeExercise({
    id: data.id || uid('ex'),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

export function normalizeExercise(raw = {}) {
  return {
    id: raw.id || uid('ex'),
    name: raw.name || '',
    category: CATEGORIES[raw.category] ? raw.category : 'styrka',
    metric: METRICS[raw.metric] ? raw.metric : 'weight_reps',
    perSide: !!raw.perSide,
    // Standarddos — används som mål när övningen läggs i en rutin.
    defaultSets: numOr(raw.defaultSets, 3),
    defaultReps: raw.defaultReps || '',
    // Text från programmet: hur den utförs och vad man ska tänka på.
    howTo: raw.howTo || '',
    keyPoint: raw.keyPoint || '',
    // true → visa axelregeln (öka inte smärtan, håll dig i tolererat omfång).
    shoulderRule: !!raw.shoulderRule,
    // Egen länk till ett specifikt klipp eller en instruktionssida. Tom →
    // appen visar söklänkar i stället (se exercise-links.js).
    videoUrl: raw.videoUrl || '',
    equipment: raw.equipment || '',
    notes: raw.notes || '',
    builtin: !!raw.builtin,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

// =====================================================================
//  Rutin — en ordnad lista övningar med måldos
// =====================================================================

export function createRoutine(data = {}) {
  const now = new Date().toISOString();
  return normalizeRoutine({
    id: data.id || uid('rt'),
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

export function normalizeRoutine(raw = {}) {
  return {
    id: raw.id || uid('rt'),
    name: raw.name || '',
    type: ROUTINE_TYPES[raw.type] ? raw.type : 'styrka',
    description: raw.description || '',
    items: (raw.items || []).map(normalizeRoutineItem),
    builtin: !!raw.builtin,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeRoutineItem(raw = {}) {
  return {
    exerciseId: raw.exerciseId || '',
    sets: numOr(raw.sets, 3),
    reps: raw.reps || '',
    notes: raw.notes || '',
  };
}

// Läsbar dos, t.ex. "4 × 4-6" eller "3 × 20-30 s/sida".
export function doseLabel(item, exercise) {
  const ex = exercise || {};
  const reps = item.reps || ex.defaultReps || '';
  const unit = ex.metric === 'time' ? ' s' : ex.metric === 'distance' ? ' m' : '';
  const side = ex.perSide ? '/sida' : '';
  if (!reps) return `${item.sets} set`;
  return `${item.sets} × ${reps}${unit}${side}`;
}

// =====================================================================
//  Pass (session) — det som faktiskt loggas
// =====================================================================

export function createSession(routine, exercisesById, programWeek = null) {
  const now = new Date();
  return {
    id: uid('se'),
    routineId: routine ? routine.id : null,
    name: routine ? routine.name : 'Fritt pass',
    type: routine ? routine.type : 'styrka',
    date: dateKey(now),
    startedAt: now.toISOString(),
    finishedAt: null,
    status: 'active',
    programWeek,
    deload: false,
    notes: '',
    entries: (routine ? routine.items : []).map((item) => {
      const ex = exercisesById.get(item.exerciseId);
      return createEntry(ex, item);
    }).filter(Boolean),
  };
}

export function createEntry(exercise, item = {}) {
  if (!exercise) return null;
  const targetSets = numOr(item.sets, exercise.defaultSets || 3);
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    metric: exercise.metric,
    perSide: !!exercise.perSide,
    targetSets,
    targetReps: item.reps || exercise.defaultReps || '',
    notes: item.notes || '',
    sets: Array.from({ length: targetSets }, () => createSet()),
  };
}

export function createSet(prefill = {}) {
  return {
    weight: prefill.weight ?? null,
    reps: prefill.reps ?? null,
    seconds: prefill.seconds ?? null,
    meters: prefill.meters ?? null,
    rir: prefill.rir ?? null,
    done: false,
  };
}

export function normalizeSession(raw = {}) {
  return {
    id: raw.id || uid('se'),
    routineId: raw.routineId || null,
    name: raw.name || 'Pass',
    type: ROUTINE_TYPES[raw.type] ? raw.type : 'styrka',
    date: raw.date || today(),
    startedAt: raw.startedAt || new Date().toISOString(),
    finishedAt: raw.finishedAt || null,
    status: raw.status === 'active' ? 'active' : 'done',
    programWeek: raw.programWeek ?? null,
    deload: !!raw.deload,
    notes: raw.notes || '',
    entries: (raw.entries || []).map((e) => ({
      exerciseId: e.exerciseId || '',
      name: e.name || '',
      metric: METRICS[e.metric] ? e.metric : 'weight_reps',
      perSide: !!e.perSide,
      targetSets: numOr(e.targetSets, (e.sets || []).length || 3),
      targetReps: e.targetReps || '',
      notes: e.notes || '',
      sets: (e.sets || []).map((s) => ({
        weight: numOrNull(s.weight),
        reps: numOrNull(s.reps),
        seconds: numOrNull(s.seconds),
        meters: numOrNull(s.meters),
        rir: numOrNull(s.rir),
        done: !!s.done,
      })),
    })),
  };
}

export function normalizeCheckin(raw = {}) {
  return {
    date: raw.date || today(),
    shoulder: numOrNull(raw.shoulder),   // 0-10 på morgonen
    energy: numOrNull(raw.energy),       // 1-5
    sleep: numOrNull(raw.sleep),         // timmar
    bestLift: raw.bestLift || '',
    note: raw.note || '',
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

// =====================================================================
//  Beräkningar på loggade set
// =====================================================================

export function setIsLogged(set) {
  return set.done || [set.weight, set.reps, set.seconds, set.meters].some((v) => v != null && v !== '');
}

export function completedSets(entry) {
  return entry.sets.filter(setIsLogged);
}

// Tonnage för ett set. Ensidiga övningar räknas dubbelt (ett set = båda sidor).
export function setVolume(entry, set) {
  if (entry.metric !== 'weight_reps' || set.weight == null || set.reps == null) return 0;
  return set.weight * set.reps * (entry.perSide ? 2 : 1);
}

export function entryVolume(entry) {
  return completedSets(entry).reduce((sum, s) => sum + setVolume(entry, s), 0);
}

export function sessionVolume(session) {
  return session.entries.reduce((sum, e) => sum + entryVolume(e), 0);
}

export function sessionSetCount(session) {
  return session.entries.reduce((sum, e) => sum + completedSets(e).length, 0);
}

export function sessionTargetSetCount(session) {
  return session.entries.reduce((sum, e) => sum + e.sets.length, 0);
}

// Epley — uppskattat 1RM. Bara en jämförelsesiffra, aldrig något att testa maxa mot.
export function estimated1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

// Läsbar sammanfattning av ett set: "60 kg × 6", "30 s", "40 m · 24 kg".
export function setLabel(entry, set) {
  const parts = [];
  if (set.weight != null && entry.metric !== 'distance') parts.push(`${set.weight} kg`);
  if (set.reps != null) parts.push(`${set.reps} reps`);
  if (set.seconds != null) parts.push(`${set.seconds} s`);
  if (set.meters != null) parts.push(`${set.meters} m`);
  if (set.weight != null && entry.metric === 'distance') parts.push(`${set.weight} kg`);
  if (set.rir != null) parts.push(`RIR ${set.rir}`);
  return parts.join(' · ') || '—';
}

// ---- små hjälpare ----

function numOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
