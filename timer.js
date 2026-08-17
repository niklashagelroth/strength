// timer.js — Nedräkning för tidsövningar: flytande fält, ljudsignal och notis.
//
// Nedräkningen utgår från en måltidpunkt (Date.now() + ms), inte från en räknare
// som minskar ett steg per sekund. Strypar telefonen timern — bakgrund, låst
// skärm, sparläge — visar den ändå rätt siffra så fort appen vaknar igen.
//
// SIGNALEN LIGGER I LJUDET, INTE I EN TIMER.
// iOS ger ingen webb-app något sätt att larma med släckt skärm: schemalagda
// lokala notiser finns inte i plattformen, setTimeout fryser när appen
// suspenderas, service workern kan inte väcka sig själv och Wake Lock saknas.
// Men medieuppspelning fortsätter med låst skärm, precis som musik. Därför bakas
// hela nedräkningen till en wav — tystnad fram till måltiden, sedan tre pulser —
// och spelas som en enda uppspelning startad av användarens tryck. Pipet kommer
// då på rätt sekund utan att en enda rad kod behöver köra. Det som ritas på
// skärmen är bara en spegling; ljudet är oberoende av den.
//
// Bara en nedräkning kan gå i taget. Startas en ny avbryts den förra, och dess
// onEnd anropas så knappen den startades från kan återställa sig.

import { el } from './ui.js';
import { mmss } from './stats.js';

// Bakad tystnad kostar 16 kB per sekund (8 kHz, 16-bitars mono). Upp till tio
// minuter är det en rimlig blob; längre än så — i praktiken bara zon 2-passet —
// faller vi tillbaka på tickern och pipet via Web Audio.
const MAX_BAKED_SECONDS = 600;
const SAMPLE_RATE = 8000;      // 880 Hz-tonen behöver inte mer
const BEEP_FREQ = 880;
const PULSES = 3;
const PULSE_SEC = 0.18;
const GAP_SEC = 0.12;
const TAIL_SEC = PULSES * (PULSE_SEC + GAP_SEC);

let current = null;     // { deadline, seconds, label, onFinish, onEnd, done, baked }
let ticker = null;
let clearTimer = null;
let bar = null;
let timeNode = null;
let audioCtx = null;
let audioEl = null;
let audioUrl = null;

export function isRunning() {
  return !!current;
}

export function startCountdown({ seconds, label = '', onFinish = null, onEnd = null }) {
  if (!seconds || seconds <= 0) return;
  stopCountdown();

  // Måste ske i användarens tryck: iOS låser annars både ljud och notisdialog.
  primeAudio();
  askNotifyPermission();

  current = {
    deadline: Date.now() + seconds * 1000,
    seconds, label, onFinish, onEnd, done: false, baked: false,
  };
  // Detta är det som faktiskt ringer med släckt skärm.
  current.baked = startBakedAudio(seconds, label);
  showBar();
  draw();
  // 250 ms i stället för 1000: siffran hinner aldrig hoppa över ett helt steg.
  ticker = setInterval(draw, 250);
}

export function stopCountdown() {
  clearInterval(ticker);
  ticker = null;
  clearTimeout(clearTimer);
  clearTimer = null;
  const ending = current;
  current = null;
  releaseAudio();
  removeBar();
  if (ending && ending.onEnd) ending.onEnd();
}

function draw() {
  if (!current || !timeNode) return;
  const left = Math.max(0, Math.ceil((current.deadline - Date.now()) / 1000));
  timeNode.textContent = current.done ? 'Klart!' : mmss(left);
  if (left === 0 && !current.done) finish();
}

function finish() {
  current.done = true;
  clearInterval(ticker);
  ticker = null;

  if (bar) bar.classList.add('done');
  if (timeNode) timeNode.textContent = 'Klart!';
  // Är nedräkningen bakad har ljudströmmen redan pipit på exakt rätt sekund —
  // pipa inte igen. Annars får Web Audio ta det, som förut.
  if (!current.baked) beep();
  vibrate();
  notify(current.label);

  if (current.onFinish) current.onFinish();
  // Fältet ligger kvar en stund så man ser vilken övning som tog slut.
  clearTimer = setTimeout(stopCountdown, 8000);
}

// Kommer man tillbaka till appen efter att den strypts ska siffran och en
// eventuell slutsignal komma direkt, inte vid nästa tick.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) draw();
});

// =====================================================================
//  Flytande fält
// =====================================================================

function showBar() {
  removeBar();
  timeNode = el('div', { class: 'tb-time' }, mmss(current.seconds));
  bar = el('div', { class: 'timer-bar', role: 'status' }, [
    el('div', { class: 'tb-main' }, [
      el('div', { class: 'tb-label' }, current.label || 'Nedräkning'),
      timeNode,
    ]),
    el('button', {
      class: 'tb-stop', type: 'button', title: 'Stoppa', onclick: stopCountdown,
    }, '✕'),
  ]);
  document.body.appendChild(bar);
}

function removeBar() {
  if (bar) bar.remove();
  bar = null;
  timeNode = null;
}

// =====================================================================
//  Bakad ljudström — signalen som klarar släckt skärm
// =====================================================================

