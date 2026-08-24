import { validateConfig, volumeLitres } from './locker.js';

const SCORE_WEIGHTS = { widthFit: 0.12, heightFit: 0.12, spaceUse: 0.16, manufacturing: 0.16, accessibility: 0.14, balance: 0.10, cableRouting: 0.10, serviceAccess: 0.10 };
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const stackHeight = (stack, types) => stack.reduce((total, locker) => total + types.get(locker.typeId).dimensions.height, 0);

const flattenDemand = (config) => {
  const types = new Map(config.lockerTypes.map((type) => [type.id, type]));
  return Object.entries(config.demand)
    .flatMap(([typeId, quantity]) => Array.from({ length: Number(quantity) }, (_, index) => ({ id: `${typeId}-${index + 1}`, typeId })))
    .sort((a, b) => (types.get(b.typeId).dimensions.height - types.get(a.typeId).dimensions.height) || a.typeId.localeCompare(b.typeId) || a.id.localeCompare(b.id));
};

const scoreCandidate = (stacks, config, dimensions, lockers, types) => {
  const { constraints } = config;
  const totalLockerVolume = lockers.reduce((total, locker) => total + volumeLitres(types.get(locker.typeId).dimensions), 0);
  const cabinetVolume = (dimensions.width * dimensions.height * dimensions.depth) / 1_000_000;
  const widthFit = clamp(100 - ((constraints.maxWidthMm - dimensions.width) / constraints.maxWidthMm) * 45);
  const heightFit = clamp(100 - ((constraints.maxHeightMm - dimensions.height) / constraints.maxHeightMm) * 45);
  const spaceUse = clamp((totalLockerVolume / cabinetVolume) * 100);
  const uniqueWidths = new Set(lockers.map((locker) => types.get(locker.typeId).dimensions.width)).size;
  const manufacturing = clamp(100 - (uniqueWidths - 1) * 12 - Math.max(0, stacks.length - 4) * 4);
  const maxStack = Math.max(...stacks.map((stack) => stack.length));
  const accessibility = clamp(100 - Math.max(0, maxStack - 8) * 7 - Math.max(0, dimensions.height - 1900) / 10);
  const heights = stacks.map((stack) => stackHeight(stack, types));
  const meanHeight = average(heights);
  const balance = clamp(100 - (Math.max(...heights) - Math.min(...heights)) / Math.max(meanHeight, 1) * 100);
  const cableRouting = clamp(100 - Math.max(0, stacks.length - 4) * 8 - Math.abs(stacks.length - 3) * 3);
  const serviceAccess = clamp(100 - Math.max(0, dimensions.height - 2000) / 8 - Math.max(0, stacks.length - 6) * 5);
  const metrics = { widthFit, heightFit, spaceUse, manufacturing, accessibility, balance, cableRouting, serviceAccess };
  const score = clamp(Object.entries(SCORE_WEIGHTS).reduce((total, [key, weight]) => total + metrics[key] * weight, 0));
  return { metrics, score, totalLockerVolume, cabinetVolume };
};

const buildCandidate = (columnCount, lockers, config) => {
  const types = new Map(config.lockerTypes.map((type) => [type.id, type]));
  const stacks = Array.from({ length: columnCount }, () => []);
  lockers.forEach((locker) => {
    let shortestIndex = 0;
    for (let index = 1; index < stacks.length; index += 1) {
      if (stackHeight(stacks[index], types) < stackHeight(stacks[shortestIndex], types)) shortestIndex = index;
    }
    stacks[shortestIndex].push(locker);
  });
  const { constraints } = config;
  const moduleWidth = Math.max(...config.lockerTypes.map((type) => type.dimensions.width));
  const width = (columnCount * moduleWidth) + ((columnCount + 1) * constraints.dividerMm) + (constraints.frameMm * 2);
  const height = Math.max(...stacks.map((stack) => stackHeight(stack, types))) + (constraints.frameMm * 2) + (constraints.doorGapMm * 2);
  const depth = Math.max(...config.lockerTypes.map((type) => type.dimensions.depth));
  if (width > constraints.maxWidthMm || height > constraints.maxHeightMm || depth > constraints.maxDepthMm) return null;
  const { metrics, score, totalLockerVolume, cabinetVolume } = scoreCandidate(stacks, config, { width, height, depth }, lockers, types);
  const layoutLockers = stacks.flatMap((stack, column) => stack.map((locker, row) => ({ ...locker, column, row })));
  const controllerSlotId = layoutLockers.find((locker) => locker.row === 0 && locker.column === columnCount - 1)?.id || layoutLockers.find((locker) => locker.row === 0)?.id || null;
  return {
    id: `layout-${columnCount}-${stacks.map((stack) => stack.map((locker) => types.get(locker.typeId).code).join('')).join('-')}`,
    columns: columnCount, rows: Math.max(...stacks.map((stack) => stack.length)), lockers: layoutLockers, controllerSlotId,
    dimensions: { width, height, depth }, metrics, score: Number(score.toFixed(1)),
    internalVolumeLitres: Number(totalLockerVolume.toFixed(1)), cabinetVolumeLitres: Number(cabinetVolume.toFixed(1)),
    utilization: Number(((totalLockerVolume / cabinetVolume) * 100).toFixed(1)),
    warnings: height > constraints.maxHeightMm * 0.9 ? ['Upper service zone is close to the maximum cabinet height.'] : [],
  };
};

export const generateLayouts = (config) => {
  const validation = validateConfig(config);
  if (!validation.valid) return { candidates: [], errors: validation.errors };
  const lockers = flattenDemand(config);
  const maxColumns = Math.min(lockers.length, Math.max(1, Math.floor(config.constraints.maxWidthMm / config.constraints.preferredModuleWidthMm) + 2));
  const candidates = [];
  const signatures = new Set();
  for (let columnCount = 1; columnCount <= maxColumns; columnCount += 1) {
    const candidate = buildCandidate(columnCount, lockers, config);
    if (!candidate) continue;
    const signature = candidate.lockers.map((locker) => `${locker.column}:${locker.row}:${locker.typeId}`).join('|');
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    candidates.push(candidate);
  }
  candidates.sort((a, b) => b.score - a.score || a.dimensions.width - b.dimensions.width || a.columns - b.columns);
  if (!candidates.length) return { candidates: [], errors: ['No feasible layout fits the current cabinet constraints.'] };
  return { candidates: candidates.slice(0, 6), errors: [] };
};

export const scoreWeights = SCORE_WEIGHTS;
