const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

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
