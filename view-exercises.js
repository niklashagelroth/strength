// view-exercises.js — Övningsbiblioteket: sök, filtrera, skapa, redigera, ta bort.
// Exporterar även övningsinfo och väljardialog som andra vyer återanvänder.

import { putExercise, deleteExercise, putRoutine } from './db.js';
import {
  createExercise, normalizeExercise, CATEGORIES, METRICS, numOrNull,
} from './model.js';
import {
  exerciseHistory, personalBest, formatDate, formatVolume,
} from './stats.js';
import { setLabel, estimated1RM } from './model.js';
import { exerciseLinks } from './exercise-links.js';
import {
  el, clearNode, toast, openModal, confirmModal, emptyState, panel, chip,
  field, select, numInput,
} from './ui.js';

let search = '';
let categoryFilter = 'alla';

export function renderExercises(app, ctx) {
  ctx.setTitle('Övningar');

  app.appendChild(el('button', {
    class: 'btn primary', type: 'button', onclick: () => openExerciseForm(ctx, null),
  }, '＋ Ny övning'));

  // Filterrad
  const filters = el('div', { class: 'chip-row' });
  const cats = [['alla', 'Alla'], ...Object.entries(CATEGORIES)];
  for (const [key, label] of cats) {
    const count = key === 'alla'
      ? ctx.exercises.length
      : ctx.exercises.filter((e) => e.category === key).length;
    if (count === 0 && key !== 'alla') continue;
    filters.appendChild(el('button', {
      class: `chip-btn${categoryFilter === key ? ' active' : ''}`, type: 'button',
      onclick: () => { categoryFilter = key; drawList(); },
    }, `${label} ${count}`));
  }
  app.appendChild(filters);

  const searchInput = el('input', {
    type: 'search', placeholder: 'Sök övning, utrustning, nyckelpunkt…', value: search,
  });
  searchInput.addEventListener('input', () => { search = searchInput.value; drawList(); });
  app.appendChild(el('div', { class: 'search-row' }, searchInput));

  const wrap = el('div');
  app.appendChild(wrap);

  function drawList() {
    // Rita om filterknapparnas aktiva läge utan att bygga hela vyn på nytt.
    filters.querySelectorAll('.chip-btn').forEach((b, i) => {
      b.classList.toggle('active', cats[i] && cats[i][0] === categoryFilter);
    });
    clearNode(wrap);
    const list = filterExercises(ctx.exercises, search, categoryFilter);
    if (!ctx.exercises.length) {
      wrap.appendChild(emptyState('🗂️', 'Inga övningar',
        'Läs in standardprogrammet under Program, eller lägg till en egen övning.'));
      return;
    }
    if (!list.length) {
      wrap.appendChild(el('p', { class: 'muted center', style: 'margin-top:20px;' }, 'Inga träffar.'));
      return;
    }
    const listEl = el('div', { class: 'row-list' });
    for (const ex of list) {
      const pb = personalBest(ctx.sessions, ex.id);
      listEl.appendChild(el('button', {
        class: 'row-btn', type: 'button', onclick: () => openExerciseDetail(ctx, ex),
      }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, [
            ex.name,
            ex.shoulderRule ? el('span', { class: 'shoulder-dot' }, '⚠') : null,
          ]),
          el('div', { class: 'rb-sub' }, [
            CATEGORIES[ex.category],
            ' · ',
            doseText(ex),
            ex.perSide ? ' /sida' : '',
            pb ? ` · PB ${pbText(pb)}` : '',
          ].join('')),
        ]),
        el('span', { class: 'rb-go' }, '›'),
      ]));
    }
    wrap.appendChild(listEl);
  }

  drawList();
}

export function filterExercises(exercises, q, category) {
  const needle = (q || '').trim().toLowerCase();
  return exercises
    .filter((e) => category === 'alla' || e.category === category)
    .filter((e) => !needle || [e.name, e.equipment, e.keyPoint, e.howTo, e.notes]
      .some((f) => (f || '').toLowerCase().includes(needle)))
    .sort((a, b) => a.name.localeCompare(b.name, 'sv'));
}

function doseText(ex) {
  const unit = ex.metric === 'time' ? ' s' : ex.metric === 'distance' ? ' m' : '';
  return ex.defaultReps ? `${ex.defaultSets} × ${ex.defaultReps}${unit}` : `${ex.defaultSets} set`;
}

