const PAGE_SIZE = 200;

export async function loadProgressSessions(client, userId, start, end) {
  const sessions = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from('workout_sessions')
      .select('id, created_at, set_logs (id, exercise_id, peso_kg, reps, unidad, exercises (nombre))')
      .eq('user_id', userId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    sessions.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return sessions;
  }
}

export function summarizeProgress(sessions) {
  const exercises = new Map();
  for (const session of sessions) {
    for (const log of session.set_logs || []) {
      if (log.exercise_id == null || !log.exercises?.nombre) continue;
      if (!exercises.has(log.exercise_id)) {
        exercises.set(log.exercise_id, {
          id: log.exercise_id,
          name: log.exercises.nombre,
          unknownCount: 0,
          units: { lbs: new Map(), discos: new Map() },
        });
      }
      const exercise = exercises.get(log.exercise_id);
      if (log.unidad !== 'lbs' && log.unidad !== 'discos') {
        exercise.unknownCount += 1;
        continue;
      }
      const weight = Number(log.peso_kg);
      const reps = Number(log.reps);
      if (log.peso_kg == null || log.reps == null || !Number.isFinite(weight) ||
          !Number.isInteger(reps) || weight < 0 || reps <= 0) continue;
      const previous = exercise.units[log.unidad].get(session.id);
      if (!previous || weight > previous.weight || (weight === previous.weight && reps > previous.reps)) {
        exercise.units[log.unidad].set(session.id, {
          sessionId: session.id,
          date: session.created_at,
          weight,
          reps,
        });
      }
    }
  }

  return [...exercises.values()].map((exercise) => ({
    ...exercise,
    units: Object.fromEntries(Object.entries(exercise.units).map(([unit, points]) => [
      unit,
      [...points.values()].sort((a, b) => new Date(a.date) - new Date(b.date) || String(a.sessionId).localeCompare(String(b.sessionId), undefined, { numeric: true })),
    ])),
  })).sort((a, b) => a.name.localeCompare(b.name, 'es') || String(a.id).localeCompare(String(b.id)));
}

export function progressStats(points) {
  if (!points.length) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((top, point) =>
    point.weight > top.weight || (point.weight === top.weight && point.reps > top.reps) ? point : top);
  return { first, last, best, difference: last.weight - first.weight, count: points.length };
}
