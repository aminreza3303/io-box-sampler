import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../src/app/defaultConfig.js';
import { generateLayouts } from '../src/domain/optimizer.js';
import { deriveManufacturing } from '../src/domain/manufacturing.js';

const countByType = (lockers) => lockers.reduce((counts, locker) => {
  counts[locker.typeId] = (counts[locker.typeId] || 0) + 1;
  return counts;
}, {});

test('default config contains exact sample demand', () => {
  assert.deepEqual(createDefaultConfig().demand, { small: 15, medium: 10, large: 5 });
});

test('optimizer preserves every requested locker', () => {
  const { candidates } = generateLayouts(createDefaultConfig());
  assert.ok(candidates.length > 0);
  assert.deepEqual(countByType(candidates[0].lockers), { small: 15, medium: 10, large: 5 });
});

test('optimizer rejects a depth-incompatible configuration', () => {
  const config = createDefaultConfig();
  config.constraints.maxDepthMm = 100;
  const result = generateLayouts(config);
  assert.deepEqual(result.candidates, []);
  assert.match(result.errors[0], /depth/i);
});

test('optimizer rejects a grid whose cells do not equal demand', () => {
  const config = createDefaultConfig();
  config.layout = { columns: 4, rows: 8 };
  const result = generateLayouts(config);
  assert.deepEqual(result.candidates, []);
  assert.match(result.errors[0], /32 cells/);
});

test('ranking is deterministic and scores stay in range', () => {
  const first = generateLayouts(createDefaultConfig()).candidates;
  const second = generateLayouts(createDefaultConfig()).candidates;
  assert.deepEqual(first, second);
  assert.ok(first.every((candidate) => candidate.score >= 0 && candidate.score <= 100));
});

test('manufacturing quantities reflect the selected candidate', () => {
  const config = createDefaultConfig();
  const candidate = generateLayouts(config).candidates[0];
  const spec = deriveManufacturing(config, candidate);
  assert.equal(spec.hardware.find((item) => item.item === 'Electronic lock').quantity, candidate.lockers.length);
  assert.ok(spec.materials.some((item) => item.name === 'Locker door sheet'));
  assert.ok(spec.materials.some((item) => item.name === 'Controller locker fit-out'));
});

test('controller uses an existing top-row cell without adding cabinet width', () => {
  const config = createDefaultConfig();
  const candidate = generateLayouts(config).candidates[0];
  const controllerSlot = candidate.lockers.find((locker) => locker.id === candidate.controllerSlotId);
  assert.ok(controllerSlot);
  assert.equal(controllerSlot.row, 0);
  assert.equal(candidate.dimensions.width, (candidate.columns * 260) + ((candidate.columns + 1) * 10) + (25 * 2));
});
