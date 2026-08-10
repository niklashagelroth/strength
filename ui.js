// ui.js — Små DOM-hjälpare som alla vyer delar. Ingen appspecifik logik.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number'
      ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function clearNode(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

let toastTimer = null;
export function toast(msg) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2500);
}

// Öppnar en modal. Returnerar { overlay, body, close } så anroparen kan fylla den.
export function openModal(title, opts = {}) {
  const overlay = el('div', { class: 'modal-overlay' });
  const close = () => {
    overlay.remove();
    if (opts.onClose) opts.onClose();
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const body = el('div', { class: 'modal-body' });
  const modal = el('div', { class: `modal${opts.wide ? ' wide' : ''}` }, [
    el('div', { class: 'modal-head' }, [
      el('h3', {}, title),
      el('button', { class: 'icon-btn', type: 'button', title: 'Stäng', onclick: close }, '✕'),
    ]),
    body,
  ]);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  return { overlay, body, close };
}

export function confirmModal({ title, text, confirmLabel = 'Ta bort', danger = true, onConfirm }) {
  const { body, close } = openModal(title);
  body.appendChild(el('p', { class: 'muted' }, text));
  body.appendChild(el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn ghost', type: 'button', onclick: close }, 'Avbryt'),
    el('button', {
      class: `btn ${danger ? 'red' : 'primary'}`, type: 'button',
      onclick: async () => { close(); await onConfirm(); },
    }, confirmLabel),
  ]));
}

export function emptyState(emoji, title, text, action = null) {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'big' }, emoji),
    el('h2', {}, title),
    el('p', { class: 'muted' }, text),
    action,
  ]);
}

export function statBox(num, lbl, sub = null) {
  return el('div', { class: 'stat-box' }, [
    el('div', { class: 'num' }, String(num)),
    el('div', { class: 'lbl' }, lbl),
    sub ? el('div', { class: 'sub' }, sub) : null,
  ]);
}

export function panel(title, children = [], cls = '') {
  return el('div', { class: `panel ${cls}`.trim() }, [
    title ? el('h2', { class: 'section' }, title) : null,
    ...[].concat(children),
  ]);
}

export function field(label, input, hint = null) {
  return el('label', { class: 'field' }, [
    el('span', {}, label),
    input,
    hint ? el('small', { class: 'hint' }, hint) : null,
  ]);
}

export function select(options, value, onchange) {
  const s = el('select', { onchange: (e) => onchange(e.target.value) });
  for (const [val, label] of options) {
    s.appendChild(el('option', { value: val, selected: val === value }, label));
  }
  return s;
}

// Numeriskt fält anpassat för mobil: decimaltangentbord och ingen spinner-hoppighet.
export function numInput(value, opts = {}) {
  return el('input', {
    type: 'number',
    inputmode: opts.decimal ? 'decimal' : 'numeric',
    step: opts.step || (opts.decimal ? '0.5' : '1'),
    min: opts.min ?? '0',
    max: opts.max,
    value: value == null ? '' : String(value),
    placeholder: opts.placeholder || '',
    class: opts.class || '',
    ...(opts.attrs || {}),
  });
}

export function chip(text, cls = '') {
  return el('span', { class: `chip ${cls}`.trim() }, text);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
