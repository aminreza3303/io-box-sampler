import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultConfig } from '../src/app/defaultConfig.js';
import { exportConfigJson, exportManufacturingCsv } from '../src/app/export.js';
import { configReducer, createInitialState, generateConfig } from '../src/app/useConfigurator.js';
import { deriveManufacturing } from '../src/domain/manufacturing.js';
import { generateLayouts } from '../src/domain/optimizer.js';

test('JSON export preserves the schema version', () => {
  const config = createDefaultConfig();
  const exported = JSON.parse(exportConfigJson(config));
  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.layout.groundClearanceMm, 150);
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
  const edited = configReducer(initial, { type: 'EDIT_CONFIG', update: (config) => ({ ...config, project: { ...config.project, name: 'Updated project' } }) });
  const generated = generateConfig(edited.config);
  const next = configReducer(edited, { type: 'FINISH_GENERATE', ...generated });
  assert.ok(next.config.activeCandidateId);
  assert.ok(next.config.candidates.length > 0);
});

test('ground clearance update preserves generated geometry and refreshes final dimensions', () => {
  const initial = createInitialState(createDefaultConfig());
  const before = initial.config.candidates[0].finalDimensions;
  const next = configReducer(initial, { type: 'EDIT_LAYOUT', field: 'groundClearanceMm', value: 450 });
  const after = next.config.candidates[0].finalDimensions;
  assert.equal(next.config.layout.groundClearanceMm, 450);
  assert.deepEqual([after.cabinetWidthMm, after.cabinetHeightMm, after.cabinetDepthMm], [before.cabinetWidthMm, before.cabinetHeightMm, before.cabinetDepthMm]);
  assert.equal(after.installedTopMm - before.installedTopMm, 300);
});
