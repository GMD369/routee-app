const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text?: string;
}

export async function getPlacePredictions(
  input: string,
): Promise<PlacePrediction[]> {
  if (!MAPS_KEY || !input.trim()) return [];

  try {
    // Restrict to country 'pk' if you want country-scoped results. Use
    // 'components=country:pk'. Leaving components off returns global matches.
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input,
    )}&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      predictions: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text?: string;
        };
      }>;
    };

    if (json.status === "OK" && json.predictions.length > 0) {
      return json.predictions.map((p) => ({
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting.main_text,
        secondary_text: p.structured_formatting.secondary_text,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
}

export async function getPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  if (!MAPS_KEY) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,geometry&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      result?: {
        formatted_address: string;
        geometry: {
          location: {
            lat: number;
            lng: number;
          };
        };
      };
    };

    if (json.status === "OK" && json.result) {
      return {
        address: json.result.formatted_address,
        latitude: json.result.geometry.location.lat,
        longitude: json.result.geometry.location.lng,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  if (!MAPS_KEY) return "";

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${MAPS_KEY}`;
    const res = await fetch(url);
    const json = (await res.json()) as {
      status: string;
      results: Array<{ formatted_address: string }>;
    };

    if (json.status === "OK" && json.results.length > 0) {
      return json.results[0].formatted_address;
    }
    return "";
  } catch {
    return "";
  }
}
