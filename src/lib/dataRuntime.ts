export type DataMode = 'local' | 'hybrid';

const normalizeMode = (value?: string): DataMode => {
  const v = (value || '').trim().toLowerCase();
  return v === 'hybrid' ? 'hybrid' : 'local';
};

export const dataRuntime = {
  mode: normalizeMode(import.meta.env.VITE_DATA_MODE),
  syncApiBase: (import.meta.env.VITE_SYNC_API_BASE || '/api').replace(/\/$/, ''),
  syncEnabled: normalizeMode(import.meta.env.VITE_DATA_MODE) === 'hybrid',
};

export const isHybridDataMode = () => dataRuntime.mode === 'hybrid';
