export type Quality = 'low' | 'balanced' | 'high';
export type Preferences = { quality: Quality; music: boolean; effects: boolean; sparkles: boolean; sensitivity: number; reducedMotion: boolean };
export const PREFERENCES_KEY = 'barbie-ultimate-dreamland:preferences-v1';
export const DEFAULT_PREFERENCES: Preferences = { quality: 'balanced', music: true, effects: true, sparkles: true, sensitivity: 1, reducedMotion: false };
export function sanitizePreferences(value: unknown): Preferences {
  const p = value && typeof value === 'object' ? value as Partial<Preferences> : {};
  return { quality: ['low','balanced','high'].includes(p.quality) ? p.quality : 'balanced', music: p.music !== false, effects: p.effects !== false, sparkles: p.sparkles !== false, sensitivity: Number.isFinite(p.sensitivity) ? Math.min(1.5,Math.max(.5,p.sensitivity)) : 1, reducedMotion: p.reducedMotion === true };
}
export function loadPreferences(): Preferences { try { return sanitizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null')); } catch { return {...DEFAULT_PREFERENCES}; } }
export function savePreferences(p: Preferences) { try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(p)); } catch { /* Session preferences remain usable without storage. */ } }
