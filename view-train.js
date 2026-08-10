// view-train.js — Träna: dagens pass, pågående pass och loggning av set.
// Pågående pass sparas löpande i IndexedDB (status 'active') så inget tappas
// om appen stängs mitt i ett pass.

import { putSession, deleteSession } from './db.js';
import {
  createSession, createEntry, createSet, metricFields, FIELD_SHORT,
  setIsLogged, completedSets, sessionVolume, sessionSetCount, sessionTargetSetCount,
  setLabel, numOrNull, today,
} from './model.js';
import { planForToday, isoDay, programStatus } from './program.js';
import {
  doneSessions, lastPerformance, byDateDesc, formatVolume, formatDate, formatDuration,
} from './stats.js';
import {
  el, clearNode, toast, openModal, confirmModal, emptyState, panel, chip, numInput, select,
} from './ui.js';
import { exerciseInfoBody, exercisePickerModal } from './view-exercises.js';
import { exerciseLinks } from './exercise-links.js';

// Vila sedan senaste avklarade set. Nollställs när passet startar/avslutas.
let lastSetAt = null;
let tickTimer = null;

// Fördröjd sparning av pågående pass. Timern ligger i modulen (inte i vyns
// closure) så den kan avbrytas när passet avslutas eller kastas — annars kan en
// väntande skrivning återuppliva ett pass som just tagits bort.
let saveTimer = null;

function scheduleSave(session) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; putSession(session); }, 400);
}

function cancelSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
}

export function renderTrain(app, ctx) {
  const active = ctx.sessions.find((s) => s.status === 'active');
  if (active) {
    ctx.setTitle(active.name);
    renderActiveSession(app, ctx, active);
  } else {
    ctx.setTitle('Träna');
    renderStart(app, ctx);
  }
}

// =====================================================================
//  Startvy — dagens pass enligt programmet
// =====================================================================

function renderStart(app, ctx) {
  const status = programStatus(ctx.programStartDate);

  app.appendChild(programBanner(ctx, status));

  const plan = planForToday();
  const dayRoutine = plan.routineId ? ctx.routinesById.get(plan.routineId) : null;
  const doneToday = doneSessions(ctx.sessions).filter((s) => s.date === today());

  // ---- Dagens pass ----
  const dayCard = el('div', { class: 'panel day-card' }, [
    el('div', { class: 'day-head' }, [
      el('div', {}, [
        el('div', { class: 'day-label' }, `${plan.name} · dagens plan`),
        el('div', { class: 'day-main' }, plan.main),
        el('div', { class: 'muted small' }, plan.comment),
      ]),
    ]),
  ]);

  if (dayRoutine) {
    const deload = status.phase && status.phase.deload;
    dayCard.appendChild(el('div', { class: 'muted small', style: 'margin:10px 0 4px;' },
      `${dayRoutine.items.length} övningar · ${dayRoutine.name}`));
    if (deload) {
      dayCard.appendChild(el('button', {
        class: 'btn primary', type: 'button',
        onclick: () => startSession(ctx, dayRoutine, status.week, true),
      }, '▶ Starta (lätt vecka)'));
      dayCard.appendChild(el('button', {
        class: 'btn ghost', type: 'button', style: 'margin-top:8px;',
        onclick: () => startSession(ctx, dayRoutine, status.week, false),
      }, 'Starta full volym'));
    } else {
      dayCard.appendChild(el('button', {
        class: 'btn primary', type: 'button',
        onclick: () => startSession(ctx, dayRoutine, status.week, false),
      }, '▶ Starta passet'));
    }
  } else {
    dayCard.appendChild(el('p', { class: 'muted small', style: 'margin-bottom:0;' },
      'Ingen gymrutin planerad idag. Välj fritt nedan om du ändå vill logga något.'));
  }

  if (doneToday.length) {
    dayCard.appendChild(el('div', { class: 'done-today' },
      `✅ Idag: ${doneToday.map((s) => s.name).join(', ')}`));
  }
  app.appendChild(dayCard);

  // ---- Dagliga block ----
  const daily = ['rt-shoulder', 'rt-mobility']
    .map((id) => ctx.routinesById.get(id))
    .filter(Boolean);
  if (daily.length) {
    const row = el('div', { class: 'quick-row' });
    for (const r of daily) {
      const didToday = doneToday.some((s) => s.routineId === r.id);
      row.appendChild(el('button', {
        class: `btn ghost quick${didToday ? ' done' : ''}`, type: 'button',
        onclick: () => startSession(ctx, r, status.week, false),
      }, `${didToday ? '✅' : '＋'} ${r.name}`));
    }
    app.appendChild(panel('Dagligen', [
      el('p', { class: 'muted small', style: 'margin-top:0;' },
        'Axelblocket 4-6 dagar per vecka, rörlighet dagligen.'),
      row,
    ]));
  }

  // ---- Övriga rutiner ----
  const others = ctx.routines.filter((r) => !daily.includes(r) && r.id !== (dayRoutine && dayRoutine.id));
  const list = el('div', { class: 'row-list' });
  for (const r of [...others].sort((a, b) => a.name.localeCompare(b.name, 'sv'))) {
    list.appendChild(el('button', {
      class: 'row-btn', type: 'button',
      onclick: () => startSession(ctx, r, status.week, false),
    }, [
      el('div', { class: 'rb-main' }, [
        el('div', { class: 'rb-title' }, r.name),
        el('div', { class: 'rb-sub' }, `${ctx.routineTypeLabel(r.type)} · ${r.items.length} övningar`),
      ]),
      el('span', { class: 'rb-go' }, '▶'),
    ]));
  }
  list.appendChild(el('button', {
    class: 'row-btn', type: 'button',
    onclick: () => startFreeSession(ctx, status.week),
  }, [
    el('div', { class: 'rb-main' }, [
      el('div', { class: 'rb-title' }, 'Fritt pass'),
      el('div', { class: 'rb-sub' }, 'Bygg passet medan du kör'),
    ]),
    el('span', { class: 'rb-go' }, '▶'),
  ]));
  app.appendChild(panel('Starta annat pass', list));

  // ---- Senaste passen ----
  const recent = byDateDesc(doneSessions(ctx.sessions)).slice(0, 5);
  if (recent.length) {
    const rl = el('div', { class: 'row-list' });
    for (const s of recent) {
      rl.appendChild(el('button', {
        class: 'row-btn', type: 'button',
        onclick: () => openSessionDetail(ctx, s),
      }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, s.name),
          el('div', { class: 'rb-sub' },
            `${formatDate(s.date)} · ${sessionSetCount(s)} set${sessionVolume(s) ? ` · ${formatVolume(sessionVolume(s))}` : ''}`),
        ]),
        el('span', { class: 'rb-go' }, '›'),
      ]));
    }
    app.appendChild(panel('Senaste passen', rl));
  }
}

