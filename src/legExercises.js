function legExerciseScore(exercise, legacyOrder = false) {
  const name = (exercise?.nombre || '').toLowerCase();
  if (name.includes('sentadilla')) return legacyOrder ? 0 : 1;
  if (name.includes('extensiones')) return legacyOrder ? 1 : 0;
  if (name.includes('hip thrust') || name.includes('hiptrust')) return 2;
  if (name.includes('femoral') || name.includes('isquios') || name.includes('curl')) return 3;
  if (!legacyOrder && name.includes('espalda baja')) return 4;
  if (name.includes('pantorrilla')) return legacyOrder ? 4 : 5;
  if (!legacyOrder && (name.includes('abdomen') || name.includes('abdominal'))) return 6;
  return -1;
}

export function sortLegExercises(exercises, legacyOrder = false) {
  const selected = new Map();
  exercises.forEach((exercise) => {
    if (exercise.categoria !== 'pierna' &&
        !(exercise.categoria === 'espalda' && (exercise.nombre || '').toLowerCase().includes('espalda baja'))) {
      return;
    }
    const score = legExerciseScore(exercise, legacyOrder);
    if (score !== -1 && !selected.has(score)) selected.set(score, exercise);
  });
  return [...selected.entries()].sort(([a], [b]) => a - b).map(([, exercise]) => exercise);
}
