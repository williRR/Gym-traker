import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSessionExerciseSets, saveSessionExerciseSets, toEditableSets } from './sessionSets.js';

function createClient(initial) {
  let rows = initial.map((row) => ({ ...row }));
  let nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;
  let failure = null;
  const client = {
    rows: () => rows,
    failOn: (operation, occurrence = 1) => { failure = { operation, occurrence }; },
    from() {
      let action = 'read';
      let values;
      const filters = [];
      const builder = {
        select() { return this; },
        update(value) { action = 'update'; values = value; return this; },
        insert(value) { action = 'insert'; values = value; return this; },
        delete() { action = 'delete'; return this; },
        eq(key, value) { filters.push((row) => row[key] === value); return this; },
        in(key, value) { filters.push((row) => value.includes(row[key])); return this; },
        order() { return this; },
        then(resolve, reject) {
          if (failure?.operation === action && --failure.occurrence === 0) {
            failure = null;
            return Promise.resolve({ data: null, error: new Error('Error simulado') }).then(resolve, reject);
          }
          const matching = rows.filter((row) => filters.every((filter) => filter(row)));
          if (action === 'update') matching.forEach((row) => Object.assign(row, values));
          if (action === 'insert') rows.push({ id: nextId++, ...values });
          if (action === 'delete') rows = rows.filter((row) => !matching.includes(row));
          return Promise.resolve({ data: matching.map((row) => ({ ...row })), error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return client;
}

test('guarda, edita, agrega y elimina series sin duplicar ni afectar otros ejercicios', async () => {
  const client = createClient([{ id: 8, session_id: 1, exercise_id: 9, num_serie: 1, peso_kg: 50, reps: 8, unidad: 'lbs' }]);
  const sets = [{ peso_kg: '0', reps: '10', unidad: 'lbs' }, { peso_kg: '3', reps: '8', unidad: 'discos' }];
  await saveSessionExerciseSets(client, 1, 7, sets);
  await saveSessionExerciseSets(client, 1, 7, sets);
  assert.equal((await loadSessionExerciseSets(client, 1, 7)).length, 2);
  await saveSessionExerciseSets(client, 1, 7, [{ peso_kg: '4', reps: '12', unidad: 'discos' }]);
  const saved = await loadSessionExerciseSets(client, 1, 7);
  assert.equal(saved.length, 1);
  assert.deepEqual(toEditableSets(saved), [{ peso_kg: '4', reps: '12', unidad: 'discos' }]);
  assert.equal(client.rows().find((row) => row.id === 8).peso_kg, 50);
});

test('un fallo parcial se propaga y un reintento no duplica series', async () => {
  const client = createClient([]);
  const sets = [{ peso_kg: '10', reps: '8', unidad: 'lbs' }, { peso_kg: '20', reps: '8', unidad: 'lbs' }];
  client.failOn('insert', 2);
  await assert.rejects(saveSessionExerciseSets(client, 1, 7, sets), /Error simulado/);
  assert.equal((await loadSessionExerciseSets(client, 1, 7)).length, 1);
  await saveSessionExerciseSets(client, 1, 7, sets);
  assert.equal((await loadSessionExerciseSets(client, 1, 7)).length, 2);
});

test('mantiene unidad desconocida y cero al editar datos previos', () => {
  assert.deepEqual(toEditableSets([{ peso_kg: 0, reps: 8, unidad: null }]), [{ peso_kg: '0', reps: '8', unidad: null }]);
});
