import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../src/app/defaultConfig.js';
import { exportConfigJson, exportManufacturingCsv } from '../src/app/export.js';
import { configReducer, createInitialState, generateConfig } from '../src/app/useConfigurator.js';
import { deriveManufacturing } from '../src/domain/manufacturing.js';
import { generateLayouts } from '../src/domain/optimizer.js';

test('JSON export preserves the schema version', () => {
  const config = createDefaultConfig();
  assert.equal(JSON.parse(exportConfigJson(config)).schemaVersion, 1);
});

test('manufacturing CSV has a header and quoted rows', () => {
  const config = createDefaultConfig();
  const spec = deriveManufacturing(config, generateLayouts(config).candidates[0]);
  const csv = exportManufacturingCsv(spec);
  assert.match(csv, /"Item","Quantity"/);
  assert.match(csv, /"Electronic lock"/);
});

test('edit action clears stale generated candidates', () => {
  const initial = createInitialState(createDefaultConfig());
  const next = configReducer(initial, { type: 'EDIT_CONFIG', update: (config) => ({ ...config, demand: { ...config.demand, small: 16 } }) });
  assert.equal(next.config.demand.small, 16);
  assert.deepEqual(next.config.candidates, []);
  assert.equal(next.config.activeCandidateId, null);
});

test('generate action creates an active candidate', () => {
  const initial = createInitialState(createDefaultConfig());
  const edited = configReducer(initial, { type: 'EDIT_CONFIG', update: (config) => ({ ...config, demand: { ...config.demand, small: 16 } }) });
  const generated = generateConfig(edited.config);
  const next = configReducer(edited, { type: 'FINISH_GENERATE', ...generated });
  assert.ok(next.config.activeCandidateId);
  assert.ok(next.config.candidates.length > 0);
});
