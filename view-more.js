// view-more.js — Mer-fliken och dess undervyer: program, kost, axel, backup.

import {
  setMeta, requestPersistentStorage, storageEstimate, clearAllData,
} from './db.js';
import { numOrNull, dateKey, today } from './model.js';
import {
  WEEK_PLAN, PHASES, LOAD_RULES, PROGRAM_LENGTH, programStatus, planForToday, isoDay,
} from './program.js';
import {
  SPORT_NOTES, NUTRITION, SUPPLEMENTS, SUPPLEMENT_CAVEAT, RECOVERY, SHOULDER, DISCLAIMER,
} from './reference.js';
import { PROGRAM_NAME } from './program-default.js';
import { loadDefaultProgram } from './load-program.js';
import {
  exportToFile, readImportFile, importReplace, importMerge, importSummary, EXPORT_VERSION,
} from './backup.js';
import { doneSessions } from './stats.js';
import {
  el, toast, openModal, confirmModal, panel, field, numInput, chip, formatBytes,
} from './ui.js';

// =====================================================================
//  Hubb
// =====================================================================

export function renderMore(app, ctx) {
  ctx.setTitle('Mer');

  const links = [
    ['program', '🗓️', 'Program', '12-veckorsblocket, veckoschema och belastningsregler'],
    ['nutrition', '🍽️', 'Kost & tillskott', 'Protein, kolhydrater, dagsmodell och tillskott'],
    ['sports', '🏄', 'Idrottsanpassning', 'Windsurfing, tennis, skidåkning, fridykning, MTB'],
    ['shoulder', '🩺', 'Axel & varningstecken', 'När du ska ändra eller söka vård'],
    ['backup', '💾', 'Backup & lagring', 'Exportera, importera och beständig lagring'],
  ];

  const list = el('div', { class: 'row-list' });
  for (const [view, icon, title, sub] of links) {
    list.appendChild(el('button', {
      class: 'row-btn', type: 'button', onclick: () => ctx.setView(view),
    }, [
      el('span', { class: 'rb-icon' }, icon),
      el('div', { class: 'rb-main' }, [
        el('div', { class: 'rb-title' }, title),
        el('div', { class: 'rb-sub' }, sub),
      ]),
      el('span', { class: 'rb-go' }, '›'),
    ]));
  }
  app.appendChild(list);

  app.appendChild(el('div', { class: 'stat-grid compact', style: 'margin-top:16px;' }, [
    miniStat(String(ctx.exercises.length), 'övningar'),
    miniStat(String(ctx.routines.length), 'rutiner'),
    miniStat(String(doneSessions(ctx.sessions).length), 'pass'),
  ]));

  app.appendChild(el('p', { class: 'muted small center', style: 'margin-top:20px;' }, DISCLAIMER));
}

function miniStat(num, lbl) {
  return el('div', { class: 'stat-box' }, [
    el('div', { class: 'num small' }, num),
    el('div', { class: 'lbl' }, lbl),
  ]);
}

// =====================================================================
//  Program
// =====================================================================

