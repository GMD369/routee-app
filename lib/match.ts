import { http } from "./http";

export interface MatchRequestCreate {
  ride_id: string;
  commute_id: string;
  seats_requested?: number;
  message?: string;
}

export async function createMatchRequest(payload: MatchRequestCreate) {
  const response = await http.post("/match-requests", payload);
  return response.data;
}

export async function cancelMatchRequest(matchRequestId: string) {
  const response = await http.post(`/match-requests/${matchRequestId}/cancel`, {});
  return response.data;
}

export async function checkMatchRequestExists(rideId: string, otherPartyId: string): Promise<{ exists: boolean; chat_id: string | null; match_request_status?: string }> {
  const response = await http.get(`/match-requests/exists?ride_id=${rideId}&other_party_id=${otherPartyId}`);
  return response.data as { exists: boolean; chat_id: string | null; match_request_status?: string };
}

export interface IncomingRequest {
  id: string;
  ride_id: string;
  driver_id: string;
  rider_id: string;
  status: string;
  initiator: string;
  my_role: string;
  origin_address?: string;
  dest_address?: string;
  departure_time?: string;
  price_per_seat?: number;
  other_party_profile_id: string;
  other_party_name: string;
  other_party_avatar_url?: string;
  chat_id?: string;
  gender_pref?: string;
}

export async function getIncomingRequests(status?: string): Promise<IncomingRequest[]> {
  const query = status ? `?status=${status}` : '';
  // Adjust endpoint if it is just /incoming instead of /match-requests/incoming
  const response = await http.get(`/match-requests/incoming${query}`);
  return response.data as IncomingRequest[];
}

export async function getSentRequests(status?: string): Promise<IncomingRequest[]> {
  const query = status ? `?status=${status}` : '';
  const response = await http.get(`/match-requests/sent${query}`);
  console.log("=== RAW SENT REQUESTS FROM BACKEND ===", JSON.stringify(response.data, null, 2));
  return response.data as IncomingRequest[];
}

