import { useMemo, useReducer } from 'react';
import { cloneConfig, createDefaultConfig, validateConfig } from './defaultConfig.js';
import { loadConfig, saveConfig } from './storage.js';
import { deriveManufacturing } from '../domain/manufacturing.js';
import { generateLayouts } from '../domain/optimizer.js';

const timestamp = () => new Date().toISOString();

const clearGenerated = (config) => ({ ...config, candidates: [], activeCandidateId: null, manufacturing: null, project: { ...config.project, updatedAt: timestamp() } });

const setNested = (object, path, value) => {
  const keys = path.split('.');
  const result = { ...object };
  let target = result;
  keys.slice(0, -1).forEach((key) => {
    target[key] = { ...target[key] };
    target = target[key];
  });
  target[keys[keys.length - 1]] = value;
  return result;
};

export const generateConfig = (config) => {
  const validation = validateConfig(config);
  if (!validation.valid) return { config, errors: validation.errors };
  const result = generateLayouts(config);
  if (result.errors.length || !result.candidates.length) return { config, errors: result.errors };
  const activeCandidateId = result.candidates[0].id;
  return { config: { ...config, candidates: result.candidates, activeCandidateId, manufacturing: deriveManufacturing(config, result.candidates[0]), project: { ...config.project, updatedAt: timestamp() } }, errors: [] };
};

export const createInitialState = (storedConfig = loadConfig()) => {
  const base = cloneConfig(storedConfig || createDefaultConfig());
  if (base.candidates?.length && base.activeCandidateId) {
    const active = base.candidates.find((candidate) => candidate.id === base.activeCandidateId) || base.candidates[0];
    return { config: { ...base, manufacturing: base.manufacturing || deriveManufacturing(base, active) }, errors: [], notice: 'Saved configuration restored.', activeView: 'setup', isGenerating: false };
  }
  const generated = generateConfig(base);
  return { config: generated.config, errors: generated.errors, notice: generated.errors.length ? 'Review the highlighted inputs before generating.' : 'Sample configuration generated.', activeView: 'setup', isGenerating: false };
};

export const configReducer = (state, action) => {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'EDIT_CONFIG': {
      const next = clearGenerated(action.update(state.config));
      saveConfig(next);
      return { ...state, config: next, errors: [], notice: 'Configuration changed. Generate a new layout to refresh the design.' };
    }
    case 'START_GENERATE':
      return { ...state, isGenerating: true, errors: [], notice: '' };
    case 'FINISH_GENERATE':
      saveConfig(action.config);
      return { ...state, config: action.config, errors: action.errors, notice: action.errors.length ? 'No valid layout matches the current constraints.' : 'Layout alternatives updated.', isGenerating: false };
    case 'SELECT_CANDIDATE': {
      const candidate = state.config.candidates.find((item) => item.id === action.id);
      if (!candidate) return state;
      const config = { ...state.config, activeCandidateId: candidate.id, manufacturing: deriveManufacturing(state.config, candidate), project: { ...state.config.project, updatedAt: timestamp() } };
      saveConfig(config);
      return { ...state, config, notice: `Selected ${candidate.columns}-column layout.` };
    }
    case 'IMPORT': {
      const imported = cloneConfig(action.config);
      const generated = generateConfig(imported);
      saveConfig(generated.config);
      return { ...state, config: generated.config, errors: generated.errors, notice: generated.errors.length ? 'Imported configuration needs attention.' : 'Configuration imported and generated.', activeView: 'setup' };
    }
    case 'RESET': {
      const config = createDefaultConfig();
      const generated = generateConfig(config);
      saveConfig(generated.config);
      return { ...state, config: generated.config, errors: generated.errors, notice: 'Sample configuration restored.', activeView: 'setup' };
    }
    default:
      return state;
  }
};

export const useConfigurator = () => {
  const [state, dispatch] = useReducer(configReducer, undefined, createInitialState);
  const actions = useMemo(() => ({
    setView: (view) => dispatch({ type: 'SET_VIEW', view }),
    updateProject: (field, value) => dispatch({ type: 'EDIT_CONFIG', update: (config) => ({ ...config, project: { ...config.project, [field]: value } }) }),
    updateDemand: (typeId, value) => dispatch({ type: 'EDIT_CONFIG', update: (config) => ({ ...config, demand: { ...config.demand, [typeId]: Number(value) } }) }),
    updateLayout: (field, value) => dispatch({ type: 'EDIT_CONFIG', update: (config) => ({ ...config, layout: { ...config.layout, [field]: Number(value) } }) }),
    updateLockerType: (typeId, path, value) => dispatch({ type: 'EDIT_CONFIG', update: (config) => ({ ...config, lockerTypes: config.lockerTypes.map((type) => type.id === typeId ? setNested(type, path, value) : type) }) }),
    updateConstraints: (field, value) => dispatch({ type: 'EDIT_CONFIG', update: (config) => ({ ...config, constraints: { ...config.constraints, [field]: Number(value) } }) }),
    generate: () => {
      dispatch({ type: 'START_GENERATE' });
      dispatch({ type: 'FINISH_GENERATE', ...generateConfig(state.config) });
    },
    selectCandidate: (id) => dispatch({ type: 'SELECT_CANDIDATE', id }),
    importConfig: (input) => {
      try {
        dispatch({ type: 'IMPORT', config: typeof input === 'string' ? JSON.parse(input) : input });
      } catch {
        dispatch({ type: 'FINISH_GENERATE', config: state.config, errors: ['The selected file is not valid JSON.'] });
      }
    },
    reset: () => dispatch({ type: 'RESET' }),
  }), [state.config]);
  return { state, actions };
};
