const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const exportConfigJson = (config) => JSON.stringify(config, null, 2);

export const exportManufacturingCsv = (spec) => {
  const rows = [['Item', 'Quantity', 'Material / Placement', 'Thickness / Method']];
  (spec?.materials || []).forEach((item) => rows.push([item.name, item.quantity, item.material, `${item.thicknessMm} mm · ${item.method}`]));
  (spec?.hardware || []).forEach((item) => rows.push([item.item, item.quantity, item.placement, 'Hardware']));
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
};

export const downloadText = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return true;
};
