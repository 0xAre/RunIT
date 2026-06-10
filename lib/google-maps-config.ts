/**
 * Google Maps API keys for RunIT.
 *
 * Resolution order:
 * - Server (Geocoding / Places REST): GOOGLE_MAPS_SERVER_KEY → GOOGLE_MAPS_API_KEY
 * - Browser (Maps JS): NEXT_PUBLIC_* → GOOGLE_MAPS_API_KEY (via /api/config/maps, auth-gated)
 *
 * Referrer restrictions on the key are optional. When using one shared key,
 * routes under /api/search/* and /api/config/maps require Firebase auth in production.
 */

export function getBrowserMapsKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    ''
  );
}

export function getServerMapsKey(): string | null {
  const dedicated = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (dedicated) return dedicated;

  const shared = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return shared || null;
}

export function canUseGoogleMapsServer(): boolean {
  return !!getServerMapsKey();
}
