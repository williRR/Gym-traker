import assert from 'node:assert/strict';
import test from 'node:test';
import { sortLegExercises } from './legExercises.js';

const exercises = [
  { id: 12, nombre: 'Abdomen', categoria: 'pierna' },
  { id: 6, nombre: 'Espalda baja', categoria: 'espalda' },
  { id: 11, nombre: 'Pantorrilla', categoria: 'pierna' },
  { id: 9, nombre: 'Curl femoral', categoria: 'pierna' },
  { id: 24, nombre: 'Prensa de pierna 45°', categoria: 'pierna' },
  { id: 10, nombre: 'Hip Thrust', categoria: 'pierna' },
  { id: 7, nombre: 'Sentadilla (Hack / Smith / Libre)', categoria: 'pierna' },
  { id: 8, nombre: 'Extensiones de pierna', categoria: 'pierna' },
  { id: 23, nombre: 'Sentadilla libre', categoria: 'pierna' },
  { id: 3, nombre: 'Hombro posterior', categoria: 'espalda' },
];

test('ordena los siete ejercicios y reutiliza espalda baja', () => {
  assert.deepEqual(sortLegExercises(exercises).map((exercise) => exercise.id), [8, 7, 10, 9, 6, 11, 12]);
});

test('conserva el orden anterior para restaurar borradores sin identificador', () => {
  assert.deepEqual(sortLegExercises(exercises, true).map((exercise) => exercise.id), [7, 8, 10, 9, 11]);
});