function programBanner(ctx, status) {
  if (!status.started) {
    return panel('Programmet', [
      el('p', { class: 'muted', style: 'margin-top:0;' },
        'Sätt en startdag för 12-veckorsblocket så visas rätt vecka, fas och belastning här.'),
      el('button', {
        class: 'btn ghost', type: 'button', onclick: () => ctx.setView('program'),
      }, 'Starta programmet'),
    ]);
  }
  if (status.finished) {
    return el('div', { class: 'week-banner done' }, [
      el('div', { class: 'wb-week' }, `Vecka ${status.week}`),
      el('div', { class: 'wb-text' }, [
        el('strong', {}, '12-veckorsblocket är klart'),
        el('div', { class: 'small' }, 'Starta om blocket under Program för att börja en ny cykel.'),
      ]),
    ]);
  }
  const p = status.phase;
  return el('div', { class: `week-banner${p.deload ? ' deload' : ''}` }, [
    el('div', { class: 'wb-week' }, [
      el('div', { class: 'wb-num' }, String(status.week)),
      el('div', { class: 'wb-of' }, 'av 12'),
    ]),
    el('div', { class: 'wb-text' }, [
      el('strong', {}, p.focus),
      el('div', { class: 'small' }, p.intensity + (p.deload ? ' · minska arbetsset 40-50 %' : '')),
    ]),
  ]);
}

// =====================================================================
//  Starta pass
// =====================================================================

async function startSession(ctx, routine, week, deload) {
  const session = createSession(routine, ctx.exercisesById, week ?? null);
  if (!session.entries.length) {
    toast('Rutinen har inga övningar.');
    return;
  }
  if (deload) applyDeload(session);
  cancelSave();
  lastSetAt = null;
  await putSession(session);
  await ctx.render();
}

async function startFreeSession(ctx, week) {
  const session = createSession(null, ctx.exercisesById, week ?? null);
  cancelSave();
  lastSetAt = null;
  await putSession(session);
  await ctx.render();
}

// Lätt vecka: minska antalet arbetsset med cirka 45 % (aldrig under 1).
function applyDeload(session) {
  session.deload = true;
  for (const e of session.entries) {
    const target = Math.max(1, Math.round(e.targetSets * 0.55));
    e.targetSets = target;
    e.sets = e.sets.slice(0, target);
  }
}

