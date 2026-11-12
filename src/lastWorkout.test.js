import assert from 'node:assert/strict';
import test from 'node:test';
import { getLastWorkoutSets } from './lastWorkout.js';

function mockSupabase(responses) {
  const queries = [];
  return {
    queries,
    from(table) {
      const query = { table, calls: [] };
      queries.push(query);
      const builder = {
        select(...args) { query.calls.push(['select', ...args]); return this; },
        eq(...args) { query.calls.push(['eq', ...args]); return this; },
        in(...args) { query.calls.push(['in', ...args]); return this; },
        order(...args) { query.calls.push(['order', ...args]); return this; },
        limit(...args) { query.calls.push(['limit', ...args]); return this; },
        then(resolve, reject) {
          return Promise.resolve(responses[queries.indexOf(query)]).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

test('consulta la última sesión del ejercicio y usuario solicitados', async () => {
  const sets = [
    { num_serie: 1, peso_kg: 50, reps: 10, unidad: 'lbs' },
    { num_serie: 2, peso_kg: 2, reps: 8, unidad: 'discos' },
  ];
  const client = mockSupabase([
    { data: [{ id: 20 }, { id: 10 }], error: null },
    { data: [{ session_id: 10 }], error: null },
    { data: sets, error: null },
  ]);

  assert.deepEqual(await getLastWorkoutSets(client, 7, 3), sets);
  assert.deepEqual(client.queries, [
    { table: 'workout_sessions', calls: [
      ['select', 'id, created_at'],
      ['eq', 'user_id', 7],
      ['order', 'created_at', { ascending: false }],
    ] },
    { table: 'set_logs', calls: [
      ['select', 'session_id, workout_sessions!inner(created_at)'],
      ['in', 'session_id', [20, 10]],
      ['eq', 'exercise_id', 3],
      ['order', 'workout_sessions(created_at)', { ascending: false }],
      ['order', 'session_id', { ascending: false }],
      ['limit', 1],
    ] },
    { table: 'set_logs', calls: [
      ['select', 'num_serie, peso_kg, reps, unidad'],
      ['eq', 'session_id', 10],
      ['eq', 'exercise_id', 3],
      ['order', 'num_serie', { ascending: true }],
    ] },
  ]);
});

test('no consulta series cuando no hay sesiones o historial del ejercicio', async () => {
  const noSessions = mockSupabase([{ data: [], error: null }]);
  assert.deepEqual(await getLastWorkoutSets(noSessions, 7, 3), []);
  assert.equal(noSessions.queries.length, 1);

  const noExercise = mockSupabase([
    { data: [{ id: 20 }], error: null },
    { data: [], error: null },
  ]);
  assert.deepEqual(await getLastWorkoutSets(noExercise, 7, 3), []);
  assert.equal(noExercise.queries.length, 2);
});

test('excluye la sesión actual al mostrar la sesión anterior', async () => {
  const client = mockSupabase([
    { data: [{ id: 20 }, { id: 10 }], error: null },
    { data: [], error: null },
  ]);
  assert.deepEqual(await getLastWorkoutSets(client, 7, 3, 20), []);
  assert.deepEqual(client.queries[1].calls.find((call) => call[0] === 'in'), ['in', 'session_id', [10]]);
});

test('propaga errores en cualquiera de las consultas', async () => {
  const failure = new Error('Error de conexión');
  const success = [
    { data: [{ id: 20 }], error: null },
    { data: [{ session_id: 20 }], error: null },
    { data: [], error: null },
  ];

  for (let index = 0; index < success.length; index += 1) {
    const responses = success.map((response, i) => i === index ? { data: null, error: failure } : response);
    await assert.rejects(getLastWorkoutSets(mockSupabase(responses), 7, 3), failure);
  }
});
