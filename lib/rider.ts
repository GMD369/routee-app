import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError, http } from "./http";

export interface RiderPreferences {
  uni_student: boolean;
  corporate_employee: boolean;
  female_only: boolean;
  music_ok: boolean;
  quiet_ride: boolean;
}

export interface SavedLocation {
  id: string;
  rider_id: string;
  pair_id?: string | null;
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  location_type?: "start" | "end" | string | null;
  is_default: boolean;
  created_at?: string | null;
}

export interface SavedLocationPairSummary {
  pair_id: string;
  start_address?: string | null;
  end_address?: string | null;
}

export interface RiderProfile {
  id: string;
  profile_id: string;
  avatar_url?: string | null;
  preferences: RiderPreferences;
  saved_locations: SavedLocation[];
  rating_avg: number;
  rating_count: number;
  total_rides_taken: number;
  is_active: boolean;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    avatar_url?: string | null;
  };
}

export interface LocationPointInput {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface SavedLocationPairCreateRequest {
  start_location: LocationPointInput;
  end_location: LocationPointInput;
  is_default?: boolean;
  departure_time?: string | null; // "HH:MM" format
  is_recurring?: boolean;
  recurrence_days?: number[]; // 0=Sun … 6=Sat
}

export interface CommuteSchedule {
  departure_time?: string | null; // "HH:MM:SS" from backend
  is_recurring?: boolean;
  recurrence_days?: number[]; // 0=Sun … 6=Sat
}

export interface SavedLocationPairResponse {
  pair_id: string;
  rider_id: string;
  is_default?: boolean;
  start_location?: SavedLocation | null;
  end_location?: SavedLocation | null;
  saved_locations?: SavedLocation[];
  // nested shape: { schedule: { departure_time, is_recurring, recurrence_days } }
  schedule?: CommuteSchedule | null;
  // flat shape: departure_time / is_recurring / recurrence_days at top level
  departure_time?: string | null;
  is_recurring?: boolean;
  recurrence_days?: number[] | null;
}

/** Normalise schedule from either nested or flat backend response shape. */
export function extractSchedule(
  pair: SavedLocationPairResponse,
): CommuteSchedule | null {
  if (pair.schedule) return pair.schedule;
  if (pair.departure_time != null || pair.is_recurring != null) {
    return {
      departure_time: pair.departure_time ?? null,
      is_recurring: pair.is_recurring ?? false,
      recurrence_days: pair.recurrence_days ?? [],
    };
  }
  return null;
}

const PROFILE_ENDPOINTS = ["/riders/me", "/me"] as const;
// support both legacy and new backend routes
// prefer explicit rider-scoped routes first (backend currently exposes these)
const LOCATION_CREATE_ENDPOINTS = [
  "/riders/me/locations",
  "/me/locations",
] as const;
const LOCATION_LIST_ENDPOINTS = [
  "/riders/me/locations",
  "/me/locations",
] as const;
const LOCATION_DELETE_BASE_ENDPOINTS = [
  "/riders/me/locations",
  "/me/locations",
] as const;
const AVATAR_UPLOAD_ENDPOINTS = ["/riders/me/avatar", "/me/avatar"] as const;

const DEFAULT_PREFERENCES: RiderPreferences = {
  uni_student: false,
  corporate_employee: false,
  female_only: false,
  music_ok: false,
  quiet_ride: false,
};

function normalizeProfile(profile: RiderProfile): RiderProfile {
  return {
    ...profile,
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(profile.preferences || {}),
    },
    saved_locations: Array.isArray(profile.saved_locations)
      ? profile.saved_locations
      : [],
  };
}

async function tryGet<T>(paths: readonly string[]): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await http.get<T>(path);
      return response.data;
    } catch (error) {
      if (error instanceof HttpError && error.status && error.status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  throw (
    lastError ||
    new HttpError("Rider profile endpoint not found", {
      status: 404,
    })
  );
}

async function tryPut<T>(paths: readonly string[], body: unknown): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await http.put<T>(path, body);
      return response.data;
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 404 || error.status === 405) {
          try {
            const fallback = await http.patch<T>(path, body);
            return fallback.data;
          } catch (patchError) {
            if (
              patchError instanceof HttpError &&
              patchError.status &&
              patchError.status !== 404 &&
              patchError.status !== 405
            ) {
              throw patchError;
            }
            lastError = patchError;
            continue;
          }
        }

        if (error.status && error.status !== 404) {
          throw error;
        }
      }

      lastError = error;
    }
  }

  throw (
    lastError ||
    new HttpError("Rider profile update endpoint not found", {
      status: 404,
    })
  );
}