function pbText(pb) {
  if (pb.metric === 'weight_reps') return `${pb.set.weight} kg × ${pb.set.reps}`;
  if (pb.metric === 'time') return `${pb.set.seconds} s`;
  if (pb.metric === 'distance') return `${pb.set.meters} m`;
  return `${pb.set.reps} reps`;
}

// =====================================================================
//  Info + detalj
// =====================================================================

// Delas med Träna-vyn: instruktion, nyckelpunkt och axelregel.
export function exerciseInfoBody(ex) {
  const wrap = el('div');
  wrap.appendChild(el('div', { class: 'chip-row tight' }, [
    chip(CATEGORIES[ex.category]),
    chip(METRICS[ex.metric].label, 'alt'),
    ex.perSide ? chip('per sida', 'alt') : null,
    ex.equipment ? chip(ex.equipment, 'alt') : null,
  ]));
  wrap.appendChild(el('div', { class: 'info-block' }, [
    el('span', { class: 'ib-label' }, 'Dos'),
    el('div', {}, doseText(ex) + (ex.perSide ? ' per sida' : '')),
  ]));
  if (ex.howTo) {
    wrap.appendChild(el('div', { class: 'info-block' }, [
      el('span', { class: 'ib-label' }, 'Utförande'),
      el('div', {}, ex.howTo),
    ]));
  }
  if (ex.keyPoint) {
    wrap.appendChild(el('div', { class: 'info-block' }, [
      el('span', { class: 'ib-label' }, 'Nyckelpunkt'),
      el('div', {}, ex.keyPoint),
    ]));
  }
  if (ex.notes) {
    wrap.appendChild(el('div', { class: 'info-block' }, [
      el('span', { class: 'ib-label' }, 'Egen anteckning'),
      el('div', {}, ex.notes),
    ]));
  }
  const links = exerciseLinks(ex);
  if (links.length) {
    wrap.appendChild(el('div', { class: 'info-block' }, [
      el('span', { class: 'ib-label' }, 'Se hur den görs'),
      el('div', { class: 'link-row' }, links.map((l) => el('a', {
        class: 'link-btn', href: l.url, target: '_blank', rel: 'noopener noreferrer',
      }, [
        el('span', { class: 'lb-icon' }, l.icon),
        l.label,
        el('span', { class: 'lb-out' }, '↗'),
      ]))),
    ]));
  }
  if (ex.shoulderRule) {
    wrap.appendChild(el('div', { class: 'note danger' }, [
      el('strong', {}, 'Axelregel: '),
      'Håll dig inom ett kontrollerat, tolererat rörelseomfång. Byt eller minska övningen om smärtan ökar under passet eller nästa dag.',
    ]));
  }
  return wrap;
}

export function openExerciseDetail(ctx, ex) {
  const { body, close } = openModal(ex.name, { wide: true });
  body.appendChild(exerciseInfoBody(ex));

  // Historik och rekord
  const hist = exerciseHistory(ctx.sessions, ex.id);
  const pb = personalBest(ctx.sessions, ex.id);
  const histWrap = el('div', { class: 'info-block' }, [
    el('span', { class: 'ib-label' }, 'Historik'),
  ]);
  if (!hist.length) {
    histWrap.appendChild(el('div', { class: 'muted' }, 'Inte loggad ännu.'));
  } else {
    if (pb) {
      histWrap.appendChild(el('div', { class: 'pb-line' },
        `🏆 Bäst: ${pbText(pb)}${pb.metric === 'weight_reps' ? ` (≈${Math.round(estimated1RM(pb.set.weight, pb.set.reps))} kg 1RM)` : ''} · ${formatDate(pb.date)}`));
    }
    const rows = el('div', { class: 'hist-list' });
    for (const row of hist.slice(0, 12)) {
      rows.appendChild(el('div', { class: 'hist-row' }, [
        el('span', { class: 'hr-date' }, formatDate(row.date)),
        el('span', { class: 'hr-sets' }, row.sets.map((s) => setLabel(row.entry, s)).join(' | ')),
      ]));
    }
    histWrap.appendChild(rows);
    if (hist.length > 12) {
      histWrap.appendChild(el('div', { class: 'muted small' }, `+ ${hist.length - 12} äldre pass`));
    }
  }
  body.appendChild(histWrap);

  // Var används övningen?
  const usedIn = ctx.routines.filter((r) => r.items.some((i) => i.exerciseId === ex.id));
  if (usedIn.length) {
    body.appendChild(el('div', { class: 'info-block' }, [
      el('span', { class: 'ib-label' }, 'Används i'),
      el('div', {}, usedIn.map((r) => r.name).join(', ')),
    ]));
  }

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => { close(); confirmDeleteExercise(ctx, ex, usedIn); },
    }, '🗑 Ta bort'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: () => { close(); openExerciseForm(ctx, ex); },
    }, '✏️ Redigera'),
  ]));
}