// En wav med tystnad fram till måltiden och tre pulser därefter. Tystnaden är
// redan nollor i en ny ArrayBuffer, så bara pulserna behöver skrivas — även en
// tiominuters nedräkning byggs på någon millisekund.
export function buildCountdownWav(seconds, sampleRate = SAMPLE_RATE) {
  const totalSamples = Math.ceil((seconds + TAIL_SEC) * sampleRate);
  const dataBytes = totalSamples * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const str = (off, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  str(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);                 // fmt-chunkens längd
  view.setUint16(20, 1, true);                  // PCM, okomprimerat
  view.setUint16(22, 1, true);                  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);     // byte per sekund
  view.setUint16(32, 2, true);                  // block align
  view.setUint16(34, 16, true);                 // bitar per sample
  str(36, 'data');
  view.setUint32(40, dataBytes, true);

  const pulseSamples = Math.floor(PULSE_SEC * sampleRate);
  for (let p = 0; p < PULSES; p++) {
    const startSample = Math.floor((seconds + p * (PULSE_SEC + GAP_SEC)) * sampleRate);
    for (let n = 0; n < pulseSamples; n++) {
      const t = n / sampleRate;
      // Mjuk attack och avfallande svans, annars knäpper det i högtalaren.
      const amp = 0.55 * Math.min(1, t / 0.008) * (1 - n / pulseSamples) ** 1.5;
      const sample = Math.sin(2 * Math.PI * BEEP_FREQ * t) * amp;
      const offset = 44 + (startSample + n) * 2;
      if (offset + 2 <= buf.byteLength) {
        view.setInt16(offset, Math.round(sample * 32767), true);
      }
    }
  }
  return buf;
}

// Returnerar true om en bakad ström startades. Uppspelningen kan ändå nekas i
// efterhand — då nollas current.baked och Web Audio får ta signalen i stället.
function startBakedAudio(seconds, label) {
  if (typeof Audio === 'undefined' || typeof Blob === 'undefined') return false;
  if (typeof URL === 'undefined' || !URL.createObjectURL) return false;
  if (seconds > MAX_BAKED_SECONDS) return false;
  try {
    // 'playback' är det som får iOS att fortsätta spela med låst skärm. Det tar
    // också över ljudet från andra appar så länge nedräkningen pågår.
    setAudioSession('playback');
    const blob = new Blob([buildCountdownWav(seconds)], { type: 'audio/wav' });
    audioUrl = URL.createObjectURL(blob);
    audioEl = new Audio(audioUrl);
    audioEl.preload = 'auto';
    audioEl.setAttribute('playsinline', '');
    const played = audioEl.play();
    if (played && played.catch) {
      played.catch(() => {
        if (current) current.baked = false;   // låt finish() pipa i stället
        releaseAudio();
      });
    }
    setMediaSession(label, seconds);
    return true;
  } catch (err) {
    releaseAudio();
    return false;
  }
}

function releaseAudio() {
  const had = !!audioEl;
  if (audioEl) {
    try { audioEl.pause(); audioEl.removeAttribute('src'); } catch (err) { /* strunt samma */ }
  }
  audioEl = null;
  if (audioUrl) {
    try { URL.revokeObjectURL(audioUrl); } catch (err) { /* strunt samma */ }
    audioUrl = null;
  }
  // Lämna tillbaka ljudet till musiken direkt — 'playback' ska inte ligga kvar
  // och blockera andra appar när ingen nedräkning pågår.
  if (had) {
    setAudioSession('auto');
    clearMediaSession();
  }
}

function setAudioSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch (err) { /* finns bara i nyare Safari */ }
}

// Låsskärmens mediakort: visar vad som räknar ned och låter dig stoppa därifrån.
function setMediaSession(label, seconds) {
  try {
    if (!navigator.mediaSession || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Nedräkning ${mmss(seconds)}`,
      artist: label || 'Styrka',
    });
    navigator.mediaSession.setActionHandler('pause', stopCountdown);
    navigator.mediaSession.setActionHandler('stop', stopCountdown);
  } catch (err) { /* stöds inte — inget tappas */ }
}

function clearMediaSession() {
  try {
    if (!navigator.mediaSession) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  } catch (err) { /* strunt samma */ }
}

// =====================================================================
//  Signal — ljud, vibration, notis
// =====================================================================

// Skapas vid användarens tryck så ljudet är upplåst när tiden väl går ut.
function primeAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (err) {
    audioCtx = null;   // ljud är en bonus, aldrig ett krav
  }
}

// Reservsignal när nedräkningen inte kunde bakas (för lång, eller uppspelningen
// nekad). Kräver att appen är i förgrunden — Web Audio tystas när iOS suspenderar.
function beep() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const start = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t = start + i * 0.3;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  } catch (err) { /* tyst fallback */ }
}

function vibrate() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch (err) { /* stöds inte på iOS — notis och ljud får räcka */ }
}

function askNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch (err) { /* äldre Safari saknar promise-varianten */ }
}

async function notify(label) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = {
    body: label || 'Tiden är ute.',
    tag: 'styrka-timer',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
  };
  // Android/Chrome tillåter bara notiser via service workern; konstruktorn
  // kastar där. Desktop-Safari har ingen registrering att gå via.
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg && reg.showNotification) {
      await reg.showNotification('⏱ Tiden är ute', opts);
      return;
    }
  } catch (err) { /* faller igenom till konstruktorn */ }
  try {
    new Notification('⏱ Tiden är ute', opts);
  } catch (err) { /* notiser inte tillgängliga — ljudet räcker */ }
}
