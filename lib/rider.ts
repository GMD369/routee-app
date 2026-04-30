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

export interface RiderProfile {
  id: string;
  profile_id: string;
  preferences: RiderPreferences;
  saved_locations: SavedLocation[];
  rating_avg: number;
  rating_count: number;
  total_rides_taken: number;
  is_active: boolean;
}

export interface SavedLocationInput {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
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
}

export interface SavedLocationPairResponse {
  pair_id: string;
  rider_id: string;
  is_default?: boolean;
  start_location?: SavedLocation | null;
  end_location?: SavedLocation | null;
  saved_locations?: SavedLocation[];
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
const LOCATION_UPDATE_BASE_ENDPOINTS = [
  "/riders/me/locations",
  "/me/locations",
] as const;
const LOCATION_DELETE_BASE_ENDPOINTS = [
  "/riders/me/locations",
  "/me/locations",
] as const;

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

export async function saveOrUpdateSavedLocation(
  profile: RiderProfile,
  input: SavedLocationInput,
) {
  const normalizedName = input.name.trim().toLowerCase();
  const existing = profile.saved_locations.find(
    (location) => location.name.trim().toLowerCase() === normalizedName,
  );

  if (!existing) {
    return tryPost<SavedLocation>(LOCATION_CREATE_ENDPOINTS, input);
  }

  const updatePaths = LOCATION_UPDATE_BASE_ENDPOINTS.map(
    (basePath) => `${basePath}/${existing.id}`,
  );

  let lastError: unknown = null;

  for (const path of updatePaths) {
    try {
      const patched = await http.patch<SavedLocation>(path, input);
      return patched.data;
    } catch (patchError) {
      if (patchError instanceof HttpError) {
        if (patchError.status === 404 || patchError.status === 405) {
          try {
            const put = await http.put<SavedLocation>(path, input);
            return put.data;
          } catch (putError) {
            if (
              putError instanceof HttpError &&
              putError.status &&
              putError.status !== 404 &&
              putError.status !== 405
            ) {
              throw putError;
            }
            lastError = putError;
            continue;
          }
        }

        if (patchError.status && patchError.status !== 404) {
          throw patchError;
        }
      }

      lastError = patchError;
    }
  }

  throw (
    lastError ||
    new HttpError("Saved location update endpoint not found", {
      status: 404,
    })
  );
}

export async function deleteSavedLocation(locationId: string) {
  const id = locationId.trim();
  if (!id) {
    throw new Error("Location ID is required.");
  }

  const deletePaths = LOCATION_DELETE_BASE_ENDPOINTS.map(
    (basePath) => `${basePath}/${id}`,
  );

  await tryDelete(deletePaths);
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

export async function createSavedLocation(
  input: SavedLocationInput,
): Promise<SavedLocation> {
  return tryPost<SavedLocation>(LOCATION_CREATE_ENDPOINTS, input);
}

export async function getSavedLocationById(
  locationId: string,
): Promise<SavedLocation | null> {
  const pairs = await tryGet<SavedLocationPairResponse[]>(
    LOCATION_LIST_ENDPOINTS,
  );
  for (const pair of pairs) {
    const locations = pair.saved_locations ?? [];
    const found = locations.find((location) => location.id === locationId);
    if (found) {
      return found;
    }
  }
  return null;
}