function confirmDeleteExercise(ctx, ex, usedIn) {
  const inRoutines = usedIn.length
    ? ` Den tas också bort från ${usedIn.length} rutin${usedIn.length > 1 ? 'er' : ''} (${usedIn.map((r) => r.name).join(', ')}).`
    : '';
  const builtin = ex.builtin
    ? ' Övningen kommer tillbaka om du läser in standardprogrammet igen.'
    : '';
  confirmModal({
    title: 'Ta bort övningen?',
    text: `"${ex.name}" tas bort ur biblioteket.${inRoutines}${builtin} Redan loggade pass påverkas inte.`,
    onConfirm: async () => {
      for (const r of usedIn) {
        r.items = r.items.filter((i) => i.exerciseId !== ex.id);
        r.updatedAt = new Date().toISOString();
        await putRoutine(r);
      }
      await deleteExercise(ex.id);
      toast('Övning borttagen.');
      await ctx.render();
    },
  });
}

// =====================================================================
//  Formulär
// =====================================================================

export function openExerciseForm(ctx, existing, onSaved = null) {
  const isEdit = !!existing;
  const { body, close } = openModal(isEdit ? 'Redigera övning' : 'Ny övning', { wide: true });

  const draft = existing
    ? { ...existing }
    : normalizeExercise({ name: '', category: 'styrka', metric: 'weight_reps', defaultSets: 3 });

  const nameInput = el('input', { type: 'text', value: draft.name, placeholder: 'p.ex. Front squat' });
  const catSelect = select(Object.entries(CATEGORIES), draft.category, (v) => { draft.category = v; });
  const metricSelect = select(
    Object.entries(METRICS).map(([k, v]) => [k, v.label]), draft.metric,
    (v) => { draft.metric = v; repsHint.textContent = repsHintText(v); },
  );
  const perSideInput = el('input', { type: 'checkbox' });
  perSideInput.checked = !!draft.perSide;
  const setsInput = numInput(draft.defaultSets, { min: '1', max: '10' });
  const repsInput = el('input', { type: 'text', value: draft.defaultReps, placeholder: 'p.ex. 6-10' });
  const repsHint = el('small', { class: 'hint' }, repsHintText(draft.metric));
  const equipInput = el('input', { type: 'text', value: draft.equipment, placeholder: 'p.ex. Hantlar, bänk' });
  const howToInput = el('textarea', { placeholder: 'Hur övningen utförs' });
  howToInput.value = draft.howTo || '';
  const keyInput = el('textarea', { placeholder: 'Det viktigaste att tänka på' });
  keyInput.value = draft.keyPoint || '';
  const notesInput = el('textarea', { placeholder: 'Egen anteckning (valfri)' });
  notesInput.value = draft.notes || '';
  const videoInput = el('input', {
    type: 'url', inputmode: 'url', value: draft.videoUrl || '',
    placeholder: 'https://youtube.com/watch?v=…',
  });
  const shoulderInput = el('input', { type: 'checkbox' });
  shoulderInput.checked = !!draft.shoulderRule;

  body.appendChild(field('Namn', nameInput));
  body.appendChild(field('Kategori', catSelect));
  body.appendChild(field('Mätsätt', metricSelect, 'Styr vilka fält du loggar per set.'));
  body.appendChild(el('label', { class: 'field check' }, [perSideInput, el('span', {}, 'Dosen gäller per sida')]));
  body.appendChild(el('div', { class: 'two-col' }, [
    field('Set som standard', setsInput),
    el('label', { class: 'field' }, [el('span', {}, 'Reps / dos'), repsInput, repsHint]),
  ]));
  body.appendChild(field('Utrustning (valfri)', equipInput));
  body.appendChild(field('Utförande (valfritt)', howToInput));
  body.appendChild(field('Nyckelpunkt (valfri)', keyInput));
  body.appendChild(field('Egen anteckning (valfri)', notesInput));
  body.appendChild(field('Länk till video eller instruktion (valfri)', videoInput,
    'Lämna tomt så visar appen söklänkar till klipp och instruktioner i stället.'));
  body.appendChild(el('label', { class: 'field check' }, [shoulderInput, el('span', {}, 'Visa axelregeln för denna övning')]));

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Avbryt'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        const name = nameInput.value.trim();
        if (!name) { toast('Namn krävs.'); return; }
        const data = {
          name,
          category: draft.category,
          metric: draft.metric,
          perSide: perSideInput.checked,
          defaultSets: numOrNull(setsInput.value) || 3,
          defaultReps: repsInput.value.trim(),
          equipment: equipInput.value.trim(),
          howTo: howToInput.value.trim(),
          keyPoint: keyInput.value.trim(),
          notes: notesInput.value.trim(),
          videoUrl: videoInput.value.trim(),
          shoulderRule: shoulderInput.checked,
        };
        const saved = isEdit
          ? normalizeExercise({ ...existing, ...data, updatedAt: new Date().toISOString() })
          : createExercise(data);
        await putExercise(saved);
        close();
        toast(isEdit ? 'Övning uppdaterad.' : 'Övning tillagd.');
        if (onSaved) onSaved(saved);
        await ctx.render();
      },
    }, 'Spara'),
  ]));

  nameInput.focus();
}

