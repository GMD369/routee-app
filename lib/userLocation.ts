import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError } from "./http";

export interface UserLocation {
  latitude: number;
  longitude: number;
  updated_at?: string | null;
}

// In-memory cache — populated at startup, updated on save
let cached: UserLocation | null = null;

export function getCachedLocation(): UserLocation | null {
  return cached;
}

export function setCachedLocation(loc: UserLocation | null) {
  cached = loc;
}

async function authHeaders() {
  const session = await loadSession();
  if (!session?.access_token) throw new HttpError("Authentication required", { status: 401 });
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "1",
  };
}

/** GET /location — returns null if user has no saved location yet (404). */
export async function getUserLocation(): Promise<UserLocation | null> {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/location`, { headers });
    if (response.status === 404) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) return null;
    const loc = data as UserLocation;
    cached = loc;
    return loc;
  } catch {
    return null;
  }
}

/** POST /location — saves and caches the user's location. */
export async function saveUserLocation(latitude: number, longitude: number): Promise<UserLocation> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/location`, {
    method: "POST",
    headers,
    body: JSON.stringify({ latitude, longitude }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data === "object" && data && typeof (data as any).detail === "string"
        ? (data as any).detail
        : `Failed with status ${response.status}`;
    throw new HttpError(detail, { status: response.status, data });
  }
  const loc = data as UserLocation;
  cached = loc;
  return loc;
}
