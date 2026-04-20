import { AxiosError } from "axios";
import * as SecureStore from "expo-secure-store";
import { http, setAuthToken } from "./http";

const SESSION_KEY = "routee.auth.session";

export type UserRole = "rider" | "driver";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  roles: UserRole[];
}

export interface RiderRegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  gender?: string;
  date_of_birth?: string;
}

export interface DriverRegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  gender: string;
  date_of_birth?: string;
}

export async function registerRider(payload: RiderRegisterRequest) {
  const response = await http.post<AuthResponse>(
    "/auth/register/rider",
    payload,
  );
  return response.data;
}

export async function registerDriver(payload: DriverRegisterRequest) {
  const response = await http.post<AuthResponse>(
    "/auth/register/driver",
    payload,
  );
  return response.data;
}

export async function saveSession(session: AuthResponse) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  setAuthToken(session.access_token);
}

export async function loadSession() {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw) as AuthResponse;
  setAuthToken(parsed.access_token);
  return parsed;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  setAuthToken(null);
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.length > 0) return detail;
    if (error.message) return error.message;
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
