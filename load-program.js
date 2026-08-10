// load-program.js — Läser in standardprogrammet i databasen.
// Idempotent: poster med id som redan finns hoppas över, så egna ändringar
// och loggad historik rörs aldrig. Kan köras om när som helst.

import { getExercise, getRoutine, bulkPut, STORE_EXERCISES, STORE_ROUTINES } from './db.js';
import { normalizeExercise, normalizeRoutine } from './model.js';
import { DEFAULT_EXERCISES, DEFAULT_ROUTINES } from './program-default.js';

export async function loadDefaultProgram() {
  const now = new Date().toISOString();

  const newExercises = [];
  for (const seed of DEFAULT_EXERCISES) {
    if (await getExercise(seed.id)) continue;
    newExercises.push(normalizeExercise({ ...seed, builtin: true, createdAt: now, updatedAt: now }));
  }
  await bulkPut(STORE_EXERCISES, newExercises);

  const newRoutines = [];
  for (const seed of DEFAULT_ROUTINES) {
    if (await getRoutine(seed.id)) continue;
    newRoutines.push(normalizeRoutine({ ...seed, builtin: true, createdAt: now, updatedAt: now }));
  }
  await bulkPut(STORE_ROUTINES, newRoutines);

  return {
    exercises: newExercises.length,
    routines: newRoutines.length,
    exercisesTotal: DEFAULT_EXERCISES.length,
    routinesTotal: DEFAULT_ROUTINES.length,
  };
}

// Hur mycket av standardprogrammet saknas just nu?
export async function missingFromProgram() {
  let exercises = 0;
  let routines = 0;
  for (const seed of DEFAULT_EXERCISES) if (!(await getExercise(seed.id))) exercises++;
  for (const seed of DEFAULT_ROUTINES) if (!(await getRoutine(seed.id))) routines++;
  return { exercises, routines };
}
