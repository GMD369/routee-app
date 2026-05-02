import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { HttpError, http } from "./http";

export type VerificationStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

export interface DriverPreferences {
  music: boolean;
  smoking: boolean;
  pets: boolean;
  ac: boolean;
  talking: boolean;
}

export interface DriverUpdateRequest {
  preferences?: DriverPreferences;
  bio?: string;
}

export interface UploadDocumentFile {
  uri: string;
  name: string;
  type?: string | null;
}

export interface DriverVerificationUploadRequest {
  cnic_number: string;
  cnic_front: UploadDocumentFile;
  cnic_back: UploadDocumentFile;
  license_number?: string;
  license_doc?: UploadDocumentFile;
}

export interface VerificationSubmitResponse {
  message: string;
  verification_status: string;
}

export interface DriverProfile {
  id: string;
  profile_id: string;
  avatar_url?: string | null;
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
    avatar_url?: string | null;
  };
}

const DRIVER_PROFILE_ENDPOINTS = ["/drivers/me"] as const;
const DRIVER_AVATAR_ENDPOINTS = ["/drivers/me/avatar"] as const;

const DEFAULT_PREFERENCES: DriverPreferences = {
  music: false,
  smoking: false,
  pets: false,
  ac: true,
  talking: true,
};

function normalizeDriverProfile(profile: DriverProfile): DriverProfile {
  return {
    ...profile,
    rating_avg: Number(profile.rating_avg || 0),
    rating_count: Number(profile.rating_count || 0),
    total_rides_given: Number(profile.total_rides_given || 0),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...(profile.preferences || {}),
    },
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

async function tryPut<T>(paths: readonly string[], body: unknown): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const response = await http.put<T>(path, body);
      return response.data;
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 404 || error.status === 405) {
          try {
            const fallback = await http.patch<T>(path, body);
            return fallback.data;
          } catch (patchError) {
            if (
              patchError instanceof HttpError &&
              patchError.status &&
              patchError.status !== 404 &&
              patchError.status !== 405
            ) {
              throw patchError;
            }
            lastError = patchError;
            continue;
          }
        }

        if (error.status && error.status !== 404) {
          throw error;
        }
      }

      lastError = error;
    }
  }

  throw (
    lastError ||
    new HttpError("Driver profile update endpoint not found", {
      status: 404,
    })
  );
}

export async function getMyDriverProfile() {
  const profile = await tryGet<DriverProfile>(DRIVER_PROFILE_ENDPOINTS);
  return normalizeDriverProfile(profile);
}

export async function getDriverPreferences(driverId: string): Promise<DriverPreferences> {
  const response = await http.get(`/riders/drivers/${driverId}/preferences`);
  return response.data as DriverPreferences;
}

export async function updateMyDriverProfile(payload: DriverUpdateRequest) {
  const updated = await tryPut<DriverProfile>(
    DRIVER_PROFILE_ENDPOINTS,
    payload,
  );

  const normalized = normalizeDriverProfile(updated);
  if (normalized.profiles) {
    return normalized;
  }

  // PUT /drivers/me may return only the drivers row. Re-fetch to hydrate nested profile data.
  try {
    return await getMyDriverProfile();
  } catch {
    return normalized;
  }
}

export async function uploadDriverAvatar(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<{ avatar_url?: string | null }> {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const formData = new FormData();
  formData.append("avatar", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as never);

  let lastError: HttpError | null = null;

  for (const path of DRIVER_AVATAR_ENDPOINTS) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (response.ok) {
      return data as { avatar_url?: string | null };
    }

    const detail =
      typeof data === "object" &&
      data &&
      "detail" in data &&
      typeof (data as { detail?: unknown }).detail === "string"
        ? (data as { detail: string }).detail
        : `Request failed with status ${response.status}`;

    const error = new HttpError(detail, { status: response.status, data });
    if (response.status === 404) {
      lastError = error;
      continue;
    }
    throw error;
  }

  throw (
    lastError ||
    new HttpError("Avatar upload endpoint not found", { status: 404 })
  );
}

function appendUploadFile(
  formData: FormData,
  fieldName: string,
  file: UploadDocumentFile,
) {
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type || "image/jpeg",
  } as unknown as Blob);
}

async function parseUploadResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

export async function uploadDriverVerificationDocuments(
  payload: DriverVerificationUploadRequest,
) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const formData = new FormData();
  formData.append("cnic_number", payload.cnic_number);
  appendUploadFile(formData, "cnic_front", payload.cnic_front);
  appendUploadFile(formData, "cnic_back", payload.cnic_back);

  if (payload.license_number?.trim()) {
    formData.append("license_number", payload.license_number.trim());
  }
  if (payload.license_doc) {
    appendUploadFile(formData, "license_doc", payload.license_doc);
  }

  const response = await fetch(
    `${API_BASE_URL}/drivers/verification/documents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    },
  );

  const data = await parseUploadResponseBody(response);

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

  return data as VerificationSubmitResponse;
}
