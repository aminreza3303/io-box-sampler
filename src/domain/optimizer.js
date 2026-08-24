import { validateConfig, volumeLitres } from './locker.js';

const SCORE_WEIGHTS = { widthFit: 0.12, heightFit: 0.12, spaceUse: 0.16, manufacturing: 0.16, accessibility: 0.14, balance: 0.10, cableRouting: 0.10, serviceAccess: 0.10 };
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deviationScore = (values) => {
  const mean = average(values);
  if (!mean) return 100;
  const deviation = Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
  return clamp(100 - (deviation / mean) * 100);
};

const flattenDemand = (config) => {
  const types = new Map(config.lockerTypes.map((type) => [type.id, type]));
  return Object.entries(config.demand)
    .flatMap(([typeId, quantity]) => Array.from({ length: Number(quantity) }, (_, index) => ({ id: `${typeId}-${index + 1}`, typeId })))
    .sort((a, b) => (types.get(b.typeId).dimensions.height - types.get(a.typeId).dimensions.height) || a.typeId.localeCompare(b.typeId) || a.id.localeCompare(b.id));
};

const buildGridCandidate = (lockers, config) => {
  const { columns, rows } = config.layout;
  const types = new Map(config.lockerTypes.map((type) => [type.id, type]));
  const cells = Array.from({ length: rows * columns }, (_, index) => ({ row: Math.floor(index / columns), column: index % columns, locker: lockers[index] }));
  const columnWidths = Array.from({ length: columns }, (_, column) => Math.max(...cells.filter((cell) => cell.column === column).map((cell) => types.get(cell.locker.typeId).dimensions.width)));
  const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(...cells.filter((cell) => cell.row === row).map((cell) => types.get(cell.locker.typeId).dimensions.height)));
  const { constraints } = config;
  const width = columnWidths.reduce((sum, value) => sum + value, 0) + ((columns + 1) * constraints.dividerMm) + (constraints.frameMm * 2);
  const height = rowHeights.reduce((sum, value) => sum + value, 0) + ((rows + 1) * constraints.dividerMm) + (constraints.frameMm * 2) + (constraints.doorGapMm * 2);
  const depth = Math.max(...config.lockerTypes.map((type) => type.dimensions.depth)) + constraints.frameMm + constraints.doorGapMm;
  const totalLockerVolume = lockers.reduce((total, locker) => total + volumeLitres(types.get(locker.typeId).dimensions), 0);
  const cabinetVolume = (width * height * depth) / 1_000_000;
  const uniqueWidths = new Set(columnWidths).size;
  const uniqueHeights = new Set(rowHeights).size;
  const widthFit = deviationScore(columnWidths);
  const heightFit = deviationScore(rowHeights);
  const spaceUse = clamp((totalLockerVolume / cabinetVolume) * 100);
  const manufacturing = clamp(100 - ((uniqueWidths - 1) * 12) - ((uniqueHeights - 1) * 10));
  const accessibility = clamp(100 - Math.max(0, Math.max(...rowHeights) - 420) / 5);
  const balance = clamp((widthFit + heightFit) / 2);
  const cableRouting = clamp(100 - (uniqueWidths - 1) * 8);
  const serviceAccess = 96;
  const metrics = { widthFit, heightFit, spaceUse, manufacturing, accessibility, balance, cableRouting, serviceAccess };
  const score = clamp(Object.entries(SCORE_WEIGHTS).reduce((total, [key, weight]) => total + metrics[key] * weight, 0));
  const layoutLockers = cells.map(({ row, column, locker }) => ({ ...locker, row, column }));
  const controllerSlotId = layoutLockers.find((locker) => locker.row === 0 && locker.column === columns - 1)?.id || layoutLockers[0]?.id || null;
  return {
    id: `layout-${columns}x${rows}`,
    columns,
    rows,
    lockers: layoutLockers,
    columnWidths,
    rowHeights,
    controllerSlotId,
    dimensions: { width, height, depth },
    metrics,
    score: Number(score.toFixed(1)),
    internalVolumeLitres: Number(totalLockerVolume.toFixed(1)),
    cabinetVolumeLitres: Number(cabinetVolume.toFixed(1)),
    utilization: Number(((totalLockerVolume / cabinetVolume) * 100).toFixed(1)),
    warnings: ['Overall cabinet dimensions are derived from the entered grid and locker definitions.'],
  };
};

export const generateLayouts = (config) => {
  const validation = validateConfig(config);
  if (!validation.valid) return { candidates: [], errors: validation.errors };
  return { candidates: [buildGridCandidate(flattenDemand(config), config)], errors: [] };
};

export const scoreWeights = SCORE_WEIGHTS;