export function renderProgram(app, ctx) {
  ctx.setTitle('Program');
  const status = programStatus(ctx.programStartDate);

  // ---- Status och start ----
  const statusChildren = [
    el('p', { class: 'muted', style: 'margin-top:0;' }, PROGRAM_NAME),
  ];
  if (!status.started) {
    statusChildren.push(el('p', {}, 'Sätt startdagen så räknar appen fram vecka, fas och belastning automatiskt. Veckan byter alltid på måndag.'));
    statusChildren.push(el('button', {
      class: 'btn primary', type: 'button', onclick: () => startProgram(ctx, today()),
    }, 'Starta programmet idag'));
    statusChildren.push(el('button', {
      class: 'btn ghost', type: 'button', style: 'margin-top:8px;',
      onclick: () => openStartDatePicker(ctx),
    }, 'Välj annan startdag'));
  } else {
    statusChildren.push(el('div', { class: 'kv' }, [
      el('span', {}, 'Startdag'),
      el('strong', {}, ctx.programStartDate),
    ]));
    statusChildren.push(el('div', { class: 'kv' }, [
      el('span', {}, 'Vecka'),
      el('strong', {}, status.finished ? `${status.week} (blocket klart)` : `${status.week} av ${PROGRAM_LENGTH}`),
    ]));
    if (status.phase) {
      statusChildren.push(el('div', { class: 'kv' }, [el('span', {}, 'Fas'), el('strong', {}, status.phase.focus)]));
      statusChildren.push(el('div', { class: 'kv' }, [el('span', {}, 'Belastning'), el('strong', {}, status.phase.intensity)]));
    }
    statusChildren.push(el('div', { class: 'btn-row' }, [
      el('button', {
        class: 'btn ghost small', type: 'button', onclick: () => openStartDatePicker(ctx),
      }, 'Ändra startdag'),
      el('button', {
        class: 'btn ghost small', type: 'button',
        onclick: () => confirmModal({
          title: 'Starta om blocket?',
          text: 'Startdagen sätts till idag och du börjar om på vecka 1. Loggade pass påverkas inte.',
          confirmLabel: 'Starta om', danger: false,
          onConfirm: () => startProgram(ctx, today()),
        }),
      }, 'Starta om'),
    ]));
  }
  app.appendChild(panel('Status', statusChildren));

  // ---- Veckoschema ----
  const todayDay = isoDay();
  const rows = el('div', { class: 'plan-table' });
  for (const p of WEEK_PLAN) {
    rows.appendChild(el('div', { class: `plan-row${p.day === todayDay ? ' today' : ''}` }, [
      el('span', { class: 'pr-day' }, p.name.slice(0, 3)),
      el('div', { class: 'pr-main' }, [
        el('div', { class: 'pr-title' }, p.main),
        el('div', { class: 'pr-sub' }, p.comment),
      ]),
    ]));
  }
  app.appendChild(panel('Veckoschema', [
    el('p', { class: 'muted small', style: 'margin-top:0;' },
      'Basen är tre styrkepass per vecka. Under veckor med mycket idrott tas pass C bort först. Huvudregeln är att du ska lämna gymmet starkare - inte tömd.'),
    rows,
  ]));

  // ---- 12-veckors progression ----
  const phaseRows = el('div', { class: 'plan-table' });
  for (const p of PHASES) {
    const label = p.weeks.length === 1 ? `${p.weeks[0]}` : `${p.weeks[0]}-${p.weeks[p.weeks.length - 1]}`;
    const active = status.week != null && p.weeks.includes(status.week);
    phaseRows.appendChild(el('div', { class: `plan-row${active ? ' today' : ''}` }, [
      el('span', { class: 'pr-day' }, `v${label}`),
      el('div', { class: 'pr-main' }, [
        el('div', { class: 'pr-title' }, p.focus),
        el('div', { class: 'pr-sub' }, p.intensity),
      ]),
    ]));
  }
  app.appendChild(panel('12-veckors progression', phaseRows));

  // ---- Belastningsregler ----
  app.appendChild(panel('Belastningsregler',
    el('ul', { class: 'bullets' }, LOAD_RULES.map((r) => el('li', {}, r)))));

  // ---- Läs in standardprogrammet ----
  app.appendChild(panel('Standardprogrammet', [
    el('p', { class: 'muted small', style: 'margin-top:0;' },
      `Programmets övningar och rutiner: ${ctx.exercises.length} övningar och ${ctx.routines.length} rutiner finns i appen just nu. Inläsningen hoppar över allt som redan finns — dina ändringar och din historik rörs aldrig.`),
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: async () => {
        const r = await loadDefaultProgram();
        if (!r.exercises && !r.routines) toast('Allt i standardprogrammet finns redan.');
        else toast(`Inläst: ${r.exercises} övningar, ${r.routines} rutiner.`);
        await ctx.render();
      },
    }, '📥 Läs in standardprogrammet'),
  ]));

  app.appendChild(el('p', { class: 'muted small center' }, DISCLAIMER));
}

async function startProgram(ctx, date) {
  await setMeta('programStartDate', date);
  toast(`Programmet startar ${date}.`);
  await ctx.render();
}

function openStartDatePicker(ctx) {
  const { body, close } = openModal('Startdag för programmet');
  const input = el('input', { type: 'date', value: ctx.programStartDate || today() });
  body.appendChild(field('Datum', input, 'Veckan byter på måndagen i den valda veckan.'));
  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Avbryt'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        if (!input.value) { toast('Välj ett datum.'); return; }
        close();
        await startProgram(ctx, input.value);
      },
    }, 'Spara'),
  ]));
}

// =====================================================================
//  Idrottsanpassning
// =====================================================================

export function renderSports(app, ctx) {
  ctx.setTitle('Idrottsanpassning');
  app.appendChild(el('p', { class: 'muted' },
    'Så placeras gympassen runt dina idrotter utan att göra dig stel eller sliten.'));
  for (const note of SPORT_NOTES) {
    app.appendChild(panel(note.title, el('p', { style: 'margin:0;' }, note.text)));
  }
}

