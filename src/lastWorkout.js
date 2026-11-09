export async function getLastWorkoutSets(supabase, userId, exerciseId) {
  const { data: userSessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (sessionsError) throw sessionsError;
  if (!userSessions?.length) return [];

  const { data: latestLog, error: logError } = await supabase
    .from('set_logs')
    .select('session_id, created_at')
    .in('session_id', userSessions.map((session) => session.id))
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (logError) throw logError;
  if (!latestLog?.length) return [];

  const { data: sessionSets, error: setsError } = await supabase
    .from('set_logs')
    .select('num_serie, peso_kg, reps, unidad')
    .eq('session_id', latestLog[0].session_id)
    .eq('exercise_id', exerciseId)
    .order('num_serie', { ascending: true });

  if (setsError) throw setsError;
  return sessionSets || [];
}
