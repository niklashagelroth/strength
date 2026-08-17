// stats.js — Beräkningar över loggade pass: volym, rekord, historik per övning.
// Allt läser bara sessions-listan; ingen egen lagring.

import {
  completedSets, entryVolume, sessionVolume, sessionSetCount,
  estimated1RM, setIsLogged, dateKey,
} from './model.js';

export function doneSessions(sessions) {
  return sessions.filter((s) => s.status === 'done');
}

// Alla loggade pass, nyast först.
export function byDateDesc(sessions) {
  return [...sessions].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') ||
    Date.parse(b.startedAt || 0) - Date.parse(a.startedAt || 0));
}

// ---- Vecka ----

// Måndagen i veckan som datumet ligger i, som YYYY-MM-DD.
export function weekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const iso = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (iso - 1));
  return dateKey(d);
}

// Volym, pass och set per vecka. Returnerar nyaste veckan först.
export function weeklyTotals(sessions, weeks = 8) {
  const map = new Map();
  for (const s of doneSessions(sessions)) {
    const key = weekStart(s.date);
    const row = map.get(key) || { week: key, sessions: 0, sets: 0, volume: 0, byType: {} };
    row.sessions++;
    row.sets += sessionSetCount(s);
    row.volume += sessionVolume(s);
    row.byType[s.type] = (row.byType[s.type] || 0) + 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.week.localeCompare(a.week)).slice(0, weeks);
}

export function sessionsInCurrentWeek(sessions, now = new Date()) {
  const key = weekStart(dateKey(now));
  return doneSessions(sessions).filter((s) => weekStart(s.date) === key);
}

// ---- Per övning ----

// Historik för en övning: ett inlägg per pass där den loggades, nyast först.
export function exerciseHistory(sessions, exerciseId) {
  const rows = [];
  for (const s of doneSessions(sessions)) {
    for (const e of s.entries) {
      if (e.exerciseId !== exerciseId) continue;
      const sets = completedSets(e);
      if (!sets.length) continue;
      rows.push({
        date: s.date,
        sessionName: s.name,
        programWeek: s.programWeek,
        entry: e,
        sets,
        volume: entryVolume(e),
        top: topSet(e),
      });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

// Senast loggade set för en övning — används för att förifylla nästa pass.
export function lastPerformance(sessions, exerciseId) {
  const hist = exerciseHistory(sessions, exerciseId);
  return hist.length ? hist[0] : null;
}

// "Bästa" set i ett inlägg beror på mätsättet.
export function topSet(entry) {
  const sets = completedSets(entry);
  if (!sets.length) return null;
  const score = (s) => {
    if (entry.metric === 'weight_reps') return estimated1RM(s.weight, s.reps);
    if (entry.metric === 'time') return s.seconds || 0;
    if (entry.metric === 'distance') return (s.meters || 0) * (1 + (s.weight || 0) / 100);
    return s.reps || 0;
  };
  return sets.reduce((best, s) => (score(s) > score(best) ? s : best), sets[0]);
}

// Personbästa per övning över hela historiken.
export function personalBest(sessions, exerciseId) {
  const hist = exerciseHistory(sessions, exerciseId);
  if (!hist.length) return null;
  let best = null;
  for (const row of hist) {
    const s = row.top;
    if (!s) continue;
    const metric = row.entry.metric;
    const score = metric === 'weight_reps' ? estimated1RM(s.weight, s.reps)
      : metric === 'time' ? (s.seconds || 0)
      : metric === 'distance' ? (s.meters || 0)
      : (s.reps || 0);
    if (!best || score > best.score) {
      best = { score, set: s, date: row.date, metric, entry: row.entry };
    }
  }
  return best;
}

// Topplista över tyngsta lyften (uppskattat 1RM), en rad per övning.
export function prList(sessions, limit = 10) {
  const seen = new Map();
  for (const s of doneSessions(sessions)) {
    for (const e of s.entries) {
      if (e.metric !== 'weight_reps') continue;
      for (const set of completedSets(e)) {
        const e1rm = estimated1RM(set.weight, set.reps);
        if (!e1rm) continue;
        const prev = seen.get(e.exerciseId);
        if (!prev || e1rm > prev.e1rm) {
          seen.set(e.exerciseId, {
            exerciseId: e.exerciseId, name: e.name, e1rm,
            weight: set.weight, reps: set.reps, date: s.date, perSide: e.perSide,
          });
        }
      }
    }
  }
  return [...seen.values()].sort((a, b) => b.e1rm - a.e1rm).slice(0, limit);
}

// ---- Översikt ----

export function summarize(sessions, now = new Date()) {
  const done = doneSessions(sessions);
  const thisWeek = sessionsInCurrentWeek(sessions, now);
  return {
    total: done.length,
    thisWeek: thisWeek.length,
    thisWeekVolume: thisWeek.reduce((sum, s) => sum + sessionVolume(s), 0),
    totalVolume: done.reduce((sum, s) => sum + sessionVolume(s), 0),
    totalSets: done.reduce((sum, s) => sum + sessionSetCount(s), 0),
    strengthThisWeek: thisWeek.filter((s) => s.type === 'styrka').length,
    lastSession: byDateDesc(done)[0] || null,
  };
}

// Antal dagar i följd (bakåt från idag) med minst ett loggat pass.
export function streakDays(sessions, now = new Date()) {
  const days = new Set(doneSessions(sessions).map((s) => s.date));
  let streak = 0;
  const d = new Date(now);
  // Idag räknas bara om det finns ett pass; annars börjar vi räkna från igår.
  if (!days.has(dateKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Har alla set i passet loggats?
export function sessionIsComplete(session) {
  return session.entries.every((e) => e.sets.every(setIsLogged));
}

export function formatVolume(kg) {
  if (!kg) return '0 kg';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} ton`;
  return `${Math.round(kg)} kg`;
}

// Klockformat, t.ex. "0:07" eller "12:34". Används av passtiden och nedräkningen.
export function mmss(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDuration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m === 0) return `${s} s`;
  return s ? `${m} min ${s} s` : `${m} min`;
}

export function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
