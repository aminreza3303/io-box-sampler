import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { downloadText, exportConfigJson, exportManufacturingCsv } from './app/export.js';
import { useConfigurator } from './app/useConfigurator.js';
import './styles.css';

const navItems = [
  { id: 'setup', label: 'Project setup', caption: 'Demand & brief', icon: 'grid' },
  { id: 'types', label: 'Locker types', caption: 'Parametric definitions', icon: 'box' },
  { id: 'constraints', label: 'Constraints', caption: 'Envelope & service', icon: 'sliders' },
  { id: 'generate', label: 'Generate layout', caption: 'Optimize cabinet', icon: 'spark' },
  { id: 'compare', label: 'Compare alternatives', caption: 'Ranked options', icon: 'compare' },
  { id: 'manufacturing', label: 'Manufacturing', caption: 'BOM & hardware', icon: 'factory' },
  { id: 'export', label: 'Export', caption: 'Handoff package', icon: 'download' },
];

const colors = { small: '#5aa89b', medium: '#7e90d5', large: '#d7975c' };
const typeLabels = { small: 'Small', medium: 'Medium', large: 'Large' };
const number = (value, decimals = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(Number(value || 0));

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    box: <><path d="m3 7 9-4 9 4-9 4-9-4Z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></>,
    sliders: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="7" cy="18" r="2" /></>,
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    compare: <><rect x="3" y="5" width="7" height="14" rx="1" /><rect x="14" y="5" width="7" height="14" rx="1" /><path d="M6 9h1m10 0h1M6 13h1m10 0h1" /></>,
    factory: <><path d="M3 20V9l6 3V8l6 3V5h6v15H3Z" /><path d="M7 16h2m4 0h2m4 0h1M7 20v-4m6 4v-4m6 4v-4" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19v2h16v-2" /></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" /></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.box}</svg>;
}

function Field({ label, value, onChange, suffix = 'mm', type = 'number', hint, error }) {
  return <label className={`field ${error ? 'field-error' : ''}`}>
    <span>{label}{suffix && <em>{suffix}</em>}</span>
    <div className="field-control"><input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} /><i>{error ? '!' : ''}</i></div>
    {hint && <small>{hint}</small>}
    {error && <small className="error-text">{error}</small>}
  </label>;
}