function repsHintText(metric) {
  if (metric === 'time') return 'Sekunder per set, t.ex. 30-40.';
  if (metric === 'distance') return 'Meter per set, t.ex. 25-40.';
  if (metric === 'reps') return 'Reps per set, t.ex. 10-15.';
  return 'Reps per set, t.ex. 4-6.';
}

// =====================================================================
//  Väljardialog — används av Träna och Rutiner
// =====================================================================

export function exercisePickerModal(ctx, { title = 'Välj övning', exclude = new Set(), onPick }) {
  const { body, close } = openModal(title, { wide: true });
  let q = '';
  let cat = 'alla';

  const searchInput = el('input', { type: 'search', placeholder: 'Sök övning…' });
  body.appendChild(el('div', { class: 'search-row' }, searchInput));

  const filters = el('div', { class: 'chip-row' });
  const cats = [['alla', 'Alla'], ...Object.entries(CATEGORIES)];
  for (const [key, label] of cats) {
    filters.appendChild(el('button', {
      class: `chip-btn${cat === key ? ' active' : ''}`, type: 'button',
      onclick: () => {
        cat = key;
        filters.querySelectorAll('.chip-btn').forEach((b, i) => {
          b.classList.toggle('active', cats[i][0] === cat);
        });
        draw();
      },
    }, label));
  }
  body.appendChild(filters);

  const listWrap = el('div');
  body.appendChild(listWrap);

  body.appendChild(el('button', {
    class: 'btn ghost', type: 'button', style: 'margin-top:12px;',
    onclick: () => {
      close();
      openExerciseForm(ctx, null, (saved) => onPick(saved));
    },
  }, '＋ Skapa ny övning'));

  function draw() {
    clearNode(listWrap);
    const list = filterExercises(ctx.exercises, q, cat).filter((e) => !exclude.has(e.id));
    if (!list.length) {
      listWrap.appendChild(el('p', { class: 'muted center' }, 'Inga övningar att välja.'));
      return;
    }
    const listEl = el('div', { class: 'row-list' });
    for (const ex of list) {
      listEl.appendChild(el('button', {
        class: 'row-btn', type: 'button',
        onclick: () => { close(); onPick(ex); },
      }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, ex.name),
          el('div', { class: 'rb-sub' }, `${CATEGORIES[ex.category]} · ${doseText(ex)}`),
        ]),
        el('span', { class: 'rb-go' }, '＋'),
      ]));
    }
    listWrap.appendChild(listEl);
  }

  searchInput.addEventListener('input', () => { q = searchInput.value; draw(); });
  draw();
  searchInput.focus();
}
