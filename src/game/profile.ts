import type { AccessoryId, HairId, OutfitId, ShoesId } from './types';

export type Profile = {
  points: number;
  earned: number;
  outfit: OutfitId;
  hair: HairId;
  accessory: AccessoryId;
  shoes: ShoesId;
  unlocked: OutfitId[];
};
export const PROFILE_KEY = 'barbie-ultimate-dreamland:profile-v1';
const OUTFITS: OutfitId[] = ['glam', 'beach', 'popstar', 'casual'];
const DEFAULT: Profile = { points: 0, earned: 0, outfit: 'glam', hair: 'blonde', accessory: 'none', shoes: 'heels', unlocked: ['glam', 'beach'] };

export function sanitizeProfile(value: unknown): Profile {
  const p = value && typeof value === 'object' ? value as Partial<Profile> : {};
  const earned = typeof p.earned === 'number' && Number.isFinite(p.earned) ? Math.max(0, Math.floor(p.earned)) : 0;
  const points = typeof p.points === 'number' && Number.isFinite(p.points) ? Math.min(earned, Math.max(0, Math.floor(p.points))) : 0;
  const unlocked = [...new Set<OutfitId>(['glam', 'beach', ...(Array.isArray(p.unlocked) ? p.unlocked.filter(id => OUTFITS.includes(id)) : [])])];
  return {
    points, earned, unlocked,
    outfit: unlocked.includes(p.outfit) ? p.outfit : DEFAULT.outfit,
    hair: ['blonde', 'pink', 'updo'].includes(p.hair) ? p.hair : DEFAULT.hair,
    accessory: ['none', 'sunglasses', 'tiara'].includes(p.accessory) ? p.accessory : DEFAULT.accessory,
    shoes: ['heels', 'sneakers', 'boots'].includes(p.shoes) ? p.shoes : DEFAULT.shoes,
  };
}

export function loadProfile(): Profile {
  try { return sanitizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')); }
  catch { return sanitizeProfile(null); }
}
export function saveProfile(profile: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitizeProfile(profile))); }
  catch { /* Keep this session playable if browser storage is full or disabled. */ }
}