// =====================================================================
//  Kost & tillskott
// =====================================================================

export function renderNutrition(app, ctx) {
  ctx.setTitle('Kost & tillskott');

  app.appendChild(el('p', { class: 'muted' }, NUTRITION.intro));

  // Proteinräknare utifrån kroppsvikt.
  const weightInput = numInput(ctx.bodyWeight, { decimal: true, placeholder: 'kg', min: '30', max: '200' });
  const result = el('div', { class: 'protein-result' });
  const update = () => {
    const kg = numOrNull(weightInput.value);
    if (!kg) {
      result.textContent = 'Fyll i kroppsvikt för att se ditt proteinintervall.';
      return;
    }
    const [lo, hi] = NUTRITION.proteinPerKg;
    result.textContent = `${Math.round(kg * lo)}-${Math.round(kg * hi)} g protein per dag, fördelat över 3-5 måltider (25-40 g per gång).`;
  };
  weightInput.addEventListener('input', () => {
    update();
    const kg = numOrNull(weightInput.value);
    if (kg) setMeta('bodyWeight', kg);
  });
  update();
  app.appendChild(panel('Protein', [
    field('Kroppsvikt', weightInput, '1,6-2,0 g per kg kroppsvikt och dag.'),
    result,
  ]));

  for (const sec of NUTRITION.sections) {
    if (sec.title === 'Protein') continue;  // täcks av räknaren ovan
    app.appendChild(panel(sec.title, el('p', { style: 'margin:0;' }, sec.text)));
  }

  // Dagsmodell
  const dayRows = el('div', { class: 'plan-table' });
  for (const [when, what] of NUTRITION.day) {
    dayRows.appendChild(el('div', { class: 'plan-row' }, [
      el('span', { class: 'pr-day wide' }, when),
      el('div', { class: 'pr-main' }, [el('div', { class: 'pr-title small' }, what)]),
    ]));
  }
  app.appendChild(panel('En enkel dagsmodell', dayRows));

  // Tillskott
  const sup = el('div', { class: 'sup-list' });
  for (const [name, rec, dose, comment] of SUPPLEMENTS) {
    sup.appendChild(el('div', { class: 'sup-row' }, [
      el('div', { class: 'sup-head' }, [
        el('strong', {}, name),
        chip(rec, recClass(rec)),
      ]),
      el('div', { class: 'sup-dose' }, dose === '-' ? '' : dose),
      el('div', { class: 'muted small' }, comment),
    ]));
  }
  app.appendChild(panel('Tillskott', [
    sup,
    el('p', { class: 'note warn', style: 'margin-bottom:0;' }, SUPPLEMENT_CAVEAT),
  ]));

  app.appendChild(panel('Återhämtning',
    el('ul', { class: 'bullets' }, RECOVERY.map((r) => el('li', {}, r)))));
}

function recClass(rec) {
  if (rec === 'Ja') return 'good';
  if (rec === 'Nej') return 'bad';
  return 'alt';
}

// =====================================================================
//  Axel
// =====================================================================

export function renderShoulder(app, ctx) {
  ctx.setTitle('Axel & varningstecken');

  app.appendChild(el('div', { class: 'note danger' }, [
    el('strong', {}, 'Axelregel: '), SHOULDER.rule,
  ]));

  app.appendChild(panel('Sök vård', [
    el('p', { class: 'muted', style: 'margin-top:0;' }, SHOULDER.intro),
    el('ul', { class: 'bullets' }, SHOULDER.redFlags.map((f) => el('li', {}, f))),
  ]));

  app.appendChild(panel(SHOULDER.avoidTitle,
    el('ul', { class: 'bullets' }, SHOULDER.avoid.map((f) => el('li', {}, f)))));

  // Övningar i biblioteket som har axelregeln.
  const flagged = ctx.exercises.filter((e) => e.shoulderRule);
  if (flagged.length) {
    app.appendChild(panel(`Övningar med axelregel (${flagged.length})`, [
      el('p', { class: 'muted small', style: 'margin-top:0;' },
        'Dessa visar en påminnelse i passet. Håll dig i tolererat rörelseomfång.'),
      el('div', { class: 'chip-row' }, flagged.map((e) => chip(e.name, 'alt'))),
    ]));
  }

  app.appendChild(el('p', { class: 'muted small center' }, DISCLAIMER));
}

// =====================================================================
//  Backup & lagring
// =====================================================================

