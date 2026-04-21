import { HttpError, http } from "./http";

export type VerificationStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

export interface DriverPreferences {
  music: boolean;
  smoking: boolean;
  pets: boolean;
  ac: boolean;
  talking: boolean;
}

export interface DriverUpdateRequest {
  preferences?: DriverPreferences;
  bio?: string;
}

export interface DriverProfile {
  id: string;
  profile_id: string;
  cnic_number?: string | null;
  license_number?: string | null;
  verification_status: VerificationStatus;
  rating_avg: number;
  rating_count: number;
  total_rides_given: number;
  preferences?: DriverPreferences | null;
  bio?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
  };
}

const DRIVER_PROFILE_ENDPOINTS = ["/drivers/me"] as const;

const DEFAULT_PREFERENCES: DriverPreferences = {
  music: false,
  smoking: false,
  pets: false,
  ac: true,
  talking: true,
};

function normalizeDriverProfile(profile: DriverProfile): DriverProfile {
  return {
    ...profile,
    rating_avg: Number(profile.rating_avg || 0),
    rating_count: Number(profile.rating_count || 0),
    total_rides_given: Number(profile.total_rides_given || 0),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(profile.preferences || {}),
    },
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
    new HttpError("Driver profile endpoint not found", {
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
    new HttpError("Driver profile update endpoint not found", {
      status: 404,
    })
  );
}

export async function getMyDriverProfile() {
  const profile = await tryGet<DriverProfile>(DRIVER_PROFILE_ENDPOINTS);
  return normalizeDriverProfile(profile);
}

export async function updateMyDriverProfile(payload: DriverUpdateRequest) {
  const updated = await tryPut<DriverProfile>(
    DRIVER_PROFILE_ENDPOINTS,
    payload,
  );

  const normalized = normalizeDriverProfile(updated);
  if (normalized.profiles) {
    return normalized;
  }

  // PUT /drivers/me may return only the drivers row. Re-fetch to hydrate nested profile data.
  try {
    return await getMyDriverProfile();
  } catch {
    return normalized;
  }
}
