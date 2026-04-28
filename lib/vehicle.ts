import { loadSession } from "./auth";
import { API_BASE_URL } from "./config";
import { http, HttpError } from "./http";

export interface VehicleResponse {
  id: string;
  driver_id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  vehicle_type: string;
  total_seats: number;
  has_ac: boolean;
  registration_url?: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleCreateRequest {
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  vehicle_type?: "car" | "suv" | "van" | "motorcycle" | "pickup";
  total_seats?: number;
  has_ac?: boolean;
  is_primary?: boolean;
}

export interface VehicleCreateFormRequest extends VehicleCreateRequest {
  registration_doc?: {
    uri: string;
    name: string;
    type?: string | null;
  } | null;
}

export interface VehicleUpdateRequest {
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  plate_number?: string;
  vehicle_type?: "car" | "suv" | "van" | "motorcycle" | "pickup";
  total_seats?: number;
  has_ac?: boolean;
  is_primary?: boolean;
  is_active?: boolean;
}

export interface VehicleUpdateFormRequest extends VehicleUpdateRequest {
  registration_doc?: {
    uri: string;
    name: string;
    type?: string | null;
  } | null;
}

export async function getMyVehicles() {
  try {
    const response = await http.get<VehicleResponse[]>("/vehicles/me/vehicles");
    return response.data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError("Unable to load vehicles", {
      isNetworkError: true,
    });
  }
}

export async function getMyVehicle(vehicleId: string) {
  try {
    const response = await http.get<VehicleResponse>(
      `/vehicles/me/vehicles/${vehicleId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError("Unable to load vehicle", {
      isNetworkError: true,
    });
  }
}

function appendFile(
  formData: FormData,
  fieldName: string,
  file: { uri: string; name: string; type?: string | null },
) {
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type || "image/jpeg",
  } as unknown as Blob);
}

export async function createVehicle(payload: VehicleCreateFormRequest) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const formData = new FormData();
  formData.append("make", payload.make.trim());
  formData.append("model", payload.model.trim());
  formData.append("year", String(payload.year));
  formData.append("color", payload.color.trim());
  formData.append("plate_number", payload.plate_number.trim());

  if (payload.vehicle_type) {
    formData.append("vehicle_type", payload.vehicle_type);
  }
  if (payload.total_seats !== undefined) {
    formData.append("total_seats", String(payload.total_seats));
  }
  if (payload.has_ac !== undefined) {
    formData.append("has_ac", String(payload.has_ac));
  }
  if (payload.is_primary !== undefined) {
    formData.append("is_primary", String(payload.is_primary));
  }
  if (payload.registration_doc) {
    appendFile(formData, "registration_doc", payload.registration_doc);
  }

  const response = await fetch(`${API_BASE_URL}/vehicles/me/vehicles`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
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

  return data as VehicleResponse;
}

export async function updateVehicle(
  vehicleId: string,
  payload: VehicleUpdateFormRequest,
) {
  const session = await loadSession();
  if (!session?.access_token) {
    throw new HttpError("Authentication required", { status: 401 });
  }

  const formData = new FormData();

  if (payload.make !== undefined) {
    formData.append("make", payload.make.trim());
  }
  if (payload.model !== undefined) {
    formData.append("model", payload.model.trim());
  }
  if (payload.year !== undefined) {
    formData.append("year", String(payload.year));
  }
  if (payload.color !== undefined) {
    formData.append("color", payload.color.trim());
  }
  if (payload.plate_number !== undefined) {
    formData.append("plate_number", payload.plate_number.trim());
  }
  if (payload.vehicle_type !== undefined) {
    formData.append("vehicle_type", payload.vehicle_type);
  }
  if (payload.total_seats !== undefined) {
    formData.append("total_seats", String(payload.total_seats));
  }
  if (payload.has_ac !== undefined) {
    formData.append("has_ac", String(payload.has_ac));
  }
  if (payload.is_primary !== undefined) {
    formData.append("is_primary", String(payload.is_primary));
  }
  if (payload.is_active !== undefined) {
    formData.append("is_active", String(payload.is_active));
  }
  if (payload.registration_doc) {
    appendFile(formData, "registration_doc", payload.registration_doc);
  }

  const response = await fetch(
    `${API_BASE_URL}/vehicles/me/vehicles/${vehicleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
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

  return data as VehicleResponse;
}
