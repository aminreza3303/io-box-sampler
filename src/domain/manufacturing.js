export const deriveManufacturing = (config, candidate) => {
  const count = candidate.lockers.length;
  const columns = candidate.columns;
  const seams = Math.max(0, columns - 1);
  return {
    materials: [
      { name: 'Structural frame', material: 'Galvanized mild steel', thicknessMm: 2, method: 'Laser cut, press-brake bend, bolted', quantity: columns + 2 },
      { name: 'Locker door sheet', material: 'Powder-coated galvanized steel', thicknessMm: 1.2, method: 'CNC cut and formed', quantity: count },
      { name: 'Divider and back panel', material: 'Galvanized steel', thicknessMm: 1.2, method: 'CNC cut and folded', quantity: count + columns + 1 },
      { name: 'Module reinforcement', material: 'Folded steel angle', thicknessMm: 2, method: 'Press-brake bend', quantity: columns },
      { name: 'Vertical cable channel', material: 'PVC or formed steel', thicknessMm: 1, method: 'Cut to module height', quantity: columns },
      { name: 'Controller locker fit-out', material: 'Existing top-row locker', thicknessMm: 1.2, method: 'Install service plate inside selected locker', quantity: 1 },
    ],
    hardware: [
      { item: 'Electronic lock', quantity: count, placement: 'One per locker door' },
      { item: 'Door sensor', quantity: count, placement: 'One per locker door frame' },
      { item: 'Status indicator', quantity: count, placement: 'One per locker fascia' },
      { item: 'Hinge set', quantity: count, placement: 'Two concealed hinges per door' },
      { item: 'Seal set', quantity: count, placement: 'Perimeter seal per door' },
      { item: 'Fastener set', quantity: count + seams * 8, placement: 'Locker and module assembly' },
      { item: 'Power supply', quantity: 1, placement: 'Inside the selected top-row locker' },
      { item: 'Network module', quantity: 1, placement: 'Inside the selected top-row locker' },
      { item: 'Lock controller', quantity: Math.max(1, Math.ceil(count / 24)), placement: 'Inside the selected top-row locker' },
      { item: 'Sensor controller', quantity: Math.max(1, Math.ceil(count / 32)), placement: 'Inside the selected top-row locker' },
      { item: 'Ventilation grille', quantity: 2, placement: 'Top and bottom of the selected locker door/back panel' },
    ],
    assemblySteps: [
      'Laser-cut and press-brake form the frame, doors, dividers, and service plates.',
      'Apply deburring, conversion coating, and powder coat before final assembly.',
      'Bolt locker modules to the structural frame and install reinforcement at each module seam.',
      'Route low-voltage wiring through vertical channels with service loops at each controller connection.',
      'Install locks, sensors, indicators, seals, and hinges; then verify door alignment and clearances.',
      'Assign one existing top-row locker to management, then mount the power, network, lock, and sensor controllers inside it.',
      'Run a continuity, door-state, lock-actuation, and network commissioning test.',
    ],
    controllerPlacement: `The management system is assigned later to one existing locker in the top row of the ${columns}-column cabinet; no extra bay or column is added.`,
    cableRouting: 'Route low-voltage and mains paths from the selected top-row locker through the existing vertical module channels.',
    ventilation: 'Provide intake and exhaust openings within the selected locker door/back panel without changing the cabinet envelope.',
  };
};
