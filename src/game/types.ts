import type { ActivityState } from '@/game/lifestyle-types';

export type ZoneId = 'dreamhouse' | 'beach' | 'avenue';

export type VehicleId = 'convertible' | 'scooter' | 'buggy';

export type SpotId =
  | 'salon' | 'makeup'
  | 'resident'
  | 'runway'
  | 'dj'
  | 'pet'
  | 'boutique'
  | 'wardrobe'
  | 'smoothie'
  | 'moodlight'
  | 'kitchen'
  | 'pool'
  | 'mirror'
  | 'dancefloor'
  | 'slide'
  | 'petbed'
  | 'surf'
  | 'volley'
  | 'photo'
  | 'cafe'
  | VehicleId;

export type SpotKind = 'activity' | 'vehicle' | 'reward' | 'social';

export type ColliderBox = {
  x: number;
  y: number;
  z: number;
  hx: number;
  hy: number;
  hz: number;
};

export type Spot = {
  id: SpotId;
  label: string;
  hint: string;
  x: number;
  y?: number;
  z: number;
  radius: number;
  kind: SpotKind;
  markerY?: number;
};

export type NearbySpot = {
  id: SpotId;
  label: string;
  hint: string;
  kind: SpotKind;
} | null;

export type OutfitId = 'glam' | 'beach' | 'popstar' | 'casual';
export type HairId = 'blonde' | 'pink' | 'updo' | 'bob' | 'curls' | 'braids' | 'pixie' | 'twin-buns' | 'straight';
export type AccessoryId = 'none' | 'sunglasses' | 'tiara';
export type ShoesId = 'heels' | 'sneakers' | 'boots' | 'sandals' | 'platforms';

export type GameEvent =
  | { type: 'resident'; id: string }
  | { type: 'activity'; state: ActivityState }
  | { type: 'zone'; zone: ZoneId }
  | { type: 'near'; spot: NearbySpot }
  | { type: 'vehicle'; vehicle: VehicleId | null }
  | { type: 'token'; points: number; count: number }
  | { type: 'collectorCard'; id: number }
  | { type: 'spot'; id: SpotId };