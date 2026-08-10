// view-stats.js — Statistik: volym per vecka, rekord, veckologg och passhistorik.

import { putCheckin, deleteCheckin } from './db.js';
import { normalizeCheckin, today, numOrNull, sessionVolume, sessionSetCount } from './model.js';
import {
  summarize, weeklyTotals, prList, byDateDesc, doneSessions, streakDays,
  formatVolume, formatDate, weekStart,
} from './stats.js';
import { programStatus } from './program.js';
import {
  el, clearNode, toast, openModal, confirmModal, emptyState, panel, statBox,
  field, numInput, chip,
} from './ui.js';
import { openSessionDetail } from './view-train.js';

export function renderStats(app, ctx) {
  ctx.setTitle('Statistik');

  const done = doneSessions(ctx.sessions);
  if (!done.length && !ctx.checkins.length) {
    app.appendChild(emptyState('📊', 'Ingen statistik ännu',
      'Logga ditt första pass under Träna, så byggs statistiken upp här.'));
    app.appendChild(weeklyLogPanel(ctx));
    return;
  }

  const s = summarize(ctx.sessions);
  const status = programStatus(ctx.programStartDate);
  app.appendChild(el('div', { class: 'stat-grid' }, [
    statBox(s.total, 'Pass totalt'),
    statBox(s.thisWeek, 'Denna vecka', s.strengthThisWeek ? `${s.strengthThisWeek} styrka` : null),
    statBox(formatVolume(s.thisWeekVolume), 'Volym veckan'),
    statBox(streakDays(ctx.sessions), 'Dagar i följd'),
  ]));

  // ---- Volym per vecka ----
  const weeks = weeklyTotals(ctx.sessions, 8);
  if (weeks.length) {
    const maxVol = Math.max(1, ...weeks.map((w) => w.volume));
    const maxSets = Math.max(1, ...weeks.map((w) => w.sets));
    const bars = el('div', { class: 'week-bars' });
    for (const w of weeks) {
      const isCurrent = w.week === weekStart(today());
      bars.appendChild(el('div', { class: `week-bar${isCurrent ? ' current' : ''}` }, [
        el('div', { class: 'wbar-label' }, shortWeek(w.week)),
        el('div', { class: 'wbar-track' }, [
          el('div', {
            class: 'wbar-fill',
            style: `width:${((w.volume || w.sets / maxSets * maxVol) / maxVol) * 100}%`,
          }),
        ]),
        el('div', { class: 'wbar-val' }, w.volume ? formatVolume(w.volume) : `${w.sets} set`),
      ]));
    }
    app.appendChild(panel('Senaste 8 veckorna', [
      bars,
      el('p', { class: 'muted small', style: 'margin-bottom:0;' },
        'Volym = vikt × reps summerat (ensidiga övningar räknas för båda sidor).'),
    ]));
  }

  // ---- Pass per vecka mot programmets tre styrkepass ----
  if (status.started && !status.finished) {
    const p = status.phase;
    app.appendChild(panel('Programläge', [
      el('div', { class: 'kv' }, [el('span', {}, 'Vecka'), el('strong', {}, `${status.week} av 12`)]),
      el('div', { class: 'kv' }, [el('span', {}, 'Fas'), el('strong', {}, p.focus)]),
      el('div', { class: 'kv' }, [el('span', {}, 'Belastning'), el('strong', {}, p.intensity)]),
      el('div', { class: 'kv' }, [
        el('span', {}, 'Styrkepass denna vecka'),
        el('strong', {}, `${s.strengthThisWeek} av 3`),
      ]),
    ]));
  }

  // ---- Rekord ----
  const prs = prList(ctx.sessions, 10);
  if (prs.length) {
    const list = el('div', { class: 'row-list' });
    for (const pr of prs) {
      list.appendChild(el('div', { class: 'row-static' }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, pr.name),
          el('div', { class: 'rb-sub' }, `${formatDate(pr.date)}${pr.perSide ? ' · per sida' : ''}`),
        ]),
        el('div', { class: 'pr-val' }, [
          el('strong', {}, `${pr.weight} kg × ${pr.reps}`),
          el('div', { class: 'small muted' }, `≈${Math.round(pr.e1rm)} kg 1RM`),
        ]),
      ]));
    }
    app.appendChild(panel('Tyngsta lyften', [
      list,
      el('p', { class: 'muted small', style: 'margin-bottom:0;' },
        'Uppskattat 1RM (Epley) — en jämförelsesiffra, inte något att testa maxa mot.'),
    ]));
  }

  // ---- Veckologg ----
  app.appendChild(weeklyLogPanel(ctx));

  // ---- Passhistorik ----
  const hist = byDateDesc(done);
  if (hist.length) {
    const list = el('div', { class: 'row-list' });
    for (const sess of hist.slice(0, 30)) {
      list.appendChild(el('button', {
        class: 'row-btn', type: 'button', onclick: () => openSessionDetail(ctx, sess),
      }, [
        el('div', { class: 'rb-main' }, [
          el('div', { class: 'rb-title' }, sess.name),
          el('div', { class: 'rb-sub' },
            `${formatDate(sess.date)} · ${sessionSetCount(sess)} set${sessionVolume(sess) ? ` · ${formatVolume(sessionVolume(sess))}` : ''}`),
        ]),
        el('span', { class: 'rb-go' }, '›'),
      ]));
    }
    app.appendChild(panel(`Passhistorik (${hist.length})`, list));
  }
}

