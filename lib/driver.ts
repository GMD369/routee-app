import { HttpError, http } from "./http";

export type VerificationStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

export interface DriverPreferences {
  music_ok: boolean;
  quiet_ride: boolean;
  women_only: boolean;
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

function normalizeDriverProfile(profile: DriverProfile): DriverProfile {
  return {
    ...profile,
    rating_avg: Number(profile.rating_avg || 0),
    rating_count: Number(profile.rating_count || 0),
    total_rides_given: Number(profile.total_rides_given || 0),
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

export async function getMyDriverProfile() {
  const profile = await tryGet<DriverProfile>(DRIVER_PROFILE_ENDPOINTS);
  return normalizeDriverProfile(profile);
}
