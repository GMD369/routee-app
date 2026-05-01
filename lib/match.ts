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
