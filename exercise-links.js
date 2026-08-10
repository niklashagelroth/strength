// exercise-links.js — Länkar till instruktion och video för varje övning.
//
// Länkarna byggs som sökningar i stället för att peka på enskilda klipp: en
// söklänk kan inte dö, och den funkar även för övningar du själv har lagt in.
// Söktermerna är på engelska eftersom utbudet av bra teknikklipp är mycket
// större där än på svenska.
//
// Vill du ha ett specifikt klipp för en övning: fyll i fältet "Länk till video
// eller instruktion" i övningens formulär. Då används den i stället.

// Övningens id → engelsk sökterm. Nycklarna är standardprogrammets stabila
// id:n, så länkarna funkar för redan inlästa övningar utan ny import.
export const SEARCH_TERMS = {
  // Uppvärmning
  'ex-9090-hip': '90/90 hip rotation mobility drill',
  'ex-adductor-rockback': 'adductor rock back stretch quadruped',
  'ex-tspine-rotation': 'quadruped thoracic rotation exercise',
  'ex-scapular-pushup': 'scapular push up',
  'ex-band-external-rot': 'band shoulder external rotation exercise',

  // Styrka A
  'ex-trapbar-deadlift': 'trap bar deadlift',
  'ex-bulgarian-split-squat': 'bulgarian split squat',
  'ex-chest-supported-row': 'chest supported dumbbell row incline bench',
  'ex-single-leg-rdl': 'single leg romanian deadlift',
  'ex-half-kneel-cable-row': 'half kneeling single arm cable row',
  'ex-copenhagen-plank': 'copenhagen plank',
  'ex-farmers-carry': 'farmers carry',
  'ex-standing-calf-raise': 'standing calf raise',

  // Styrka B
  'ex-box-jump': 'box jump and broad jump technique',
  'ex-lateral-med-ball-throw': 'lateral rotational medicine ball throw',
  'ex-front-squat': 'front squat',
  'ex-landmine-press': 'half kneeling landmine press',
  'ex-neutral-pulldown': 'neutral grip lat pulldown pull up',
  'ex-lateral-lunge': 'lateral lunge side lunge',
  'ex-pallof-press': 'pallof press',
  'ex-suitcase-carry': 'suitcase carry',
  'ex-tibialis-raise': 'tibialis raise',

  // Styrka C
  'ex-hip-thrust': 'barbell hip thrust',
  'ex-step-up': 'dumbbell step up box',
  'ex-incline-db-press': 'incline dumbbell press neutral grip',
  'ex-single-arm-cable-row': 'single arm cable row',
  'ex-leg-curl': 'leg curl machine hamstring',
  'ex-cable-reverse-fly': 'cable reverse fly rear delt',
  'ex-serratus-wall-slide': 'serratus wall slide',
  'ex-dead-bug': 'dead bug exercise exhale',

  // Axelblock
  'ex-isometric-ext-rot': 'isometric shoulder external rotation wall',
  'ex-scaption': 'scaption dumbbell raise',
  'ex-y-raise': 'prone incline bench Y raise',
  'ex-pushup-plus': 'push up plus serratus anterior',
  'ex-bottom-up-carry': 'bottom up kettlebell carry',

  // Daglig rörlighet
  'ex-ankle-wall': 'ankle dorsiflexion knee to wall drill',
  'ex-couch-stretch': 'couch stretch',
  'ex-adductor-stretch': 'adductor groin stretch',
  'ex-lat-stretch-bench': 'lat stretch hands on bench',

  // Kondition
  'ex-zone2': 'zone 2 training how to',
  'ex-intervals-2min': '2 minute interval training session',
  'ex-wall-sit': 'wall sit',
};

// Söktermen för en övning: mappad engelsk term för programmets övningar,
// annars övningens eget namn (funkar även på svenska).
export function searchTerm(ex) {
  return (SEARCH_TERMS[ex.id] || ex.name || '').trim();
}

// Länkar att visa för en övning. Egen länk först om den finns.
export function exerciseLinks(ex) {
  const links = [];
  const own = (ex.videoUrl || '').trim();
  if (own) {
    links.push({ label: 'Min länk', icon: '▶', url: normalizeUrl(own) });
  }
  const term = searchTerm(ex);
  if (term) {
    links.push({
      label: 'Videoklipp',
      icon: '▶',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${term} technique tutorial`)}`,
    });
    links.push({
      label: 'Instruktion',
      icon: '📖',
      url: `https://duckduckgo.com/?q=${encodeURIComponent(`${term} how to perform exercise instructions`)}`,
    });
  }
  return links;
}

// Tillåt att man klistrar in "youtube.com/watch?v=..." utan protokoll.
export function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
}
