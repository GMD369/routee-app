import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError } from "./http";

export interface RideResponse {
  id: string;
  driver_id: string;
  vehicle_id?: string | null;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
  estimated_arrival?: string | null;
  total_seats: number;
  available_seats: number;
  pickup_radius_m: number;
  price_per_seat: number;
  price_negotiable: boolean;
  gender_pref: string;
  rider_prefs: Record<string, unknown>;
  notes?: string | null;
  is_recurring: boolean;
  recurrence_days: number[];
  recurrence_end_date?: string | null;
  distance_km?: number | null;
  estimated_duration_min?: number | null;
  route_polyline_encoded?: string | null;
  suggested_price?: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RideCreateRequest {
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
  total_seats: number;
  price_per_seat: number;
  price_negotiable?: boolean;
  gender_pref?: "male" | "female" | "any";
  rider_prefs?: Record<string, unknown>;
  vehicle_id?: string | null;
  pickup_radius_m?: number;
  is_recurring?: boolean;
  recurrence_days?: number[];
  recurrence_end_date?: string | null;
  notes?: string | null;
}

export async function createRide(payload: RideCreateRequest) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/rides/me`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

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

  return data as RideResponse;
}

export interface RideSearchResult extends RideResponse {
  driver_full_name?: string | null;
  driver_avatar_url?: string | null;
  driver_rating_avg?: number | null;
  driver_rating_count?: number | null;
}

export interface SearchRidesParams {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
  gender?: "male" | "female";
}

export async function searchRides(params: SearchRidesParams): Promise<RideSearchResult[]> {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const qs = new URLSearchParams({
    origin_lat: String(params.origin_lat),
    origin_lng: String(params.origin_lng),
    dest_lat: String(params.dest_lat),
    dest_lng: String(params.dest_lng),
    departure_time: params.departure_time,
  });
  if (params.gender) qs.set("gender", params.gender);

  const response = await fetch(`${API_BASE_URL}/search/rides?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "ngrok-skip-browser-warning": "1",
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof data === "object" && data && typeof (data as any).detail === "string"
        ? (data as any).detail
        : `Request failed with status ${response.status}`;
    throw new HttpError(detail, { status: response.status, data });
  }

  return data as RideSearchResult[];
}

export async function listMyRides() {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/rides/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

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

  return Array.isArray(data) ? (data as RideResponse[]) : [];
}

export async function getMyRide(rideId: string) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/rides/me/${rideId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

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

  return data as RideResponse;
}

export async function cancelRide(rideId: string) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/rides/me/${rideId}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

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

  return data as RideResponse;
}

export async function deleteRide(rideId: string) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/rides/me/${rideId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const detail =
      typeof data === "object" &&
      data &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Delete failed with status ${response.status}`;

    throw new HttpError(detail, { status: response.status, data });
  }

  return true;
}