export async function renderBackup(app, ctx) {
  ctx.setTitle('Backup & lagring');

  const sessions = doneSessions(ctx.sessions);
  const persisted = (navigator.storage && navigator.storage.persisted)
    ? await navigator.storage.persisted() : null;

  // ---- Export ----
  app.appendChild(panel('Export', [
    el('p', { class: 'muted', style: 'margin-top:0;' },
      `${ctx.exercises.length} övningar, ${ctx.routines.length} rutiner, ${sessions.length} pass och ${ctx.checkins.length} dagsloggar. Laddar ner allt som en JSON-fil.`),
    el('div', { class: 'backup-meta' }, ctx.lastExportAt
      ? `Senaste backup: ${new Date(ctx.lastExportAt).toLocaleString('sv-SE')}`
      : 'Ingen backup gjord ännu.'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        await exportToFile();
        toast('Backup nedladdad.');
        await ctx.render();
      },
    }, '⬇️ Exportera JSON'),
  ]));

  // ---- Import ----
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none;' });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      openImportDialog(ctx, await readImportFile(file));
    } catch (err) {
      toast('Fel: ' + err.message);
    }
    fileInput.value = '';
  });
  app.appendChild(panel('Import', [
    el('p', { class: 'muted', style: 'margin-top:0;' },
      'Läs in en tidigare backup. Du får välja att ersätta allt eller slå ihop.'),
    fileInput,
    el('button', { class: 'btn ghost', type: 'button', onclick: () => fileInput.click() }, '⬆️ Välj backupfil'),
  ]));

  // ---- Lagring ----
  const est = await storageEstimate();
  app.appendChild(panel('Lagring', [
    el('p', { class: 'muted', style: 'margin-top:0;' },
      persisted === true ? '✅ Beständig lagring beviljad — datan rensas inte automatiskt.'
        : persisted === false ? '⚠️ Beständig lagring ej beviljad. Tryck nedan för att be om den.'
        : 'Beständig lagring stöds inte i denna webbläsare.'),
    est ? el('p', { class: 'muted small' },
      `Använt ca ${formatBytes(est.usage || 0)} av ${formatBytes(est.quota || 0)}.`) : null,
    persisted === false ? el('button', {
      class: 'btn ghost', type: 'button',
      onclick: async () => {
        const ok = await requestPersistentStorage();
        toast(ok ? 'Beständig lagring beviljad.' : 'Begäran nekades.');
        await ctx.render();
      },
    }, 'Be om beständig lagring') : null,
    el('p', { class: 'muted small', style: 'margin-bottom:0;' },
      'Tips: exportera regelbundet — iOS Safari kan annars rensa lokal data.'),
  ]));

  // ---- Nollställ ----
  app.appendChild(panel('Nollställ', [
    el('p', { class: 'muted', style: 'margin-top:0;' },
      'Raderar övningar, rutiner, pass och dagsloggar i appen. Exportera först.'),
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => confirmModal({
        title: 'Radera all data?',
        text: 'Allt i appen raderas: övningar, rutiner, loggade pass och dagsloggar. Detta kan inte ångras utan en backup.',
        confirmLabel: 'Radera allt',
        onConfirm: async () => {
          await clearAllData();
          toast('All data raderad.');
          await ctx.render();
        },
      }),
    }, '🗑 Radera all data'),
  ]));
}

function openImportDialog(ctx, obj) {
  const s = importSummary(obj);
  const { body, close } = openModal('Importera backup');
  body.appendChild(el('p', { class: 'muted' },
    `Filen innehåller ${s.exercises} övningar, ${s.routines} rutiner, ${s.sessions} pass och ${s.checkins} dagsloggar (format v${obj.version} av max v${EXPORT_VERSION}).`));
  body.appendChild(el('p', { class: 'muted' },
    'Ersätt allt: din nuvarande data raderas och ersätts. Slå ihop: poster läggs till eller uppdateras per id (senaste ändring vinner).'));
  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', {
      class: 'btn ghost', type: 'button',
      onclick: async () => {
        const r = await importMerge(obj);
        close();
        toast(`Hopslaget: ${r.sessions.added} nya pass, ${r.exercises.added} nya övningar.`);
        await ctx.render();
      },
    }, 'Slå ihop'),
    el('button', {
      class: 'btn red', type: 'button',
      onclick: async () => {
        const r = await importReplace(obj);
        close();
        toast(`Ersatt allt: ${r.sessions} pass, ${r.exercises} övningar.`);
        await ctx.render();
      },
    }, 'Ersätt allt'),
  ]));
  body.appendChild(el('button', {
    class: 'btn ghost small', type: 'button', style: 'margin-top:12px;', onclick: close,
  }, 'Avbryt'));
}