function SectionHeader({ eyebrow, title, description, action }) {
  return <div className="section-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

function MetricCard({ label, value, detail, tone = 'teal' }) {
  return <div className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function StatusBanner({ state }) {
  if (!state.notice && !state.errors.length) return null;
  return <div className={`status-banner ${state.errors.length ? 'error' : ''}`}><Icon name={state.errors.length ? 'alert' : 'check'} size={17} /><div>{state.errors.length ? state.errors.map((error) => <p key={error}>{error}</p>) : <p>{state.notice}</p>}</div></div>;
}

function LockerLayoutSvg({ candidate, lockerTypes, constraints, compact = false }) {
  if (!candidate) return <div className="svg-empty">Generate a layout to inspect the cabinet.</div>;
  const types = new Map(lockerTypes.map((type) => [type.id, type]));
  const frame = constraints.frameMm;
  const columnGap = constraints.dividerMm;
  const columnWidths = candidate.columnWidths || Array.from({ length: candidate.columns }, () => Math.max(...lockerTypes.map((type) => type.dimensions.width)));
  const rowHeights = candidate.rowHeights || Array.from({ length: candidate.rows }, () => Math.max(...lockerTypes.map((type) => type.dimensions.height)));
  const top = frame + columnGap;
  const dimensionY = candidate.dimensions.height + 34;
  const dimensionX = candidate.dimensions.width + 36;
  const lockerAt = (row, column) => candidate.lockers.find((locker) => locker.row === row && locker.column === column);
  const columnX = (column) => frame + columnGap + columnWidths.slice(0, column).reduce((sum, value) => sum + value + columnGap, 0);
  const rowY = (row) => top + rowHeights.slice(0, row).reduce((sum, value) => sum + value + columnGap, 0);
  return <svg className={`layout-svg ${compact ? 'compact' : ''}`} viewBox={`0 0 ${candidate.dimensions.width + 80} ${candidate.dimensions.height + 70}`} role="img" aria-label={`Locker cabinet layout ${candidate.columns} columns by ${candidate.rows} rows`}>
    <defs><pattern id="gridPattern" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#dbe7e6" strokeWidth="0.7" /></pattern></defs>
    <rect x="0" y="0" width={candidate.dimensions.width + 80} height={candidate.dimensions.height + 70} fill="url(#gridPattern)" opacity=".5" />
    <rect className="svg-frame" x={frame} y={frame} width={candidate.dimensions.width - frame * 2} height={candidate.dimensions.height - frame * 2} rx="5" />
    {Array.from({ length: candidate.rows }, (_, row) => Array.from({ length: candidate.columns }, (_, column) => {
      const locker = lockerAt(row, column);
      const type = types.get(locker.typeId);
      const x = columnX(column);
      const y = rowY(row);
      const width = columnWidths[column];
      const height = rowHeights[row];
      const controllerReady = locker.id === candidate.controllerSlotId;
      return <g className={`svg-locker ${controllerReady ? 'controller-ready' : ''}`} key={locker.id} tabIndex="0"><title>{`${type.name} locker ${locker.id}${controllerReady ? ', top-row controller-ready slot' : ''}, ${type.dimensions.width} × ${type.dimensions.height} × ${type.dimensions.depth} mm`}</title><rect x={x} y={y} width={width} height={height} rx="2" fill={colors[locker.typeId] || '#7e90d5'} /><rect className="svg-door" x={x + 5} y={y + 5} width={width - 10} height={Math.max(height - 10, 5)} rx="2" />{controllerReady && <rect className="svg-controller-ready" x={x + 3} y={y + 3} width={width - 6} height={Math.max(height - 6, 7)} rx="2" />}{controllerReady && !compact && <text className="svg-ready-label" x={x + width / 2} y={y + 19} textAnchor="middle">CTRL READY</text>}<circle className="svg-lock" cx={x + width - 15} cy={y + Math.min(height / 2, 16)} r="3" /><text className="svg-code" x={x + 16} y={y + Math.min(height / 2 + 5, height - 6)}>{type.code}</text>{!compact && <text className="svg-size" x={x + width - 23} y={y + Math.min(height / 2 + 4, height - 6)} textAnchor="end">{type.dimensions.width}×{type.dimensions.height}</text>}</g>;
    }))}
    {!compact && <><line className="svg-dimension" x1={frame} y1={dimensionY} x2={candidate.dimensions.width - frame} y2={dimensionY} /><text className="svg-dimension-label" x={candidate.dimensions.width / 2} y={dimensionY + 14} textAnchor="middle">{number(candidate.dimensions.width)} mm overall width</text><line className="svg-dimension" x1={dimensionX} y1={frame} x2={dimensionX} y2={candidate.dimensions.height - frame} /><text className="svg-dimension-label" transform={`translate(${dimensionX + 15} ${candidate.dimensions.height / 2}) rotate(90)`} textAnchor="middle">{number(candidate.dimensions.height)} mm overall height</text><text className="svg-axis-label" x={candidate.dimensions.width / 2} y={candidate.dimensions.height - 9} textAnchor="middle">EVERY CELL FILLED / CONTROLLER ASSIGNED LATER</text></>}
  </svg>;
}

function SetupView({ state, actions, onGenerate }) {
  const { config } = state;
  const demandTotal = Object.values(config.demand).reduce((sum, value) => sum + Number(value || 0), 0);
  const gridCells = Number(config.layout?.columns || 0) * Number(config.layout?.rows || 0);
  const gridMatchesDemand = gridCells === demandTotal;
  const active = state.config.candidates.find((item) => item.id === state.config.activeCandidateId) || state.config.candidates[0];
  return <div className="view"><SectionHeader eyebrow="01 / project brief" title="Define the boxes. We calculate the cabinet." description="Enter the locker cells, their quantities, and the exact grid. The complete cabinet envelope and material takeoff are derived from these inputs." action={<button className="button primary" onClick={onGenerate}><Icon name="spark" size={16} />Calculate cabinet</button>} />
    <StatusBanner state={state} />
    <div className="setup-grid"><section className="panel demand-panel"><div className="panel-heading"><div><span className="eyebrow">Project identity</span><h2>Box demand & grid</h2></div><span className="panel-code">INPUT / 01</span></div><Field label="Project name" suffix="" type="text" value={config.project.name} onChange={(value) => actions.updateProject('name', value)} hint="Used as the handoff package name." /><div className="grid-input-card"><div><span className="eyebrow">Exact cabinet grid</span><strong>All cells must be filled</strong><small>Rows × columns must equal total box demand.</small></div><div className="field-grid two"><Field label="Columns" suffix="cols" value={config.layout.columns} onChange={(value) => actions.updateLayout('columns', value)} /><Field label="Rows" suffix="rows" value={config.layout.rows} onChange={(value) => actions.updateLayout('rows', value)} /></div><div className={`grid-capacity ${gridMatchesDemand ? 'valid' : 'invalid'}`}><span>{number(gridCells)} cells / {number(demandTotal)} boxes</span><strong>{gridMatchesDemand ? 'MATCH' : 'MISMATCH'}</strong></div></div><div className="demand-list">{config.lockerTypes.map((type) => <div className="demand-row" key={type.id}><div className="type-swatch" style={{ background: colors[type.id] }}><span>{type.code}</span></div><div><strong>{type.name} locker</strong><small>{type.dimensions.width} × {type.dimensions.height} × {type.dimensions.depth} mm</small></div><label className="quantity"><input type="number" min="0" value={config.demand[type.id] ?? 0} onChange={(event) => actions.updateDemand(type.id, event.target.value)} /><span>units</span></label></div>)}</div><div className="demand-total"><span>Total requested boxes</span><strong>{number(demandTotal)}</strong></div></section>
      <section className="panel preview-panel"><div className="panel-heading"><div><span className="eyebrow">Derived system signal</span><h2>Calculated cabinet</h2></div><span className="status-dot"><i />DERIVED</span></div>{active ? <><div className="mini-preview"><LockerLayoutSvg candidate={active} lockerTypes={config.lockerTypes} constraints={config.constraints} compact /></div><div className="preview-meta"><div><span>Overall cabinet</span><strong>{number(active.dimensions.width)} × {number(active.dimensions.height)}<small>mm</small></strong></div><div><span>Depth / utilization</span><strong>{number(active.dimensions.depth)}<small>mm / {number(active.utilization, 1)}%</small></strong></div></div></> : <div className="empty-preview"><Icon name="box" size={28} /><strong>Waiting for your grid</strong><p>Enter the box definitions and exact rows/columns. The cabinet size and material takeoff will be calculated automatically.</p></div>}</section></div>
    <div className="metrics-row"><MetricCard label="Grid capacity" value={number(gridCells)} detail={gridMatchesDemand ? 'matches requested boxes' : 'must match total boxes'} tone={gridMatchesDemand ? 'teal' : 'orange'} /><MetricCard label="Calculated depth" value={active ? `${number(active.dimensions.depth)} mm` : '—'} detail="derived from deepest box" tone="blue" /><MetricCard label="Material mode" value="Derived" detail="frame, panels, doors, hardware" tone="orange" /><MetricCard label="Controller" value="Top row" detail="assigned later to one existing cell" tone="purple" /></div>
  </div>;
}

function TypesView({ state, actions }) {
  return <div className="view"><SectionHeader eyebrow="02 / parametric library" title="Define the locker grammar." description="Every dimension is a variable. The optimizer uses these definitions to build and score real alternatives." /><StatusBanner state={state} /><div className="type-grid">{state.config.lockerTypes.map((type) => <section className="panel type-editor" key={type.id}><div className="type-editor-head"><div className="type-swatch large" style={{ background: colors[type.id] }}><span>{type.code}</span></div><div><span className="eyebrow">Locker type / {type.id}</span><h2>{type.name}</h2></div><span className="type-count">{number(state.config.demand[type.id] || 0)} requested</span></div><div className="field-grid three"><Field label="Width" value={type.dimensions.width} onChange={(value) => actions.updateLockerType(type.id, 'dimensions.width', Number(value))} /><Field label="Height" value={type.dimensions.height} onChange={(value) => actions.updateLockerType(type.id, 'dimensions.height', Number(value))} /><Field label="Depth" value={type.dimensions.depth} onChange={(value) => actions.updateLockerType(type.id, 'dimensions.depth', Number(value))} /></div><div className="field-grid two"><Field label="Weight capacity" suffix="kg" value={type.weightCapacityKg} onChange={(value) => actions.updateLockerType(type.id, 'weightCapacityKg', Number(value))} /><Field label="Sheet thickness" suffix="mm" value={type.thicknessMm} onChange={(value) => actions.updateLockerType(type.id, 'thicknessMm', Number(value))} /></div><Field label="Allowed usage" suffix="" type="text" value={type.allowedUsage} onChange={(value) => actions.updateLockerType(type.id, 'allowedUsage', value)} /><div className="hardware-strip"><span>Hardware defaults</span><small>{type.hardware.lock}</small><small>{type.hardware.sensor}</small><small>{type.hardware.indicator}</small></div></section>)}</div></div>;
}

function ConstraintsView({ state, actions, onGenerate }) {
  const c = state.config.constraints;
  const active = state.config.candidates.find((item) => item.id === state.config.activeCandidateId) || state.config.candidates[0];
  return <div className="view"><SectionHeader eyebrow="03 / manufacturing rules" title="Set how the cabinet is built." description="Cabinet width and height come from the entered grid. These values describe the frame, gaps, and service package used to derive the takeoff." action={<button className="button primary" onClick={onGenerate}><Icon name="spark" size={16} />Recalculate</button>} /><StatusBanner state={state} /><div className="constraint-layout"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">Construction allowances</span><h2>Material and service rules</h2></div><span className="panel-code">INPUT / MM</span></div><div className="field-grid four"><Field label="Divider" value={c.dividerMm} onChange={(value) => actions.updateConstraints('dividerMm', value)} /><Field label="Frame" value={c.frameMm} onChange={(value) => actions.updateConstraints('frameMm', value)} /><Field label="Door gap" value={c.doorGapMm} onChange={(value) => actions.updateConstraints('doorGapMm', value)} /><Field label="Controller package" value={c.controllerWidthMm} onChange={(value) => actions.updateConstraints('controllerWidthMm', value)} hint="Must fit inside the later-assigned top-row locker." /></div><div className="panel-heading sub"><div><span className="eyebrow">Calculated output</span><h2>Envelope from your grid</h2></div></div>{active ? <div className="derived-output"><div><span>Width</span><strong>{number(active.dimensions.width)} <small>mm</small></strong></div><div><span>Height</span><strong>{number(active.dimensions.height)} <small>mm</small></strong></div><div><span>Depth</span><strong>{number(active.dimensions.depth)} <small>mm</small></strong></div><div><span>Cells</span><strong>{number(active.lockers.length)} <small>filled</small></strong></div></div> : <div className="derived-empty">Generate after entering an exact rows × columns grid.</div>}</section><aside className="panel assumption-panel"><span className="eyebrow">Design assumptions</span><h2>The frame follows the demand.</h2><div className="assumption"><span>01</span><div><strong>No overall size input</strong><p>Width, height, and depth are calculated from box dimensions and the filled grid.</p></div></div><div className="assumption"><span>02</span><div><strong>Every cell is real</strong><p>If rows × columns does not equal total demand, generation stops with a clear error.</p></div></div><div className="assumption"><span>03</span><div><strong>Controller stays in-frame</strong><p>One existing top-row locker is assigned later without adding a bay or changing the envelope.</p></div></div></aside></div></div>;
}

function ScoreBreakdown({ candidate }) {
  return <div className="score-breakdown">{Object.entries(candidate.metrics).map(([key, value]) => <div className="score-row" key={key}><div><span>{({ widthFit: 'Width fit', heightFit: 'Height fit', spaceUse: 'Space use', manufacturing: 'Manufacturing', accessibility: 'Accessibility', balance: 'Balance', cableRouting: 'Cable routing', serviceAccess: 'Service access' })[key]}</span><strong>{number(value, 0)}</strong></div><div className="bar"><i style={{ width: `${value}%` }} /></div></div>)}</div>;
}

function CandidateCard({ candidate, selected, onSelect, lockerTypes, constraints }) {
  return <button className={`candidate-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(candidate.id)}><div className="candidate-card-top"><span className="candidate-index">{selected ? 'ACTIVE' : 'OPTION'}</span><strong>{number(candidate.score, 1)}<small>/100</small></strong></div><div className="candidate-mini"><LockerLayoutSvg candidate={candidate} lockerTypes={lockerTypes} constraints={constraints} compact /></div><div className="candidate-card-meta"><span><b>{candidate.columns}</b> columns</span><span><b>{candidate.rows}</b> rows</span><span><b>{number(candidate.dimensions.width)}</b> mm wide</span></div></button>;
}

function GenerateView({ state, actions }) {
  const candidate = state.config.candidates.find((item) => item.id === state.config.activeCandidateId) || state.config.candidates[0];
  const c = state.config;
  return <div className="view"><SectionHeader eyebrow="04 / optimization result" title="A cabinet with a reason behind it." description="The selected layout is the highest-ranked feasible candidate from the current parameter set." action={<button className="button secondary" onClick={actions.generate}><Icon name="spark" size={16} />Regenerate</button>} /><StatusBanner state={state} />{candidate ? <><div className="result-head"><div><span className="eyebrow">Recommended configuration</span><h2>{candidate.columns}-column modular cabinet</h2><p>{candidate.rows} maximum locker positions per vertical stack, with one existing top-row locker marked controller-ready; no extra bay is added.</p></div><div className="hero-score"><span>Composite score</span><strong>{number(candidate.score, 1)}<small>/100</small></strong></div></div><div className="result-grid"><section className="panel layout-panel"><div className="panel-heading"><div><span className="eyebrow">SVG inspection</span><h2>Front elevation</h2></div><span className="panel-code">ORTHOGRAPHIC / 2D</span></div><LockerLayoutSvg candidate={candidate} lockerTypes={c.lockerTypes} constraints={c.constraints} /></section><aside className="result-aside"><div className="metrics-grid"><MetricCard label="Envelope" value={`${number(candidate.dimensions.width)} × ${number(candidate.dimensions.height)}`} detail={`${number(candidate.dimensions.depth)} mm deep`} /><MetricCard label="Utilization" value={`${number(candidate.utilization, 1)}%`} detail={`${number(candidate.internalVolumeLitres, 1)} L locker volume`} tone="blue" /><MetricCard label="Module count" value={`${candidate.columns}`} detail="controller uses an existing top-row cell" tone="orange" /><MetricCard label="Demand served" value={number(candidate.lockers.length)} detail="requested positions" tone="purple" /></div><section className="panel breakdown-panel"><div className="panel-heading"><div><span className="eyebrow">Transparent scoring</span><h2>Why this ranks first</h2></div></div><ScoreBreakdown candidate={candidate} /></section></aside></div><div className="callout-row">{candidate.warnings.length ? candidate.warnings.map((warning) => <div className="callout warning" key={warning}><Icon name="alert" size={16} /><span>{warning}</span></div>) : <div className="callout"><Icon name="check" size={16} /><span>All requested lockers fit within the hard envelope. Ready for alternative comparison and manufacturing review.</span></div>}<div className="callout"><Icon name="factory" size={16} /><span>Recommended build: repeated sheet-metal modules, a top-row controller-ready locker, and vertical service channels.</span></div></div></> : <div className="panel blank-state"><Icon name="spark" size={30} /><h2>No feasible layout yet</h2><p>Return to setup or constraints, correct the inputs, and run the optimizer again.</p></div>}</div>;
}

function CompareView({ state, actions }) {
  const activeId = state.config.activeCandidateId;
  return <div className="view"><SectionHeader eyebrow="05 / decision set" title="Compare the viable directions." description="Select an alternative to make it the active design. The optimizer keeps the trade-off visible instead of hiding it." action={<span className="count-pill">{state.config.candidates.length} feasible options</span>} /><StatusBanner state={state} />{state.config.candidates.length ? <div className="candidate-grid">{state.config.candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={candidate.id === activeId} onSelect={actions.selectCandidate} lockerTypes={state.config.lockerTypes} constraints={state.config.constraints} />)}</div> : <div className="panel blank-state"><Icon name="compare" size={30} /><h2>Generate alternatives first</h2><p>The comparison set will appear here after the first optimization run.</p></div>}</div>;
}

function ManufacturingView({ state }) {
  const spec = state.config.manufacturing;
  const candidate = state.config.candidates.find((item) => item.id === state.config.activeCandidateId);
  return <div className="view"><SectionHeader eyebrow="06 / production package" title="From arrangement to assembly." description="A derived manufacturing and hardware view for the active cabinet. Values are editable suggestions for design review." />{spec && candidate ? <><div className="manufacturing-banner"><div><span className="eyebrow">Active design</span><h2>{candidate.columns}-column module set / {number(candidate.lockers.length)} doors</h2></div><div><span>Material direction</span><strong>Powder-coated galvanized steel</strong></div><div><span>Assembly</span><strong>Bolted modular frame</strong></div></div><div className="metrics-row manufacturing-totals"><MetricCard label="Frame profile" value={`${number(spec.totals.frameLengthM, 2)} m`} detail="total cut length" /><MetricCard label="Door sheet" value={`${number(spec.totals.doorAreaM2, 2)} m²`} detail="total face area" tone="blue" /><MetricCard label="Divider panels" value={`${number(spec.totals.dividerAreaM2, 2)} m²`} detail="total panel area" tone="orange" /><MetricCard label="Back panel" value={`${number(spec.totals.backPanelAreaM2, 2)} m²`} detail="total panel area" tone="purple" /></div><div className="manufacturing-grid"><section className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">Material schedule</span><h2>Primary components</h2></div><span className="panel-code">BOM / 01</span></div><table><thead><tr><th>Component</th><th>Material</th><th>Gauge</th><th>Qty</th><th>Method</th></tr></thead><tbody>{spec.materials.map((item) => <tr key={item.name}><td><strong>{item.name}</strong></td><td>{item.material}</td><td>{item.thicknessMm} mm</td><td>{item.quantity} {item.unit || "pcs"}</td><td>{item.method}</td></tr>)}</tbody></table></section><section className="panel table-panel"><div className="panel-heading"><div><span className="eyebrow">Hardware architecture</span><h2>Controls & access</h2></div><span className="panel-code">BOM / 02</span></div><table><thead><tr><th>Item</th><th>Qty</th><th>Placement</th></tr></thead><tbody>{spec.hardware.map((item) => <tr key={item.item}><td><strong>{item.item}</strong></td><td>{item.quantity} {item.unit || "pcs"}</td><td>{item.placement}</td></tr>)}</tbody></table></section></div><div className="manufacturing-bottom"><section className="panel steps-panel"><div className="panel-heading"><div><span className="eyebrow">Assembly strategy</span><h2>Build sequence</h2></div></div><ol>{spec.assemblySteps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}</ol></section><aside className="panel controller-panel"><span className="eyebrow">Hardware / software boundary</span><h2>Controller locker</h2><div className="controller-diagram"><div className="controller-node main">MAIN CONTROLLER</div><div className="controller-connector" /><div className="controller-nodes"><span>POWER</span><span>NETWORK</span><span>LOCK BUS</span><span>SENSOR BUS</span></div></div><p>{spec.controllerPlacement}</p><p>{spec.cableRouting}</p><p>{spec.ventilation}</p></aside></div></> : <div className="panel blank-state"><Icon name="factory" size={30} /><h2>Manufacturing view is waiting</h2><p>Generate and select a layout to derive the material and hardware package.</p></div>}</div>;
}

function ExportView({ state, actions }) {
  const fileInput = useRef(null);
  const [copied, setCopied] = useState(false);
  const json = exportConfigJson(state.config);
  const exportJson = () => downloadText(`${state.config.project.name.replace(/\s+/g, '-').toLowerCase() || 'locker-config'}.json`, json, 'application/json;charset=utf-8');
  const exportCsv = () => downloadText('locker-manufacturing-bom.csv', exportManufacturingCsv(state.config.manufacturing), 'text/csv;charset=utf-8');
  const copy = async () => { try { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); } };
  return <div className="view"><SectionHeader eyebrow="07 / handoff" title="Package the engineering decision." description="Export the full parameter set, selected geometry, ranked alternatives, and derived manufacturing data." /><StatusBanner state={state} /><div className="export-layout"><section className="panel export-panel"><div className="export-hero"><div className="export-icon"><Icon name="download" size={25} /></div><div><span className="eyebrow">Configuration package</span><h2>{state.config.project.name}</h2><p>Schema v{state.config.schemaVersion} · {state.config.candidates.length} ranked alternatives · local persistence enabled</p></div></div><div className="export-actions"><button className="button primary" onClick={exportJson}><Icon name="download" size={16} />Download JSON</button><button className="button secondary" onClick={exportCsv}><Icon name="factory" size={16} />Download BOM CSV</button><button className="button ghost" onClick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copied' : 'Copy JSON'}</button></div><div className="handoff-checks"><div><Icon name="check" size={15} /><span>Parametric locker definitions</span><b>included</b></div><div><Icon name="check" size={15} /><span>Constraint set and demand</span><b>included</b></div><div><Icon name="check" size={15} /><span>Ranked SVG-ready layouts</span><b>{state.config.candidates.length ? 'included' : 'pending'}</b></div><div><Icon name="check" size={15} /><span>Manufacturing and hardware BOM</span><b>{state.config.manufacturing ? 'included' : 'pending'}</b></div></div><div className="import-row"><div><span className="eyebrow">Restore a handoff</span><p>Import a JSON package to continue a design review locally.</p></div><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) file.text().then(actions.importConfig); event.target.value = ''; }} /><button className="button ghost" onClick={() => fileInput.current?.click()}>Import JSON</button><button className="button text-button" onClick={actions.reset}>Reset sample</button></div></section><section className="panel code-panel"><div className="panel-heading"><div><span className="eyebrow">Preview</span><h2>Configuration JSON</h2></div><span className="panel-code">READ ONLY</span></div><pre>{json.slice(0, 4500)}{json.length > 4500 ? '\n…' : ''}</pre></section></div></div>;
}

function App() {
  const { state, actions } = useConfigurator();
  const candidate = state.config.candidates.find((item) => item.id === state.config.activeCandidateId) || state.config.candidates[0];
  const onGenerate = () => { actions.generate(); actions.setView('generate'); };
  const activeNav = navItems.find((item) => item.id === state.activeView) || navItems[0];
  const view = useMemo(() => {
    if (state.activeView === 'setup') return <SetupView state={state} actions={actions} onGenerate={onGenerate} />;
    if (state.activeView === 'types') return <TypesView state={state} actions={actions} />;
    if (state.activeView === 'constraints') return <ConstraintsView state={state} actions={actions} onGenerate={onGenerate} />;
    if (state.activeView === 'generate') return <GenerateView state={state} actions={actions} />;
    if (state.activeView === 'compare') return <CompareView state={state} actions={actions} />;
    if (state.activeView === 'manufacturing') return <ManufacturingView state={state} />;
    return <ExportView state={state} actions={actions} />;
  }, [state, actions]);
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><span /><span /><span /></div><div><strong>LOCKER<span>LAB</span></strong><small>PARAMETRIC SYSTEMS</small></div></div><div className="side-project"><span>ACTIVE PROJECT</span><strong>{state.config.project.name}</strong><small>Local engineering workspace</small></div><nav>{navItems.map((item, index) => <button key={item.id} className={`nav-item ${state.activeView === item.id ? 'active' : ''}`} onClick={() => actions.setView(item.id)}><span className="nav-index">0{index + 1}</span><Icon name={item.icon} size={17} /><span><strong>{item.label}</strong><small>{item.caption}</small></span>{state.activeView === item.id && <Icon name="chevron" size={15} />}</button>)}</nav><div className="sidebar-bottom"><div className="local-pill"><i />LOCAL ONLY <span>v1.0</span></div><button className="help-link" onClick={() => actions.setView('export')}><Icon name="download" size={14} />Export handoff</button></div></aside><main className="main"><header className="topbar"><div><span className="topbar-kicker">ENGINEERING WORKSPACE / {activeNav.label.toUpperCase()}</span><strong>{state.config.project.name}</strong></div><div className="topbar-right"><div className="candidate-status"><span>ACTIVE DESIGN</span><strong>{candidate ? `${number(candidate.score, 1)} / 100` : 'NOT GENERATED'}</strong></div><div className="avatar">NL</div></div></header><div className="content">{view}</div><footer className="footer"><span>LockerLab / parametric cabinet configurator</span><span>Dimensions in mm · scores normalized 0–100 · {candidate ? `${candidate.columns} columns / ${candidate.rows} max rows` : 'no active layout'}</span></footer></main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
