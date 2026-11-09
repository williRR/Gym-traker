import assert from 'node:assert/strict';
import test from 'node:test';
import { weightUnitLabel } from './weightUnit.js';

test('muestra la unidad guardada sin inferirla del peso', () => {
  assert.equal(weightUnitLabel('lbs'), 'lbs');
  assert.equal(weightUnitLabel('discos'), 'discos');
  assert.equal(weightUnitLabel(null), 'unidad no confirmada');
  assert.equal(weightUnitLabel(undefined), 'unidad no confirmada');
});
