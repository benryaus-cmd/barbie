import type { Look, PoseId } from './lifestyle-types';

export const SOCIAL_KEY = 'barbie-ultimate-dreamland:dreamfeed-v1';
export const MAX_PHOTOS = 12;
export const MAX_SIGNATURES = 512;
const MAX_IMAGE_LENGTH = 300_000;
const MAX_FOLLOWERS = 20_000;
const POSES: readonly string[] = ['idle', 'wave', 'peace', 'heart', 'kiss', 'spin', 'dance', 'pet', 'surf', 'salute', 'curtsy', 'jump', 'hug', 'arm-around', 'half-heart'];
const PAIRS = ['hug', 'arm-around', 'half-heart'];
export const FOLLOWER_TIERS = [
  { minimum: 0, label: 'New face', multiplier: 1 }, { minimum: 40, label: 'Rising creator', multiplier: 1.1 },
  { minimum: 100, label: 'Local favourite', multiplier: 1.2 }, { minimum: 250, label: 'DreamFeed star', multiplier: 1.35 },
  { minimum: 500, label: 'Dreamland icon', multiplier: 1.5 },
] as const;
export function followerTier(followers: number) {
  const index = FOLLOWER_TIERS.reduce((found, tier, i) => followers >= tier.minimum ? i : found, 0);
  return { ...FOLLOWER_TIERS[index], next: FOLLOWER_TIERS[index + 1]?.minimum ?? null };
}
export type PhotoComment = { name: string; text: string };
export type DreamPost = { likes: number; liked: boolean; comments: PhotoComment[]; publishedAt: number };
export type StoredPhoto = {
  id: string; image: string; caption: string; createdAt: number;
  pose: PoseId; companionId: string | null; companionName: string | null;
  groupIds: string[]; groupNames: string[]; companionPose: PoseId; pair: string | null;
  zone: string; look: Look; signature: string; post?: DreamPost;
};
export type SocialState = { followers: number; photos: StoredPhoto[]; rewardedSignatures: string[] };
export type PhotoInput = Pick<StoredPhoto, 'image' | 'pose' | 'companionId' | 'companionName' | 'zone' | 'look'> & Partial<Pick<StoredPhoto, 'groupIds' | 'groupNames' | 'companionPose' | 'pair'>>;
function photoGroup(input: Partial<PhotoInput>) {
  const groupIds = [...new Set((Array.isArray(input.groupIds) ? input.groupIds : input.companionId ? [input.companionId] : []).filter(id => typeof id === 'string' && id.trim()).map(id => id.slice(0, 60)))].slice(0, 2);
  const groupNames = Array.isArray(input.groupNames) ? input.groupNames.slice(0, groupIds.length).map(name => cleanText(name, 60)) : input.companionName ? [cleanText(input.companionName, 60)] : [];
  const companionPose = POSES.includes(input.companionPose ?? '') ? input.companionPose! : 'wave';
  return { groupIds, groupNames, companionPose, pair: groupIds.some(id => id !== 'pet') && PAIRS.includes(input.pair ?? '') ? input.pair! : null };
}
const blank = (): SocialState => ({ followers: 0, photos: [], rewardedSignatures: [] });
const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
const count = (value: unknown, max = MAX_FOLLOWERS) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;
const safeStorage = (): Storage | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };
export const isPhotoImage = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_IMAGE_LENGTH && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value);

