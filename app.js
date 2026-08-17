// app.js — Appskal: navigering, datahämtning och uppstart.
// Vyerna ligger i view-*.js och får ett ctx-objekt med all data + hjälpare.

import {
  getExercises, getRoutines, getSessions, getCheckins,
  getMeta, setMeta, requestPersistentStorage,
} from './db.js';
import { normalizeSession, ROUTINE_TYPES } from './model.js';
import { loadDefaultProgram } from './load-program.js';
import { backupReminder } from './backup.js';
import { today } from './model.js';
import { el, clearNode } from './ui.js';
import { renderTrain } from './view-train.js';
import { renderRoutines } from './view-routines.js';
import { renderExercises } from './view-exercises.js';
import { renderStats } from './view-stats.js';
import {
  renderMore, renderProgram, renderSports, renderNutrition, renderShoulder, renderBackup,
} from './view-more.js';

const appEl = document.getElementById('app');
const titleEl = document.getElementById('view-title');
const backBtn = document.getElementById('back-btn');
const reminderEl = document.getElementById('reminder');
const headerEl = document.querySelector('.app-header');

// Headern är sticky men har varierande höjd: titeln kan vara olika hög, en
// bakåtknapp kan finnas och backup-påminnelsen kommer och går. Element som ska
// fästa strax under den (passöversikten) behöver höjden, så den exponeras som
// CSS-variabel och hålls uppdaterad.
function syncHeaderHeight() {
  const h = Math.round(headerEl.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
}

if ('ResizeObserver' in window) {
  new ResizeObserver(syncHeaderHeight).observe(headerEl);
} else {
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('orientationchange', syncHeaderHeight);
}
syncHeaderHeight();

// Undervyer under Mer-fliken → navknappen "Mer" är aktiv och en bakåtknapp visas.
const SUBVIEWS = {
  program: 'more',
  sports: 'more',
  nutrition: 'more',
  shoulder: 'more',
  backup: 'more',
};

const VIEWS = {
  train: renderTrain,
  routines: renderRoutines,
  exercises: renderExercises,
  stats: renderStats,
  more: renderMore,
  program: renderProgram,
  sports: renderSports,
  nutrition: renderNutrition,
  shoulder: renderShoulder,
  backup: renderBackup,
};

let currentView = 'train';

function setView(view) {
  if (!VIEWS[view]) return;
  currentView = view;
  window.scrollTo(0, 0);
  render();
}

document.querySelectorAll('.nav-btn').forEach((b) => {
  b.addEventListener('click', () => setView(b.dataset.view));
});

backBtn.addEventListener('click', () => setView(SUBVIEWS[currentView] || 'train'));

async function buildContext() {
  const [exercises, routines, rawSessions, checkins] = await Promise.all([
    getExercises(), getRoutines(), getSessions(), getCheckins(),
  ]);
  const sessions = rawSessions.map(normalizeSession);
  const ctx = {
    exercises,
    routines,
    sessions,
    checkins,
    exercisesById: new Map(exercises.map((e) => [e.id, e])),
    routinesById: new Map(routines.map((r) => [r.id, r])),
    programStartDate: await getMeta('programStartDate', null),
    bodyWeight: await getMeta('bodyWeight', null),
    lastExportAt: await getMeta('lastExportAt', null),
    render,
    setView,
    setTitle: (t) => { titleEl.textContent = t; },
    routineTypeLabel: (t) => ROUTINE_TYPES[t] || t,
  };
  return ctx;
}

async function render() {
  const ctx = await buildContext();

  // Navigeringens aktiva flik (undervyer markerar sin förälder).
  const navView = SUBVIEWS[currentView] || currentView;
  const hasActiveSession = ctx.sessions.some((s) => s.status === 'active');
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === navView);
    if (b.dataset.view === 'train') b.classList.toggle('has-active', hasActiveSession);
  });
  backBtn.classList.toggle('hidden', !SUBVIEWS[currentView]);

  // Ingen backup-påminnelse mitt i ett pass — den ska inte störa träningen.
  await refreshReminder(ctx, hasActiveSession);

  clearNode(appEl);
  const out = VIEWS[currentView](appEl, ctx);
  if (out instanceof Promise) await out;

  // Genväg tillbaka till ett pågående pass från andra vyer.
  if (hasActiveSession && currentView !== 'train') showActivePill();
  else hideActivePill();
}

let pill = null;

function showActivePill() {
  if (pill) return;
  pill = el('button', {
    class: 'active-pill', type: 'button', onclick: () => setView('train'),
  }, '● Pågående pass — fortsätt');
  document.body.appendChild(pill);
}

function hideActivePill() {
  if (pill) { pill.remove(); pill = null; }
}

async function refreshReminder(ctx, suppress) {
  const r = suppress ? { due: false } : await backupReminder({
    ...ctx,
    sessions: ctx.sessions.filter((s) => s.status === 'done'),
  });
  clearNode(reminderEl);
  if (!r.due) {
    reminderEl.classList.add('hidden');
    return;
  }
  reminderEl.classList.remove('hidden');
  reminderEl.appendChild(el('span', {}, `💾 ${r.reason}`));
  reminderEl.appendChild(el('button', {
    type: 'button', onclick: () => setView('backup'),
  }, 'Backa upp'));
}

// =====================================================================
//  Uppstart
// =====================================================================

async function boot() {
  // Be om beständig lagring vid första start (viktigt mot iOS-rensning).
  if (!(await getMeta('persistAsked', false))) {
    await requestPersistentStorage();
    await setMeta('persistAsked', true);
  }

  // Första starten: läs in standardprogrammet och sätt igång 12-veckorsblocket.
  if (!(await getMeta('programLoaded', false))) {
    await loadDefaultProgram();
    await setMeta('programLoaded', true);
    if (!(await getMeta('programStartDate', null))) {
      await setMeta('programStartDate', today());
    }
  }

  await render();

  // Registrera service worker (relativ sökväg → fungerar på subpath).
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (err) {
      console.warn('SW-registrering misslyckades:', err);
    }
  }
}

boot();
