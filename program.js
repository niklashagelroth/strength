// program.js — 12-veckorsblocket: veckoschema, belastningsregler och var i cykeln du är.
// Ren logik, ingen DOM. Veckan räknas från programStartDate i meta.

export const PROGRAM_LENGTH = 12;

// Veckoschema enligt programmet. 1 = måndag … 7 = söndag.
export const WEEK_PLAN = [
  { day: 1, name: 'Måndag', main: 'Styrka A', routineId: 'rt-a', comment: 'Ben, höft och dragstyrka' },
  { day: 2, name: 'Tisdag', main: 'Tennis + rörlighet', routineId: 'rt-mobility', comment: 'Undvik tung press dagen före hård match' },
  { day: 3, name: 'Onsdag', main: 'Styrka B', routineId: 'rt-b', comment: 'Explosivitet och helkropp' },
  { day: 4, name: 'Torsdag', main: 'Zon 2 / fridykning / vila', routineId: 'rt-zone2', comment: 'Lugn återhämtning' },
  { day: 5, name: 'Fredag', main: 'Styrka C', routineId: 'rt-c', comment: 'Hypertrofi och skadeprevention' },
  { day: 6, name: 'Lördag', main: 'Idrott', routineId: null, comment: 'Windsurfing, tennis, MTB eller skidåkning' },
  { day: 7, name: 'Söndag', main: 'Vila / lätt rörlighet', routineId: 'rt-mobility', comment: 'Minst en verkligt lugn dag' },
];

// 12-veckors progression. deload → halverad volym.
export const PHASES = [
  { weeks: [1, 2, 3], focus: 'Teknik och belastningstolerans', intensity: 'RIR 3', deload: false },
  { weeks: [4], focus: 'Lätt vecka', intensity: 'Halverad volym', deload: true },
  { weeks: [5, 6, 7], focus: 'Styrka och muskelbyggnad', intensity: 'RIR 1-2', deload: false },
  { weeks: [8], focus: 'Lätt vecka', intensity: 'Halverad volym', deload: true },
  { weeks: [9, 10, 11], focus: 'Råstyrka och prestation', intensity: '3-5 reps i huvudlyft', deload: false },
  { weeks: [12], focus: 'Återhämtning och jämförelsetest', intensity: 'Inga maxettor', deload: true },
];

export const LOAD_RULES = [
  'Arbeta normalt med 1-3 repetitioner kvar i tanken.',
  'När du klarar övre delen av repetitionsintervallet i alla set höjer du vikten minsta möjliga steg.',
  'Lätta veckor vecka 4 och 8: minska antalet arbetsset med cirka 40-50 procent.',
  'Explosiva övningar avslutas när hastigheten eller hopphöjden tydligt sjunker.',
  'Axelsmärta upp till cirka 3/10 kan tolereras endast om den inte ökar och är tillbaka på normal nivå nästa dag.',
];

export function phaseForWeek(week) {
  return PHASES.find((p) => p.weeks.includes(week)) || null;
}

// ISO-veckodag: måndag = 1 … söndag = 7.
export function isoDay(date = new Date()) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

export function planForDay(day) {
  return WEEK_PLAN.find((p) => p.day === day) || null;
}

export function planForToday(date = new Date()) {
  return planForDay(isoDay(date));
}

// Hur långt in i programmet är vi? null om ingen startdag är satt.
// Vecka kan bli > 12; då är blocket slut och det är dags att starta om.
export function programWeek(startDate, now = new Date()) {
  if (!startDate) return null;
  const start = startOfDay(new Date(startDate));
  if (Number.isNaN(start.getTime())) return null;
  // Räkna från måndagen i startveckan så veckobyten alltid sker på måndag.
  const monday = startOfDay(new Date(start));
  monday.setDate(monday.getDate() - (isoDay(start) - 1));
  const days = Math.floor((startOfDay(now) - monday) / 86400000);
  if (days < 0) return null;
  return Math.floor(days / 7) + 1;
}

export function programStatus(startDate, now = new Date()) {
  const week = programWeek(startDate, now);
  if (week == null) return { started: false, week: null, phase: null, finished: false };
  if (week > PROGRAM_LENGTH) {
    return { started: true, week, phase: null, finished: true };
  }
  return { started: true, week, phase: phaseForWeek(week), finished: false };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