/** Full look identity is retained, so neither album deletion nor changing a caption resets rewards. */
export function photoSignature(input: Omit<PhotoInput, 'image' | 'companionName'>): string {
  const { look } = input;
  const group = photoGroup(input);
  const identity: unknown[] = [look.top, look.bottom, [...new Set(look.accessories)].sort(), look.topColor.toLowerCase(), look.bottomColor.toLowerCase(), input.pose, input.zone.trim().toLowerCase(), group.groupIds.length <= 1 ? group.groupIds[0] ?? 'solo' : [...group.groupIds].sort()];
  // Keep the original solo/single-wave identity so older reward ledgers stay valid.
  if (group.groupIds.length && (group.companionPose !== 'wave' || group.pair)) identity.push(group.companionPose, group.pair);
  if (group.pair) identity.push(group.groupIds.find(id=>id!=='pet'));
  if (look.hairColor || look.makeup && look.makeup !== 'fresh') identity.push(look.hairColor?.toLowerCase() ?? null, look.makeup ?? 'fresh');
  return JSON.stringify(identity);
}
function readLook(value: unknown): Look | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const tops = ['glam','beach','popstar','casual','sunset','denim','sport','midnight'];
  const bottoms = ['gown','wrap','pleated','shorts','palazzo','tennis','denim-skirt','satin-mini'];
  const extras = ['tiara','sunglasses','earrings','necklace','bow','round-shades','star-shades','sunhat','beret','headband','choker','bracelets'];
  if (!tops.includes(String(v.top)) || !bottoms.includes(String(v.bottom)) || !Array.isArray(v.accessories) || typeof v.topColor !== 'string' || typeof v.bottomColor !== 'string') return null;
  return { top: v.top as Look['top'], bottom: v.bottom as Look['bottom'], accessories: [...new Set(v.accessories.filter(x => extras.includes(x)))].slice(0, 12) as Look['accessories'], topColor: v.topColor.slice(0, 30), bottomColor: v.bottomColor.slice(0, 30), ...(typeof v.hairColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.hairColor) ? {hairColor: v.hairColor.toLowerCase()} : {}), ...(['fresh','rose','glam','sunset','bold'].includes(String(v.makeup)) ? {makeup:v.makeup as Look['makeup']} : {}) };
}
export function sanitizeSocial(value: unknown): SocialState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return blank();
  const v = value as Record<string, unknown>;
  const signatures = Array.isArray(v.rewardedSignatures) ? [...new Set(v.rewardedSignatures.filter(x => typeof x === 'string' && x.length <= 700))].slice(0, MAX_SIGNATURES) as string[] : [];
  const photos: StoredPhoto[] = [];
  if (Array.isArray(v.photos)) for (const item of v.photos.slice(0, MAX_PHOTOS)) {
    if (!item || typeof item !== 'object' || !isPhotoImage(item.image)) continue;
    const look = readLook(item.look);
    if (!look || !POSES.includes(item.pose) || !item.id || photos.some(photo => photo.id === item.id)) continue;
    const photo: StoredPhoto = { id: cleanText(item.id, 80), image: item.image, caption: cleanText(item.caption, 180), createdAt: count(item.createdAt, Number.MAX_SAFE_INTEGER), pose: item.pose, ...photoGroup(item), companionId: item.companionId ? cleanText(item.companionId, 60) : null, companionName: item.companionName ? cleanText(item.companionName, 60) : null, zone: cleanText(item.zone, 60), look, signature: '' };
    photo.signature = photoSignature(photo);
    if (item.post && typeof item.post === 'object') {
      photo.post = { likes: count(item.post.likes, 9999), liked: item.post.liked === true, comments: Array.isArray(item.post.comments) ? item.post.comments.slice(0, 3).map((c: Record<string, unknown>) => ({ name: cleanText(c?.name, 60), text: cleanText(c?.text, 120) })) : [], publishedAt: count(item.post.publishedAt, Number.MAX_SAFE_INTEGER) };
      // A post in a partially restored save must not earn its reward twice.
      if (!signatures.includes(photo.signature) && signatures.length < MAX_SIGNATURES) signatures.push(photo.signature);
    }
    photos.push(photo);
  }
  return { followers: count(v.followers), photos, rewardedSignatures: signatures };
}
export function loadSocial(storage: Pick<Storage, 'getItem'> | null = safeStorage()): SocialState {
  try { const raw = storage?.getItem(SOCIAL_KEY); return raw && raw.length < 5_000_000 ? sanitizeSocial(JSON.parse(raw)) : blank(); } catch { return blank(); }
}
export function saveSocial(value: SocialState, storage: Pick<Storage, 'setItem'> | null = safeStorage()): { state: SocialState; persisted: boolean; trimmed: boolean } {
  const state = sanitizeSocial(value);
  if (!storage) return { state, persisted: false, trimmed: false };
  // Keep the newest shot and reward history if the browser's quota is small.
  const candidate = { ...state, photos: [...state.photos] };
  for (;;) {
    try { storage.setItem(SOCIAL_KEY, JSON.stringify(candidate)); return { state: candidate, persisted: true, trimmed: candidate.photos.length !== state.photos.length }; }
    catch { if (candidate.photos.length <= 1) return { state, persisted: false, trimmed: false }; candidate.photos.pop(); }
  }
}
export function addPhoto(state: SocialState, input: PhotoInput, now = Date.now()): SocialState {
  if (!isPhotoImage(input.image)) return state;
  const group = photoGroup(input);
  const photo: StoredPhoto = { ...input, ...group, companionId: group.groupIds[0] ?? null, companionName: group.groupNames.join(' & ') || input.companionName, look: { ...input.look, accessories: [...input.look.accessories] }, id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 9)}`, createdAt: now, caption: `${input.zone} moments${input.companionName ? ` with ${input.companionName}` : ''}`, signature: photoSignature(input) };
  return { ...state, photos: [photo, ...state.photos].slice(0, MAX_PHOTOS) };
}
export function deletePhoto(state: SocialState, id: string): SocialState { return { ...state, photos: state.photos.filter(photo => photo.id !== id) }; }
export function captionPhoto(state: SocialState, id: string, caption: string): SocialState { return { ...state, photos: state.photos.map(photo => photo.id === id ? { ...photo, caption: caption.slice(0, 180) } : photo) }; }
export function publishPhoto(state: SocialState, id: string, names: string[] = ['Isla', 'Cleo'], now = Date.now()): { state: SocialState; gained: number } {
  const photo = state.photos.find(item => item.id === id);
  if (!photo || photo.post) return { state, gained: 0 };
  const fresh = !state.rewardedSignatures.includes(photo.signature) && state.rewardedSignatures.length < MAX_SIGNATURES;
  const hash = [...photo.signature].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 7);
  const gained = fresh ? Math.min(6 + hash % 8 + photo.groupIds.length * 3, MAX_FOLLOWERS - state.followers) : 0;
  const comments = [
    { name: photo.companionId && photo.companionId !== 'pet' && photo.companionName ? photo.companionName : names[hash % Math.max(1, names.length)] || 'Isla', text: ['This look is a whole mood!', 'Dreamland cover star!', 'The colors! The pose! Love it.'][hash % 3] },
    { name: names[(hash + 1) % Math.max(1, names.length)] || 'Cleo', text: photo.groupIds.includes('pet') ? 'Your little co-star stole my heart.' : `Meet me at ${photo.zone.slice(0, 40)} next time!` },
  ];
  return { gained, state: { ...state, followers: state.followers + gained, rewardedSignatures: fresh ? [...state.rewardedSignatures, photo.signature] : state.rewardedSignatures, photos: state.photos.map(item => item.id === id ? { ...item, post: { likes: 12 + hash % 67 + Math.min(200, Math.floor(state.followers / 4)), liked: false, comments, publishedAt: now } } : item) } };
}
export function togglePhotoLike(state: SocialState, id: string): SocialState { return { ...state, photos: state.photos.map(photo => photo.id === id && photo.post ? { ...photo, post: { ...photo.post, liked: !photo.post.liked, likes: Math.max(0, photo.post.likes + (photo.post.liked ? -1 : 1)) } } : photo) }; }