async function tryPost<T>(paths: readonly string[], body: unknown): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await http.post<T>(path, body);
      return response.data;
    } catch (error) {
      if (error instanceof HttpError && error.status && error.status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  throw (
    lastError ||
    new HttpError("Saved location create endpoint not found", {
      status: 404,
    })
  );
}

async function tryDelete(paths: readonly string[]): Promise<void> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      await http.delete<null>(path);
      return;
    } catch (error) {
      if (error instanceof HttpError && error.status && error.status !== 404) {
        throw error;
      }
      lastError = error;
    }
  }

  throw (
    lastError ||
    new HttpError("Saved location delete endpoint not found", {
      status: 404,
    })
  );
}

export async function getMyRiderProfile() {
  return normalizeProfile(await tryGet<RiderProfile>(PROFILE_ENDPOINTS));
}

export async function createSavedLocationPair(
  input: SavedLocationPairCreateRequest,
): Promise<SavedLocationPairResponse> {
  return tryPost<SavedLocationPairResponse>(LOCATION_CREATE_ENDPOINTS, input);
}

export async function updateRiderPreferences(preferences: RiderPreferences) {
  const updated = await tryPut<RiderProfile>(PROFILE_ENDPOINTS, {
    preferences,
  });
  return normalizeProfile(updated);
}

export async function uploadRiderAvatar(file: {
  uri: string;
  name: string;
  type: string;
}) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const formData = new FormData();
  formData.append("avatar", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as never);

  let lastError: HttpError | null = null;

  for (const path of AVATAR_UPLOAD_ENDPOINTS) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return data as { avatar_url?: string | null };
    }

    const detail =
      typeof data === "object" &&
      data &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;

    const error = new HttpError(detail, { status: response.status, data });

    if (response.status === 404) {
      lastError = error;
      continue;
    }

    throw error;
  }

  throw (
    lastError ||
    new HttpError("Avatar upload endpoint not found", { status: 404 })
  );
}

export async function deleteSavedLocationPair(pairId: string) {
  const id = pairId.trim();
  if (!id) {
    throw new Error("Pair ID is required.");
  }

  const deletePaths = LOCATION_DELETE_BASE_ENDPOINTS.map(
    (basePath) => `${basePath}/${id}`,
  );

  await tryDelete(deletePaths);
}

export async function listSavedLocations(): Promise<
  SavedLocationPairResponse[]
> {
  const response = await tryGet<SavedLocationPairResponse[]>(
    LOCATION_LIST_ENDPOINTS,
  );
  return response.filter(
    (pair) => Boolean(pair.start_location) && Boolean(pair.end_location),
  );
}

export async function listSavedLocationsSummary(): Promise<SavedLocationPairSummary[]> {
  return tryGet<SavedLocationPairSummary[]>([
    "/riders/me/locations/summary",
    "/me/locations/summary",
  ]);
}

export interface ActiveCommute {
  match_request_id: string;
  chat_id: string | null;
  chat_status: string | null;
  ride_id: string;
  commute_id: string;
  seats_reserved: number;
  origin_address: string;
  dest_address: string;
  departure_time: string | null;
  price_per_seat: number;
  driver_id: string;
  driver_name: string;
  driver_avatar_url: string | null;
  driver_rating_avg: number;
}

export async function listActiveCommutes(): Promise<ActiveCommute[]> {
  return tryGet<ActiveCommute[]>([
    "/riders/me/commutes",
    "/me/commutes",
  ]);
}

export interface DriverActiveRide {
  ride_id: string;
  origin_address: string;
  dest_address: string;
  departure_time: string | null;
  total_seats: number;
  available_seats: number;
  ride_status: string;
  passengers: {
    match_request_id: string;
    chat_id: string | null;
    rider_id: string;
    commute_id: string;
    seats_reserved: number;
    rider_name: string;
    rider_avatar_url: string | null;
    rider_rating_avg: number;
  }[];
}

export async function listDriverActiveRides(): Promise<DriverActiveRide[]> {
  return tryGet<DriverActiveRide[]>([
    "/drivers/me/active-rides",
  ]);
}
