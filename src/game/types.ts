export type ZoneId = 'dreamhouse' | 'beach' | 'avenue';

export type VehicleId = 'convertible' | 'scooter' | 'buggy';

export type SpotId =
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

export type SpotKind = 'activity' | 'vehicle' | 'reward';

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
export type HairId = 'blonde' | 'pink' | 'updo';
export type AccessoryId = 'none' | 'sunglasses' | 'tiara';
export type ShoesId = 'heels' | 'sneakers' | 'boots';

export type GameEvent =
  | { type: 'zone'; zone: ZoneId }
  | { type: 'near'; spot: NearbySpot }
  | { type: 'vehicle'; vehicle: VehicleId | null }
  | { type: 'token'; points: number; count: number }
  | { type: 'collectorCard'; id: number }
  | { type: 'spot'; id: SpotId };