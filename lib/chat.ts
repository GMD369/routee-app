import { http } from "./http";

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatDetailResponse {
  id: string;
  match_request_id: string;
  match_request_status: string;
  chat_status: string;
  my_role: string;
  initiator: string;
  ride_id: string;
  driver_id: string;
  rider_id: string;
  other_party_profile_id: string;
  other_party_name: string;
  other_party_avatar_url?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatSummary {
  id: string;
  match_request_id: string;
  match_request_status: string;
  chat_status: string;
  my_role: string;
  initiator: string;
  ride_id: string;
  driver_id: string;
  rider_id: string;
  other_party_profile_id: string;
  other_party_name: string;
  other_party_avatar_url?: string;
  last_message?: ChatMessage | null;
  created_at: string;
}

export async function getChatDetails(chatId: string): Promise<ChatDetailResponse> {
  const response = await http.get(`/chats/${chatId}`);
  return response.data as ChatDetailResponse;
}

export async function sendChatMessage(chatId: string, content: string) {
  const response = await http.post(`/chats/${chatId}/messages`, { content });
  return response.data;
}

export async function listChats(): Promise<ChatSummary[]> {
  const response = await http.get(`/chats`);
  return response.data as ChatSummary[];
}