function shortWeek(weekKey) {
  const d = new Date(`${weekKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return weekKey;
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// =====================================================================
//  Veckologg — axel, energi, sömn, bästa lyft
// =====================================================================

function weeklyLogPanel(ctx) {
  const recent = [...ctx.checkins].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const todayLog = ctx.checkins.find((c) => c.date === today());

  const children = [
    el('p', { class: 'muted small', style: 'margin-top:0;' },
      'Axel på morgonen (0-10), energi (1-5) och sömn. Tre dåliga dagar i rad är signalen att sänka volymen.'),
    el('button', {
      class: 'btn ghost', type: 'button', onclick: () => openCheckinForm(ctx, todayLog),
    }, todayLog ? '✏️ Ändra dagens logg' : '＋ Logga dagen'),
  ];

  if (recent.length) {
    const rows = el('div', { class: 'log-table' }, [
      el('div', { class: 'log-row head' }, [
        el('span', {}, 'Dag'), el('span', {}, 'Axel'), el('span', {}, 'Energi'), el('span', {}, 'Sömn'),
      ]),
    ]);
    for (const c of recent) {
      rows.appendChild(el('button', {
        class: 'log-row', type: 'button', onclick: () => openCheckinForm(ctx, c),
      }, [
        el('span', {}, formatDate(c.date)),
        el('span', { class: shoulderClass(c.shoulder) }, c.shoulder == null ? '—' : String(c.shoulder)),
        el('span', {}, c.energy == null ? '—' : `${c.energy}/5`),
        el('span', {}, c.sleep == null ? '—' : `${c.sleep} h`),
      ]));
    }
    children.push(rows);
  }

  return panel('Veckologg', children);
}

// Axelsmärta över cirka 3/10 är gränsen i programmet.
function shoulderClass(v) {
  if (v == null) return '';
  if (v <= 3) return 'ok';
  if (v <= 5) return 'warn';
  return 'bad';
}

function openCheckinForm(ctx, existing) {
  const { body, close } = openModal(existing ? `Logg ${formatDate(existing.date)}` : 'Logga dagen');
  const draft = normalizeCheckin(existing || { date: today() });

  const dateInput = el('input', { type: 'date', value: draft.date });
  const shoulderInput = numInput(draft.shoulder, { min: '0', max: '10', placeholder: '0-10' });
  const energyInput = numInput(draft.energy, { min: '1', max: '5', placeholder: '1-5' });
  const sleepInput = numInput(draft.sleep, { min: '0', max: '14', decimal: true, placeholder: 'timmar' });
  const liftInput = el('input', { type: 'text', value: draft.bestLift, placeholder: 'p.ex. trap bar 120 × 5' });
  const noteInput = el('textarea', { placeholder: 'Kommentar' });
  noteInput.value = draft.note || '';

  body.appendChild(field('Datum', dateInput));
  body.appendChild(el('div', { class: 'two-col' }, [
    field('Axel på morgonen', shoulderInput, '0 = ingen smärta'),
    field('Energi', energyInput, '1-5'),
  ]));
  body.appendChild(field('Sömn (timmar)', sleepInput));
  body.appendChild(field('Bästa lyft', liftInput));
  body.appendChild(field('Kommentar', noteInput));

  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Avbryt'),
    el('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        const date = dateInput.value || today();
        // Datum är nyckeln: byter du datum flyttas loggen dit.
        if (existing && existing.date !== date) await deleteCheckin(existing.date);
        await putCheckin(normalizeCheckin({
          date,
          shoulder: numOrNull(shoulderInput.value),
          energy: numOrNull(energyInput.value),
          sleep: numOrNull(sleepInput.value),
          bestLift: liftInput.value.trim(),
          note: noteInput.value.trim(),
          updatedAt: new Date().toISOString(),
        }));
        close();
        toast('Dagen loggad.');
        await ctx.render();
      },
    }, 'Spara'),
  ]));

  if (existing) {
    body.appendChild(el('button', {
      class: 'btn ghost small', type: 'button', style: 'margin-top:10px;',
      onclick: () => {
        close();
        confirmModal({
          title: 'Ta bort loggen?',
          text: `Loggen för ${formatDate(existing.date)} tas bort.`,
          onConfirm: async () => {
            await deleteCheckin(existing.date);
            toast('Logg borttagen.');
            await ctx.render();
          },
        });
      },
    }, '🗑 Ta bort loggen'));
  }
}
