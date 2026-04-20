import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";
import { http, HttpError, setAuthToken } from "./http";

const SESSION_KEY = "routee.auth.session";

export type UserRole = "rider" | "driver";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  user_id: string;
  roles: UserRole[];
}

export interface LoginRequest {
  email: string;
  password: string;
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

export async function login(payload: LoginRequest) {
  const response = await http.post<AuthResponse>("/auth/login", payload);
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
  if (error instanceof HttpError) {
    const detail =
      typeof error.data === "object" &&
      error.data &&
      "detail" in error.data &&
      typeof (error.data as { detail?: unknown }).detail === "string"
        ? (error.data as { detail: string }).detail
        : null;

    if (detail) return detail;

    if (error.isNetworkError) {
      return `Cannot reach backend. Check API URL (${API_BASE_URL}) and ensure the phone/emulator can access your server.`;
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
