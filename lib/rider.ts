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
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
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

const PROFILE_ENDPOINTS = [
  "/rider/me",
  "/riders/me",
  "/rider/profile",
  "/me",
] as const;
const LOCATION_BASE_ENDPOINTS = [
  "/rider/locations",
  "/rider/location",
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

export async function getMyRiderProfile() {
  const profile = await tryGet<RiderProfile>(PROFILE_ENDPOINTS);
  return normalizeProfile(profile);
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
    const response = await http.post<SavedLocation>(
      LOCATION_BASE_ENDPOINTS[0],
      input,
    );
    return response.data;
  }

  const updatePaths = [
    `${LOCATION_BASE_ENDPOINTS[0]}/${existing.id}`,
    `${LOCATION_BASE_ENDPOINTS[1]}/${existing.id}`,
  ] as const;

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