// =====================================================================
//  Pågående pass
// =====================================================================

function renderActiveSession(app, ctx, session) {
  const history = doneSessions(ctx.sessions);

  // Sparar löpande, men bara efter en kort paus så skrivningarna inte blir en per tangenttryck.
  const save = () => scheduleSave(session);

  const totalSets = sessionTargetSetCount(session);
  const doneSets = sessionSetCount(session);

  app.appendChild(el('div', { class: 'session-bar' }, [
    el('div', {}, [
      el('div', { class: 'sb-title' }, session.name),
      el('div', { class: 'sb-sub', id: 'sb-sub' },
        sessionSubtitle(session, doneSets, totalSets)),
    ]),
    el('div', { class: 'sb-timer', id: 'sb-timer' }, elapsedLabel(session)),
  ]));

  if (session.deload) {
    app.appendChild(el('div', { class: 'note warn' }, 'Lätt vecka — arbetsset är nedskalade.'));
  }

  const progress = el('div', { class: 'progress-track' }, [
    el('div', {
      class: 'progress-fill', id: 'session-progress',
      style: `width:${totalSets ? (doneSets / totalSets) * 100 : 0}%`,
    }),
  ]);
  app.appendChild(progress);

  const updateProgress = () => {
    const done = sessionSetCount(session);
    const total = sessionTargetSetCount(session);
    const fill = document.getElementById('session-progress');
    if (fill) fill.style.width = `${total ? (done / total) * 100 : 0}%`;
    const sub = document.getElementById('sb-sub');
    if (sub) sub.textContent = sessionSubtitle(session, done, total);
  };

  // ---- Övningarna ----
  for (const [i, entry] of session.entries.entries()) {
    app.appendChild(entryCard(ctx, session, entry, i, history, save, updateProgress));
  }

  app.appendChild(el('button', {
    class: 'btn ghost', type: 'button', style: 'margin-top:4px;',
    onclick: () => addExerciseToSession(ctx, session),
  }, '＋ Lägg till övning'));

  // ---- Anteckning ----
  const noteInput = el('textarea', { placeholder: 'Anteckning om passet (valfri)' });
  noteInput.value = session.notes || '';
  noteInput.addEventListener('input', () => { session.notes = noteInput.value; save(); });
  app.appendChild(panel('Anteckning', noteInput));

  // ---- Avsluta ----
  app.appendChild(el('div', { class: 'btn-row', style: 'margin-bottom:8px;' }, [
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => confirmModal({
        title: 'Avbryt passet?',
        text: 'Passet kastas och ingenting sparas i historiken.',
        confirmLabel: 'Avbryt passet',
        onConfirm: async () => {
          cancelSave();
          await deleteSession(session.id);
          lastSetAt = null;
          stopTicker();
          toast('Passet avbrutet.');
          await ctx.render();
        },
      }),
    }, 'Avbryt'),
    el('button', {
      class: 'btn green', type: 'button',
      onclick: () => finishSession(ctx, session),
    }, '✓ Avsluta pass'),
  ]));

  startTicker(session);
}

function sessionSubtitle(session, doneSets, totalSets) {
  const vol = sessionVolume(session);
  return `${doneSets}/${totalSets} set${vol ? ` · ${formatVolume(vol)}` : ''}`;
}

