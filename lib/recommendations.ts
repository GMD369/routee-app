import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError } from "./http";
import { RideResponse } from "./ride";

export interface RideRecommendation extends RideResponse {
  match_score: number;
  match_breakdown?: Record<string, number> | null;
  virtual_pickup_location?: string | null;
  virtual_dropoff_location?: string | null;
  driver_full_name?: string | null;
  driver_avatar_url?: string | null;
  driver_rating_avg?: number | null;
  driver_rating_count?: number | null;
}

export interface RiderRecommendation {
  rider_id: string;
  request_id?: string | null;
  match_type: "requested" | "potential" | string;
  commute_id?: string | null;
  full_name: string;
  avatar_url?: string | null;
  gender?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  total_rides_taken?: number | null;
  preferences?: Record<string, unknown> | null;
  seats_requested?: number | null;
  message?: string | null;
  virtual_pickup_location?: string | null;
  virtual_dropoff_location?: string | null;
  match_score: number;
  match_breakdown?: Record<string, number> | null;
}

function extractArrayResponse<T>(data: unknown) {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== "object") {
    return [] as T[];
  }

  const response = data as {
    items?: unknown;
    data?: unknown;
    results?: unknown;
    recommendations?: unknown;
    rides?: unknown;
  };

  const candidates = [
    response.items,
    response.data,
    response.results,
    response.recommendations,
    response.rides,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [] as T[];
}

export async function listRecommendedRides(pairId: string, topN = 5) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const searchParams = new URLSearchParams({
    top_n: String(topN),
  });

  const response = await fetch(
    `${API_BASE_URL}/recommendations/rides/${pairId}?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;

    throw new HttpError(detail, { status: response.status, data });
  }

  return extractArrayResponse<RideRecommendation>(data);
}

export async function listRecommendedRiders(rideId: string, topN = 10) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const searchParams = new URLSearchParams({
    top_n: String(topN),
  });

  const response = await fetch(
    `${API_BASE_URL}/rides/${rideId}/riders?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof data === "object" &&
      data &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;

    throw new HttpError(detail, { status: response.status, data });
  }

  return extractArrayResponse<RiderRecommendation>(data);
}
