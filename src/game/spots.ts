import type { Spot, ZoneId } from '@/game/types';

export const ZONES: Record<ZoneId, { name: string; x: number; z: number }> = {
  dreamhouse: { name: 'The Dreamhouse', x: 0, z: -36 },
  avenue: { name: 'Fashion Avenue', x: -46, z: 14 },
  beach: { name: 'Glam Beach', x: 42, z: 34 },
};

export const ZONE_ORDER: ZoneId[] = ['dreamhouse', 'avenue', 'beach'];

export const SPOTS: Spot[] = [
  {
    id: 'wardrobe',
    label: 'Style Studio',
    hint: 'Preview & save looks',
    x: -2,
    y: 3.9,
    z: -50,
    radius: 2.8,
    kind: 'activity',
    markerY: 6.4,
  },
  {
    id: 'mirror',
    label: 'Smart Mirror',
    hint: 'Instant outfit preview',
    x: 1.5,
    y: 3.9,
    z: -50.4,
    radius: 2.5,
    kind: 'activity',
    markerY: 6.4,
  },
  {
    id: 'moodlight',
    label: 'Mood Light',
    hint: 'Set the room mood',
    x: -7.9,
    z: -40.7,
    radius: 2.4,
    kind: 'activity',
  },
  {
    id: 'kitchen',
    label: 'Smoothie Station',
    hint: 'Mix a dreamy smoothie',
    x: 4.5,
    z: -41,
    radius: 2.6,
    kind: 'activity',
  },
  {
    id: 'pool',
    label: 'Pool Terrace',
    hint: 'Poolside sparkle',
    x: 0,
    z: -20.6,
    radius: 3.4,
    kind: 'reward',
  },
  {
    id: 'slide',
    label: 'Pool Slide Rush',
    hint: 'Ride & grab tokens',
    x: 3.2,
    z: -23.4,
    radius: 3.2,
    kind: 'activity',
    markerY: 3.4,
  },
  {
    id: 'dj',
    label: 'DJ Booth',
    hint: 'Start the party',
    x: 11,
    z: -30,
    radius: 3.4,
    kind: 'activity',
  },
  {
    id: 'dancefloor',
    label: 'Dance Floor',
    hint: 'Light up the tiles',
    x: 11.5,
    z: -27,
    radius: 3,
    kind: 'activity',
    markerY: 3.2,
  },
  {
    id: 'petbed',
    label: 'Puppy Bed',
    hint: 'Play with the puppy',
    x: 4.5,
    z: -34.5,
    radius: 2.6,
    kind: 'reward',
  },
  {
    id: 'convertible',
    label: 'Pink Convertible',
    hint: 'Hop in and cruise',
    x: 15,
    z: -42,
    radius: 3.6,
    kind: 'vehicle',
  },
  {
    id: 'runway',
    label: 'Fashion Runway',
    hint: 'Strike a pose',
    x: -46,
    z: 4,
    radius: 4,
    kind: 'activity',
  },
  {
    id: 'photo',
    label: 'Glam Photo Booth',
    hint: 'Nail the pose',
    x: -46,
    z: 16.4,
    radius: 3.2,
    kind: 'activity',
  },
  {
    id: 'boutique',
    label: 'Boutique',
    hint: 'Browse new looks',
    x: -51,
    z: 12,
    radius: 3.6,
    kind: 'activity',
  },
  {
    id: 'cafe',
    label: 'Cupcake Café',
    hint: 'Grab a sweet treat',
    x: -49,
    z: 26,
    radius: 3.2,
    kind: 'reward',
  },
  {
    id: 'pet',
    label: 'Pet Salon',
    hint: 'Pamper a pet',
    x: -28.5,
    z: 8.5,
    radius: 3.8,
    kind: 'activity',
  },
  {
    id: 'salon',
    label: 'Gloss Hair Salon',
    hint: 'Try a fresh cut and color',
    x: -29,
    z: 21.2,
    radius: 3.4,
    kind: 'activity',
  },
  {
    id: 'makeup',
    label: 'Makeup Vanity',
    hint: 'Create your beauty look',
    x: -4.5,
    y: 3.9,
    z: -50.7,
    radius: 1.8,
    kind: 'activity',
    markerY: 6.2,
  },
  {
    id: 'smoothie',
    label: 'Sunset Sips',
    hint: 'Hold to pour the perfect serve',
    x: 30,
    z: 24,
    radius: 3.4,
    kind: 'activity',
  },
  {
    id: 'surf',
    label: 'Surf Shack',
    hint: 'Catch a wave',
    x: 47,
    z: 26.6,
    radius: 3.2,
    kind: 'activity',
  },
  {
    id: 'volley',
    label: 'Beach Volleyball',
    hint: 'Rally across the beach net',
    x: 50,
    z: 37.2,
    radius: 3.4,
    kind: 'activity',
  },
  {
    id: 'netball',
    label: 'Sunset Netball',
    hint: 'Aim for the freestanding hoop',
    x: 17,
    z: 35.5,
    radius: 3.4,
    kind: 'activity',
  },
  {
    id: 'scooter',
    label: 'Pink Scooter',
    hint: 'Ride the avenue',
    x: 34,
    z: 44,
    radius: 3.4,
    kind: 'vehicle',
  },
  {
    id: 'buggy',
    label: 'Beach Buggy',
    hint: 'Drive the coastline',
    x: 58,
    z: 27,
    radius: 3.6,
    kind: 'vehicle',
  },
];

export function zoneAt(x: number, z: number): ZoneId {
  let best: ZoneId = 'dreamhouse';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const dx = x - zone.x;
    const dz = z - zone.z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = id;
    }
  }
  return best;
}

export function nearestSpot(x: number, y: number, z: number, list: Spot[]): Spot | null {
  let best: Spot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const spot of list) {
    const spotY = spot.y ?? 0;
    const dy = Math.abs(y - spotY);
    if (dy > 2.4) continue;
    const dx = x - spot.x;
    const dz = z - spot.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < spot.radius && distance < bestDistance) {
      bestDistance = distance;
      best = spot;
    }
  }
  return best;
}