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

export async function getMyVehicles() {
  try {
    const response = await http.get<VehicleResponse[]>("/me/vehicles");
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
