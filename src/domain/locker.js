const now = () => new Date().toISOString();

const dimensionVolume = (dimensions) => (dimensions.width * dimensions.height * dimensions.depth) / 1_000_000;

export const DEFAULT_LOCKER_TYPES = [
  {
    id: 'small', name: 'Small', code: 'S', dimensions: { width: 260, height: 180, depth: 600 }, capacityLitres: 28.1,
    weightCapacityKg: 12, allowedUsage: 'Documents, small parcels, accessories', material: 'Powder-coated galvanized steel', thicknessMm: 1.2,
    hardware: { lock: 'Electronic cam lock', sensor: 'Magnetic door sensor', indicator: 'RGB status LED' },
  },
  {
    id: 'medium', name: 'Medium', code: 'M', dimensions: { width: 260, height: 280, depth: 600 }, capacityLitres: 43.7,
    weightCapacityKg: 20, allowedUsage: 'Shoeboxes, grocery bags, standard parcels', material: 'Powder-coated galvanized steel', thicknessMm: 1.2,
    hardware: { lock: 'Electronic cam lock', sensor: 'Magnetic door sensor', indicator: 'RGB status LED' },
  },
  {
    id: 'large', name: 'Large', code: 'L', dimensions: { width: 260, height: 420, depth: 600 }, capacityLitres: 65.5,
    weightCapacityKg: 32, allowedUsage: 'Large parcels, grocery crates, return shipments', material: 'Powder-coated galvanized steel', thicknessMm: 1.5,
    hardware: { lock: 'Reinforced electronic lock', sensor: 'Magnetic door sensor', indicator: 'RGB status LED' },
  },
];

export const createLockerType = (type) => ({
  ...type,
  dimensions: { ...type.dimensions },
  hardware: { ...type.hardware },
  capacityLitres: Number(type.capacityLitres ?? dimensionVolume(type.dimensions).toFixed(1)),
});

export const createDefaultConfig = () => {
  const types = DEFAULT_LOCKER_TYPES.map(createLockerType);
  return {
    schemaVersion: 1,
    project: { name: 'North Hub smart locker study', createdAt: now(), updatedAt: now() },
    lockerTypes: types,
    demand: { small: 15, medium: 10, large: 5 },
    constraints: { maxWidthMm: 1400, maxHeightMm: 2200, maxDepthMm: 600, dividerMm: 10, frameMm: 25, doorGapMm: 4, controllerWidthMm: 160, preferredModuleWidthMm: 300 },
    candidates: [], activeCandidateId: null, manufacturing: null,
  };
};

export const cloneConfig = (config) => JSON.parse(JSON.stringify(config));

export const countLockers = (lockers = []) => lockers.reduce((counts, locker) => {
  counts[locker.typeId] = (counts[locker.typeId] || 0) + 1;
  return counts;
}, {});

export const validateConfig = (config) => {
  const errors = [];
  if (!config || !Array.isArray(config.lockerTypes)) return { valid: false, errors: ['A locker type definition is required.'] };
  const typeIds = new Set();
  config.lockerTypes.forEach((type) => {
    if (!type?.id || typeIds.has(type.id)) errors.push('Locker type ids must be unique and non-empty.');
    typeIds.add(type?.id);
    const dimensions = type?.dimensions || {};
    ['width', 'height', 'depth'].forEach((key) => {
      if (!Number.isFinite(Number(dimensions[key])) || Number(dimensions[key]) <= 0) errors.push(`${type?.name || type?.id || 'Locker'} ${key} must be greater than zero.`);
    });
    if (!Number.isFinite(Number(type?.thicknessMm)) || Number(type.thicknessMm) <= 0) errors.push(`${type?.name || type?.id || 'Locker'} thickness must be greater than zero.`);
  });
  Object.entries(config.demand || {}).forEach(([typeId, quantity]) => {
    if (!typeIds.has(typeId)) errors.push(`Demand references missing locker type: ${typeId}.`);
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) errors.push(`Demand for ${typeId} must be a non-negative whole number.`);
  });
  const constraints = config.constraints || {};
  ['maxWidthMm', 'maxHeightMm', 'maxDepthMm', 'dividerMm', 'frameMm', 'doorGapMm', 'controllerWidthMm', 'preferredModuleWidthMm'].forEach((key) => {
    if (!Number.isFinite(Number(constraints[key])) || Number(constraints[key]) <= 0) errors.push(`${key} must be greater than zero.`);
  });
  const totalDemand = Object.values(config.demand || {}).reduce((total, value) => total + Number(value || 0), 0);
  if (totalDemand === 0) errors.push('At least one locker is required.');
  const maxLockerDepth = Math.max(0, ...config.lockerTypes.map((type) => Number(type.dimensions?.depth || 0)));
  if (Number(constraints.maxDepthMm) < maxLockerDepth) errors.push('Maximum cabinet depth is smaller than a locker depth.');
  return { valid: errors.length === 0, errors };
};

export const volumeLitres = dimensionVolume;
