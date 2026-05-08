import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError } from "./http";

export interface PendingRatingItem {
  match_request_id: string;
  ride_id: string;
  other_party_name?: string | null;
  other_party_avatar_url?: string | null;
  origin_address?: string | null;
  dest_address?: string | null;
  days_since_accepted: number;
  existing_score?: number | null;
}

export interface ReceivedRatingItem {
  id: string;
  match_request_id: string;
  rater_id: string;
  rater_name?: string | null;
  rater_avatar_url?: string | null;
  score: number;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GivenRatingItem {
  id: string;
  match_request_id: string;
  ratee_id: string;
  ratee_name?: string | null;
  ratee_avatar_url?: string | null;
  score: number;
  comment?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RatingSubmitRequest {
  match_request_id: string;
  score: number;
  comment?: string | null;
}

async function authHeaders() {
  const session = await loadSession();
  if (!session?.access_token) throw new HttpError("Authentication required", { status: 401 });
  return { Authorization: `Bearer ${session.access_token}`, "ngrok-skip-browser-warning": "1" };
}

async function getJson<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data === "object" && data && typeof (data as any).detail === "string"
      ? (data as any).detail
      : `Request failed with status ${response.status}`;
    throw new HttpError(detail, { status: response.status, data });
  }
  return data as T;
}

export async function getPendingRatings(): Promise<PendingRatingItem[]> {
  return getJson<PendingRatingItem[]>("/ratings/pending");
}

export async function getReceivedRatings(): Promise<ReceivedRatingItem[]> {
  return getJson<ReceivedRatingItem[]>("/ratings/received");
}

export async function getGivenRatings(): Promise<GivenRatingItem[]> {
  return getJson<GivenRatingItem[]>("/ratings/given");
}

export async function submitRating(payload: RatingSubmitRequest) {
  const session = await loadSession();
  if (!session?.access_token) throw new HttpError("Authentication required", { status: 401 });

  const response = await fetch(`${API_BASE_URL}/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      "ngrok-skip-browser-warning": "1",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data === "object" && data && typeof (data as any).detail === "string"
      ? (data as any).detail
      : `Request failed with status ${response.status}`;
    throw new HttpError(detail, { status: response.status, data });
  }
  return data;
}
