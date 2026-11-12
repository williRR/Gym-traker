export function emptySet() {
  return { peso_kg: '', reps: '', unidad: 'lbs' };
}

export async function loadSessionExerciseSets(client, sessionId, exerciseId) {
  const { data, error } = await client.from('set_logs')
    .select('id, num_serie, peso_kg, reps, unidad')
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .order('num_serie', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function toEditableSets(sets) {
  return sets.map((set) => ({
    peso_kg: String(set.peso_kg ?? ''),
    reps: String(set.reps ?? ''),
    unidad: set.unidad,
  }));
}

export async function saveSessionExerciseSets(client, sessionId, exerciseId, sets) {
  const existing = await loadSessionExerciseSets(client, sessionId, exerciseId);
  for (let index = 0; index < sets.length; index += 1) {
    const values = {
      session_id: sessionId,
      exercise_id: exerciseId,
      num_serie: index + 1,
      peso_kg: Number(sets[index].peso_kg),
      reps: Number(sets[index].reps),
      unidad: sets[index].unidad ?? null,
    };
    if (existing[index]) {
      const { data, error } = await client.from('set_logs').update(values)
        .eq('id', existing[index].id)
        .eq('session_id', sessionId)
        .eq('exercise_id', exerciseId)
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('No se pudo actualizar una serie guardada.');
    } else {
      const { error } = await client.from('set_logs').insert(values);
      if (error) throw error;
    }
  }
  const removedIds = existing.slice(sets.length).map((set) => set.id);
  if (removedIds.length) {
    const { data, error } = await client.from('set_logs').delete()
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .in('id', removedIds)
      .select('id');
    if (error) throw error;
    if (!data || data.length !== removedIds.length) throw new Error('No se pudieron eliminar todas las series.');
  }
}
