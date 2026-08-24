export const calculateFinalDimensions = (candidate, layout) => {
  const groundClearanceMm = Number(layout?.groundClearanceMm || 0);
  const cabinetWidthMm = Number(candidate?.dimensions?.width || 0);
  const cabinetHeightMm = Number(candidate?.dimensions?.height || 0);
  const cabinetDepthMm = Number(candidate?.dimensions?.depth || 0);
  return {
    cabinetWidthMm,
    cabinetHeightMm,
    cabinetDepthMm,
    groundClearanceMm,
    installedTopMm: cabinetHeightMm + groundClearanceMm,
    footprintAreaM2: Number(((cabinetWidthMm * cabinetDepthMm) / 1_000_000).toFixed(2)),
  };
};