function entryCard(ctx, session, entry, index, history, save, updateProgress) {
  const exercise = ctx.exercisesById.get(entry.exerciseId);
  const last = lastPerformance(history, entry.exerciseId);
  const card = el('div', { class: 'panel entry-card' });

  const head = el('div', { class: 'entry-head' }, [
    el('button', {
      class: 'entry-name', type: 'button',
      onclick: () => openExerciseInfo(exercise, entry),
    }, [
      el('span', {}, entry.name),
      exercise && exercise.shoulderRule ? el('span', { class: 'shoulder-dot', title: 'Axelregel gäller' }, '⚠') : null,
      el('span', { class: 'info-i' }, 'ⓘ'),
    ]),
    // Ett tryck till teknikklipp utan att lämna passet.
    videoLink(exercise),
    el('button', {
      class: 'entry-del', type: 'button', title: 'Ta bort från passet',
      onclick: () => {
        const drop = async () => {
          cancelSave();
          session.entries.splice(index, 1);
          await putSession(session);
          await ctx.render();
        };
        // Loggade set ska inte kunna försvinna på en feltryckning.
        if (completedSets(entry).length) {
          confirmModal({
            title: 'Ta bort övningen?',
            text: `${entry.name} har ${completedSets(entry).length} loggade set som då försvinner ur passet.`,
            onConfirm: drop,
          });
        } else {
          drop();
        }
      },
    }, '✕'),
  ]);
  card.appendChild(head);

  const target = entry.targetReps
    ? `Mål: ${entry.targetSets} × ${entry.targetReps}${unitSuffix(entry)}${entry.perSide ? '/sida' : ''}`
    : `Mål: ${entry.targetSets} set`;
  card.appendChild(el('div', { class: 'entry-target' }, [
    chip(target),
    entry.perSide ? chip('per sida', 'alt') : null,
  ]));

  if (last) {
    card.appendChild(el('div', { class: 'entry-last' },
      `Senast ${formatDate(last.date)}: ${last.sets.map((s) => setLabel(last.entry, s)).join(' | ')}`));
  }
  if (entry.notes) card.appendChild(el('div', { class: 'muted small' }, entry.notes));

  const setsWrap = el('div', { class: 'sets' });
  card.appendChild(setsWrap);

  const drawSets = () => {
    clearNode(setsWrap);
    entry.sets.forEach((set, i) => {
      setsWrap.appendChild(setRow(entry, set, i, last, save, updateProgress, () => {
        entry.sets.splice(i, 1);
        entry.targetSets = Math.max(entry.sets.length, 1);
        drawSets();
        save();
        updateProgress();
      }));
    });
    setsWrap.appendChild(el('button', {
      class: 'btn ghost small add-set', type: 'button',
      onclick: () => {
        const prev = entry.sets[entry.sets.length - 1];
        entry.sets.push(createSet(prev ? { weight: prev.weight, reps: prev.reps, seconds: prev.seconds, meters: prev.meters } : {}));
        drawSets();
        save();
        updateProgress();
      },
    }, '＋ set'));
  };
  drawSets();

  return card;
}

function unitSuffix(entry) {
  return entry.metric === 'time' ? ' s' : entry.metric === 'distance' ? ' m' : '';
}

function setRow(entry, set, i, last, save, updateProgress, onRemove) {
  const row = el('div', { class: `set-row${set.done ? ' done' : ''}` });
  row.appendChild(el('div', { class: 'set-num' }, String(i + 1)));

  const lastSet = last && last.sets[i] ? last.sets[i] : null;
  const inputs = {};

  for (const f of metricFields(entry.metric)) {
    // Vikt är valfri för distansövningar (bärningar loggas ibland utan vikt).
    const optional = entry.metric === 'distance' && f === 'weight';
    const inp = numInput(set[f], {
      decimal: f === 'weight',
      placeholder: lastSet && lastSet[f] != null ? String(lastSet[f]) : (optional ? 'kg' : ''),
      class: 'set-input',
    });
    inp.addEventListener('input', () => {
      set[f] = numOrNull(inp.value);
      save();
      updateProgress();
    });
    inputs[f] = inp;
    row.appendChild(el('div', { class: 'set-field' }, [
      inp, el('span', { class: 'unit' }, FIELD_SHORT[f]),
    ]));
  }

  // RIR är valfritt men det som styr belastningen i programmet.
  const rirInput = numInput(set.rir, { max: 5, placeholder: '–', class: 'set-input rir' });
  rirInput.addEventListener('input', () => { set.rir = numOrNull(rirInput.value); save(); });
  row.appendChild(el('div', { class: 'set-field' }, [
    rirInput, el('span', { class: 'unit' }, 'RIR'),
  ]));

  const check = el('button', {
    class: 'set-check', type: 'button', title: 'Klart',
    onclick: () => {
      if (!set.done) {
        // Tomt set + värde från förra gången → fyll i det automatiskt.
        for (const f of metricFields(entry.metric)) {
          if (set[f] == null && lastSet && lastSet[f] != null) {
            set[f] = lastSet[f];
            inputs[f].value = String(lastSet[f]);
          }
        }
        set.done = true;
        lastSetAt = Date.now();
      } else {
        set.done = false;
      }
      row.classList.toggle('done', set.done);
      check.textContent = set.done ? '✓' : '○';
      save();
      updateProgress();
    },
  }, set.done ? '✓' : '○');
  row.appendChild(check);

  row.appendChild(el('button', {
    class: 'set-del', type: 'button', title: 'Ta bort set', onclick: onRemove,
  }, '−'));

  return row;
}

// Direktlänk till första länken (egen länk om den finns, annars videosökning).
function videoLink(exercise) {
  if (!exercise) return null;
  const [first] = exerciseLinks(exercise);
  if (!first) return null;
  return el('a', {
    class: 'entry-video', href: first.url, target: '_blank', rel: 'noopener noreferrer',
    title: `${first.label} — ${exercise.name}`,
  }, '▶');
}

