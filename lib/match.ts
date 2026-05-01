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

export async function checkMatchRequestExists(rideId: string, otherPartyId: string): Promise<{ exists: boolean; chat_id: string | null }> {
  const response = await http.get(`/match-requests/exists?ride_id=${rideId}&other_party_id=${otherPartyId}`);
  return response.data as { exists: boolean; chat_id: string | null };
}
