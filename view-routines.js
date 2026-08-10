// view-routines.js — Rutiner: skapa och ändra pass, ordna övningar, kopiera, ta bort.

import { putRoutine, deleteRoutine, putSession } from './db.js';
import {
  createRoutine, normalizeRoutine, normalizeRoutineItem, createSession,
  ROUTINE_TYPES, CATEGORIES, doseLabel, numOrNull, uid,
} from './model.js';
import { programStatus } from './program.js';
import {
  el, clearNode, toast, openModal, confirmModal, emptyState, panel, chip,
  field, select, numInput,
} from './ui.js';
import { exercisePickerModal, openExerciseDetail } from './view-exercises.js';

export function renderRoutines(app, ctx) {
  ctx.setTitle('Rutiner');

  app.appendChild(el('button', {
    class: 'btn primary', type: 'button', onclick: () => openRoutineEditor(ctx, null),
  }, '＋ Ny rutin'));

  if (!ctx.routines.length) {
    app.appendChild(emptyState('📋', 'Inga rutiner',
      'Läs in standardprogrammet under Program, eller bygg en egen rutin.'));
    return;
  }

  // Gruppera per typ i programmets ordning.
  for (const [type, label] of Object.entries(ROUTINE_TYPES)) {
    const group = ctx.routines.filter((r) => r.type === type);
    if (!group.length) continue;
    const list = el('div', { class: 'row-list' });
    for (const r of group) {
      list.appendChild(el('button', {
        class: 'row-btn', type: 'button', onclick: () => openRoutineDetail(ctx, r),
      }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, r.name),
          el('div', { class: 'rb-sub' }, `${r.items.length} övningar${r.description ? ` · ${firstSentence(r.description)}` : ''}`),
        ]),
        el('span', { class: 'rb-go' }, '›'),
      ]));
    }
    app.appendChild(panel(label, list));
  }
}

function firstSentence(text) {
  const m = text.match(/^[^.]{0,70}\./);
  return m ? m[0] : text.slice(0, 70);
}

// =====================================================================
//  Detaljvy
// =====================================================================

function openRoutineDetail(ctx, routine) {
  const { body, close } = openModal(routine.name, { wide: true });

  body.appendChild(el('div', { class: 'chip-row tight' }, [
    chip(ROUTINE_TYPES[routine.type]),
    chip(`${routine.items.length} övningar`, 'alt'),
  ]));
  if (routine.description) {
    body.appendChild(el('p', { class: 'muted' }, routine.description));
  }

  const list = el('div', { class: 'item-list' });
  routine.items.forEach((item, i) => {
    const ex = ctx.exercisesById.get(item.exerciseId);
    list.appendChild(el('button', {
      class: 'item-row', type: 'button',
      onclick: () => { if (ex) { close(); openExerciseDetail(ctx, ex); } },
    }, [
      el('span', { class: 'ir-num' }, String(i + 1)),
      el('span', { class: 'ir-main' }, [
        el('div', { class: 'ir-name' }, [
          ex ? ex.name : '(borttagen övning)',
          ex && ex.shoulderRule ? el('span', { class: 'shoulder-dot' }, '⚠') : null,
        ]),
        el('div', { class: 'ir-sub' }, [
          doseLabel(item, ex),
          item.notes ? ` · ${item.notes}` : '',
        ].join('')),
      ]),
    ]));
  });
  body.appendChild(list);

  const week = programStatus(ctx.programStartDate).week;
  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => { close(); openRoutineEditor(ctx, routine); },
    }, '✏️ Ändra'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        const active = ctx.sessions.find((s) => s.status === 'active');
        if (active) { toast('Ett pass pågår redan — avsluta det först.'); return; }
        const session = createSession(routine, ctx.exercisesById, week ?? null);
        if (!session.entries.length) { toast('Rutinen har inga övningar.'); return; }
        await putSession(session);
        close();
        ctx.setView('train');
      },
    }, '▶ Starta'),
  ]));

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', {
      class: 'btn ghost small', type: 'button',
      onclick: async () => {
        const copy = createRoutine({
          ...routine, id: uid('rt'), name: `${routine.name} (kopia)`, builtin: false,
        });
        await putRoutine(copy);
        close();
        toast('Rutin kopierad.');
        await ctx.render();
      },
    }, 'Kopiera'),
    el('button', {
      class: 'btn ghost small', type: 'button',
      onclick: () => {
        close();
        confirmModal({
          title: 'Ta bort rutinen?',
          text: `"${routine.name}" tas bort.${routine.builtin ? ' Den kommer tillbaka om du läser in standardprogrammet igen.' : ''} Loggade pass påverkas inte.`,
          onConfirm: async () => {
            await deleteRoutine(routine.id);
            toast('Rutin borttagen.');
            await ctx.render();
          },
        });
      },
    }, '🗑 Ta bort'),
  ]));
}