function openExerciseInfo(exercise, entry) {
  const { body } = openModal(entry ? entry.name : exercise.name);
  if (!exercise) {
    body.appendChild(el('p', { class: 'muted' }, 'Övningen finns inte längre i biblioteket.'));
    return;
  }
  body.appendChild(exerciseInfoBody(exercise));
}

function addExerciseToSession(ctx, session) {
  exercisePickerModal(ctx, {
    title: 'Lägg till övning',
    exclude: new Set(session.entries.map((e) => e.exerciseId)),
    onPick: async (exercise) => {
      const entry = createEntry(exercise, { sets: exercise.defaultSets, reps: exercise.defaultReps });
      session.entries.push(entry);
      await putSession(session);
      await ctx.render();
    },
  });
}

async function finishSession(ctx, session) {
  const logged = sessionSetCount(session);
  if (logged === 0) {
    toast('Inga set loggade ännu.');
    return;
  }
  cancelSave();
  // Rensa bort set som aldrig fylldes i, så statistiken bara ser verkligt arbete.
  for (const e of session.entries) {
    e.sets = e.sets.filter(setIsLogged);
  }
  session.entries = session.entries.filter((e) => e.sets.length > 0);
  session.status = 'done';
  session.finishedAt = new Date().toISOString();
  await putSession(session);
  lastSetAt = null;
  stopTicker();
  toast(`Pass sparat: ${logged} set${sessionVolume(session) ? `, ${formatVolume(sessionVolume(session))}` : ''}.`);
  await ctx.render();
}

// =====================================================================
//  Passdetaljer (historik)
// =====================================================================

export function openSessionDetail(ctx, session) {
  const { body, close } = openModal(session.name, { wide: true });
  body.appendChild(el('div', { class: 'muted small' },
    `${formatDate(session.date)}${session.programWeek ? ` · programvecka ${session.programWeek}` : ''}${session.deload ? ' · lätt vecka' : ''}`));

  const dur = session.finishedAt && session.startedAt
    ? Math.round((Date.parse(session.finishedAt) - Date.parse(session.startedAt)) / 1000) : null;
  body.appendChild(el('div', { class: 'stat-grid compact', style: 'margin:12px 0;' }, [
    miniStat(String(sessionSetCount(session)), 'set'),
    miniStat(formatVolume(sessionVolume(session)), 'volym'),
    miniStat(dur ? formatDuration(dur) : '—', 'tid'),
  ]));

  for (const e of session.entries) {
    const rows = e.sets.map((s, i) => el('div', { class: 'hist-set' }, [
      el('span', { class: 'hs-num' }, String(i + 1)),
      el('span', {}, setLabel(e, s)),
    ]));
    body.appendChild(el('div', { class: 'hist-entry' }, [
      el('div', { class: 'hist-name' }, e.name + (e.perSide ? ' (per sida)' : '')),
      ...rows,
    ]));
  }

  if (session.notes) {
    body.appendChild(el('p', { class: 'muted', style: 'white-space:pre-wrap;' }, session.notes));
  }

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => {
        close();
        confirmModal({
          title: 'Ta bort passet?',
          text: `${session.name} den ${formatDate(session.date)} tas bort permanent.`,
          onConfirm: async () => {
            await deleteSession(session.id);
            toast('Pass borttaget.');
            await ctx.render();
          },
        });
      },
    }, '🗑 Ta bort'),
    el('button', { class: 'btn primary', type: 'button', onclick: close }, 'Stäng'),
  ]));
}

function miniStat(num, lbl) {
  return el('div', { class: 'stat-box' }, [
    el('div', { class: 'num small' }, num),
    el('div', { class: 'lbl' }, lbl),
  ]);
}

// =====================================================================
//  Tidräkning — passtid och vila sedan senaste set
// =====================================================================

function elapsedLabel(session) {
  const since = Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000);
  const rest = lastSetAt ? Math.floor((Date.now() - lastSetAt) / 1000) : null;
  return rest != null && rest < 600 ? `⏱ ${mmss(since)} · vila ${mmss(rest)}` : `⏱ ${mmss(since)}`;
}

function mmss(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function startTicker(session) {
  stopTicker();
  tickTimer = setInterval(() => {
    const node = document.getElementById('sb-timer');
    if (!node) { stopTicker(); return; }  // vyn har bytts — sluta ticka
    node.textContent = elapsedLabel(session);
  }, 1000);
}

function stopTicker() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}
