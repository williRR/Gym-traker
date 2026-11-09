import assert from 'node:assert/strict';
import test from 'node:test';
import { loadProgressSessions, progressStats, summarizeProgress } from './progress.js';

const exercise = { nombre: 'Sentadilla' };
const log = (weight, reps, unidad, id = 7) => ({ exercise_id: id, peso_kg: weight, reps, unidad, exercises: exercise });

test('resume la mejor serie de cada sesión sin mezclar unidades', () => {
  const result = summarizeProgress([
    { id: 2, created_at: '2026-10-10T12:00:00Z', set_logs: [log(90, 6, 'lbs'), log(90, 8, 'lbs'), log(3, 10, 'discos'), log(99, 2, null)] },
    { id: 1, created_at: '2026-10-01T12:00:00Z', set_logs: [log(80, 10, 'lbs'), log(4, 9, 'discos')] },
    { id: 3, created_at: '2026-10-11T12:00:00Z', set_logs: [log(100, 8, 'lbs', 8)] },
  ]);
  const squat = result.find((item) => item.id === 7);
  assert.equal(squat.unknownCount, 1);
  assert.deepEqual(squat.units.lbs.map(({ weight, reps }) => [weight, reps]), [[80, 10], [90, 8]]);
  assert.deepEqual(squat.units.discos.map(({ weight }) => weight), [4, 3]);
  assert.equal(progressStats(squat.units.lbs).difference, 10);
  assert.equal(progressStats(squat.units.discos).difference, -1);
  assert.deepEqual(progressStats(squat.units.lbs).best, squat.units.lbs[1]);
});

test('excluye series antiguas y datos numéricos inválidos', () => {
  const [result] = summarizeProgress([{ id: 1, created_at: '2026-10-01T00:00:00Z', set_logs: [
    log(10, 8, null), log(null, 8, 'lbs'), log(5, 0, 'lbs'), log(0, 8, 'lbs'),
  ] }]);
  assert.equal(result.unknownCount, 1);
  assert.equal(result.units.lbs.length, 1);
  assert.equal(result.units.lbs[0].weight, 0);
  assert.equal(progressStats([]), null);
});

test('consulta solo al usuario y período solicitados y pagina las sesiones', async () => {
  const calls = [];
  const batches = [Array.from({ length: 200 }, (_, id) => ({ id })), [{ id: 200 }]];
  const client = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(value) { calls.push(['select', value]); return this; },
        eq(...args) { calls.push(['eq', ...args]); return this; },
        gte(...args) { calls.push(['gte', ...args]); return this; },
        lte(...args) { calls.push(['lte', ...args]); return this; },
        order(...args) { calls.push(['order', ...args]); return this; },
        range(...args) { calls.push(['range', ...args]); return Promise.resolve({ data: batches.shift(), error: null }); },
      };
    },
  };
  const start = new Date('2026-08-01T00:00:00Z');
  const end = new Date('2026-10-30T00:00:00Z');
  assert.equal((await loadProgressSessions(client, 7, start, end)).length, 201);
  assert.equal(calls.filter(([method]) => method === 'eq').every((call) => call[1] === 'user_id' && call[2] === 7), true);
  assert.deepEqual(calls.filter(([method]) => method === 'gte')[0], ['gte', 'created_at', start.toISOString()]);
  assert.deepEqual(calls.filter(([method]) => method === 'lte')[0], ['lte', 'created_at', end.toISOString()]);
  assert.deepEqual(calls.filter(([method]) => method === 'range'), [['range', 0, 199], ['range', 200, 399]]);
});

test('propaga errores de consulta', async () => {
  const error = new Error('sin conexión');
  const query = { select() { return this; }, eq() { return this; }, gte() { return this; }, lte() { return this; }, order() { return this; }, range() { return Promise.resolve({ error }); } };
  await assert.rejects(loadProgressSessions({ from: () => query }, 7, new Date(), new Date()), error);
});
