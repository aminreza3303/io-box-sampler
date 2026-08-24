import { createDefaultConfig, validateConfig } from './defaultConfig.js';

export const STORAGE_KEY = 'smart-locker-configurator:v1';
const memory = new Map();

const getStorage = () => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  } catch {
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
  }
};

export const loadConfig = () => {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) return createDefaultConfig();
    const parsed = JSON.parse(raw);
    return validateConfig(parsed).valid ? parsed : createDefaultConfig();
  } catch {
    return createDefaultConfig();
  }
};

export const saveConfig = (config) => {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(config));
};

export const clearSavedConfig = () => getStorage().removeItem(STORAGE_KEY);
