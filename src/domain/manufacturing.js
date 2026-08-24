export const deriveManufacturing = (config, candidate) => {
  const count = candidate.lockers.length;
  const columns = candidate.columns;
  const rows = candidate.rows;
  const seams = Math.max(0, columns - 1) + Math.max(0, rows - 1);
  const frameLengthM = (((columns + 1) * candidate.dimensions.height) + ((rows + 1) * candidate.dimensions.width)) / 1000;
  const doorAreaM2 = candidate.lockers.reduce((area, locker) => {
    const type = config.lockerTypes.find((item) => item.id === locker.typeId);
    return area + ((type.dimensions.width * type.dimensions.height) / 1_000_000);
  }, 0);
  const backPanelAreaM2 = (candidate.dimensions.width * candidate.dimensions.height) / 1_000_000;
  const dividerAreaM2 = (((columns - 1) * candidate.dimensions.height * candidate.dimensions.depth) + ((rows - 1) * candidate.dimensions.width * candidate.dimensions.depth)) / 1_000_000;
  return {
    materials: [
      { name: 'Structural frame profile', material: 'Galvanized mild steel', thicknessMm: 2, method: 'Cut to length, press-brake, bolted', quantity: Number(frameLengthM.toFixed(2)), unit: 'm', pieces: columns + rows + 2 },
      { name: 'Locker door sheet', material: 'Powder-coated galvanized steel', thicknessMm: 1.2, method: 'CNC cut and formed', quantity: Number(doorAreaM2.toFixed(2)), unit: 'm²', pieces: count },
      { name: 'Divider panels', material: 'Galvanized steel', thicknessMm: 1.2, method: 'CNC cut and folded', quantity: Number(dividerAreaM2.toFixed(2)), unit: 'm²', pieces: seams },
      { name: 'Back panel', material: 'Galvanized steel', thicknessMm: 1.2, method: 'CNC cut and folded', quantity: Number(backPanelAreaM2.toFixed(2)), unit: 'm²', pieces: 1 },
      { name: 'Module reinforcement', material: 'Folded steel angle', thicknessMm: 2, method: 'Press-brake bend', quantity: seams, unit: 'sets' },
      { name: 'Vertical cable channel', material: 'PVC or formed steel', thicknessMm: 1, method: 'Cut to cabinet height', quantity: Number(((columns * candidate.dimensions.height) / 1000).toFixed(2)), unit: 'm' },
      { name: 'Controller locker fit-out', material: 'Existing top-row locker', thicknessMm: 1.2, method: 'Install service plate inside selected locker', quantity: 1, unit: 'set' },
    ],
    hardware: [
      { item: 'Electronic lock', quantity: count, unit: 'pcs', placement: 'One per locker door' },
      { item: 'Door sensor', quantity: count, unit: 'pcs', placement: 'One per locker door frame' },
      { item: 'Status indicator', quantity: count, unit: 'pcs', placement: 'One per locker fascia' },
      { item: 'Hinge set', quantity: count, unit: 'sets', placement: 'Two concealed hinges per door' },
      { item: 'Seal set', quantity: count, unit: 'sets', placement: 'Perimeter seal per door' },
      { item: 'Fastener set', quantity: count + seams * 8, unit: 'sets', placement: 'Locker and module assembly' },
      { item: 'Power supply', quantity: 1, unit: 'pcs', placement: 'Inside the selected top-row locker' },
      { item: 'Network module', quantity: 1, unit: 'pcs', placement: 'Inside the selected top-row locker' },
      { item: 'Lock controller', quantity: Math.max(1, Math.ceil(count / 24)), unit: 'pcs', placement: 'Inside the selected top-row locker' },
      { item: 'Sensor controller', quantity: Math.max(1, Math.ceil(count / 32)), unit: 'pcs', placement: 'Inside the selected top-row locker' },
      { item: 'Ventilation grille', quantity: 2, unit: 'pcs', placement: 'Top and bottom of the selected locker door/back panel' },
    ],
    assemblySteps: [
      'Calculate frame lengths, panel areas, and door blanks from the entered rows, columns, and locker dimensions.',
      'Laser-cut and press-brake form the frame, doors, dividers, back panel, and service plate.',
      'Apply deburring, conversion coating, and powder coat before final assembly.',
      'Bolt every locker cell into the complete frame and install reinforcement at each module seam.',
      'Route low-voltage and mains paths through the existing vertical module channels.',
      'Assign one existing top-row locker to management and mount the power, network, lock, and sensor controllers inside it.',
      'Run a continuity, door-state, lock-actuation, ventilation, and network commissioning test.',
    ],
    controllerPlacement: `The management system is assigned later to one existing locker in the top row of the ${columns} × ${rows} grid; no extra bay or column is added.`,
    cableRouting: 'Route low-voltage and mains paths from the selected top-row locker through the existing vertical module channels.',
    ventilation: 'Provide intake and exhaust openings within the selected locker door/back panel without changing the cabinet envelope.',
    totals: { frameLengthM: Number(frameLengthM.toFixed(2)), doorAreaM2: Number(doorAreaM2.toFixed(2)), dividerAreaM2: Number(dividerAreaM2.toFixed(2)), backPanelAreaM2: Number(backPanelAreaM2.toFixed(2)) },
  };
};