// =====================================================================
//  Redigering
// =====================================================================

function openRoutineEditor(ctx, existing) {
  const isEdit = !!existing;
  const draft = isEdit
    ? normalizeRoutine(JSON.parse(JSON.stringify(existing)))
    : createRoutine({ name: '', type: 'styrka', items: [] });

  const { body, close } = openModal(isEdit ? 'Ändra rutin' : 'Ny rutin', { wide: true });

  const nameInput = el('input', { type: 'text', value: draft.name, placeholder: 'p.ex. Styrka A' });
  const typeSelect = select(Object.entries(ROUTINE_TYPES), draft.type, (v) => { draft.type = v; });
  const descInput = el('textarea', { placeholder: 'Kort beskrivning eller syfte (valfri)' });
  descInput.value = draft.description || '';

  body.appendChild(field('Namn', nameInput));
  body.appendChild(field('Typ', typeSelect));
  body.appendChild(field('Beskrivning (valfri)', descInput));

  body.appendChild(el('h2', { class: 'section', style: 'margin-top:18px;' }, 'Övningar'));
  const itemsWrap = el('div', { class: 'item-list edit' });
  body.appendChild(itemsWrap);

  const drawItems = () => {
    clearNode(itemsWrap);
    if (!draft.items.length) {
      itemsWrap.appendChild(el('p', { class: 'muted small' }, 'Inga övningar ännu.'));
      return;
    }
    draft.items.forEach((item, i) => {
      const ex = ctx.exercisesById.get(item.exerciseId);
      const setsInput = numInput(item.sets, { min: '1', max: '12', class: 'mini' });
      setsInput.addEventListener('input', () => { item.sets = numOrNull(setsInput.value) || 1; });
      const repsInput = el('input', {
        type: 'text', value: item.reps, placeholder: ex ? (ex.defaultReps || 'dos') : 'dos', class: 'mini',
      });
      repsInput.addEventListener('input', () => { item.reps = repsInput.value; });

      itemsWrap.appendChild(el('div', { class: 'item-edit' }, [
        el('div', { class: 'ie-head' }, [
          el('span', { class: 'ir-num' }, String(i + 1)),
          el('span', { class: 'ie-name' }, ex ? ex.name : '(borttagen övning)'),
          el('div', { class: 'ie-actions' }, [
            el('button', {
              class: 'icon-btn', type: 'button', title: 'Flytta upp', disabled: i === 0,
              onclick: () => { swap(draft.items, i, i - 1); drawItems(); },
            }, '↑'),
            el('button', {
              class: 'icon-btn', type: 'button', title: 'Flytta ned', disabled: i === draft.items.length - 1,
              onclick: () => { swap(draft.items, i, i + 1); drawItems(); },
            }, '↓'),
            el('button', {
              class: 'icon-btn danger', type: 'button', title: 'Ta bort',
              onclick: () => { draft.items.splice(i, 1); drawItems(); },
            }, '✕'),
          ]),
        ]),
        el('div', { class: 'ie-fields' }, [
          el('label', {}, [el('span', {}, 'Set'), setsInput]),
          el('label', {}, [
            el('span', {}, ex && ex.metric === 'time' ? 'Sek' : ex && ex.metric === 'distance' ? 'Meter' : 'Reps'),
            repsInput,
          ]),
        ]),
      ]));
    });
  };
  drawItems();

  body.appendChild(el('button', {
    class: 'btn ghost small', type: 'button', style: 'margin-top:10px;',
    onclick: () => exercisePickerModal(ctx, {
      title: 'Lägg till i rutinen',
      exclude: new Set(draft.items.map((i) => i.exerciseId)),
      onPick: (ex) => {
        draft.items.push(normalizeRoutineItem({
          exerciseId: ex.id, sets: ex.defaultSets, reps: ex.defaultReps,
        }));
        drawItems();
      },
    }),
  }, '＋ Lägg till övning'));

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Avbryt'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        const name = nameInput.value.trim();
        if (!name) { toast('Namn krävs.'); return; }
        const saved = normalizeRoutine({
          ...draft,
          name,
          description: descInput.value.trim(),
          updatedAt: new Date().toISOString(),
        });
        await putRoutine(saved);
        close();
        toast(isEdit ? 'Rutin uppdaterad.' : 'Rutin skapad.');
        await ctx.render();
      },
    }, 'Spara'),
  ]));

  nameInput.focus();
}

function swap(arr, a, b) {
  [arr[a], arr[b]] = [arr[b], arr[a]];
}
