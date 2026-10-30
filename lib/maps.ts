/**
 * Map pins and the 100 m rule.
 * Google Maps drops in when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.
 * Without a key, the picker uses OpenStreetMap tiles.
 * The proximity check is only available for a map-based hunt. Play does not
 * ask for the phone's place yet; `withinProximity` is the hook for that check.
 */

export const PROXIMITY_METRES = 100;

export const OSM_TILES = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
} as const;

export type MapProviderId = "osm" | "google";

export type MapProvider = {
  id: MapProviderId;
  /** Present only for the Google drop-in. The OSM picker does not use it. */
  googleMapsApiKey: string | null;
};

export function resolveMapProvider(env: { googleMapsApiKey?: string | null } = {}): MapProvider {
  const key = env.googleMapsApiKey?.trim() || null;
  if (key) return { id: "google", googleMapsApiKey: key };
  return { id: "osm", googleMapsApiKey: null };
}

export function clientMapProvider(): MapProvider {
  return resolveMapProvider({ googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY });
}

type Place = { label: string; lat: number | null; lng: number | null } | null | undefined;

export function textPlaceIsSet(location: Place): boolean {
  return Boolean(location?.label.trim());
}

export function pinIsSet(location: Place): boolean {
  if (!location) return false;
  return isLat(location.lat) && isLng(location.lng);
}

/** Text mode needs a written clue. Map mode needs a pin. */
export function placeIsReady(location: Place, mapBased: boolean): boolean {
  return mapBased ? pinIsSet(location) : textPlaceIsSet(location);
}

/** The 100 m rule cannot be turned on unless the hunt is map based. */
export function resolveProximity(
  mapBased: boolean,
  requested: boolean,
): { enabled: boolean; metres: number | null } {
  if (!mapBased || !requested) return { enabled: false, metres: null };
  return { enabled: true, metres: PROXIMITY_METRES };
}

export function withinProximity(
  pin: { lat: number; lng: number },
  player: { lat: number; lng: number },
  metres = PROXIMITY_METRES,
): boolean {
  if (!isLat(pin.lat) || !isLng(pin.lng) || !isLat(player.lat) || !isLng(player.lng)) return false;
  return haversineMetres(pin, player) <= metres;
}

function isLat(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isLng(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function haversineMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const earth = 6_371_000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}
