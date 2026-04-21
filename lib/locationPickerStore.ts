export type LocationPickerResult = {
  type: "home" | "work";
  address: string;
  latitude: number;
  longitude: number;
};

let pending: LocationPickerResult | null = null;

export function setPendingLocationResult(result: LocationPickerResult) {
  pending = result;
}

export function consumePendingLocationResult(): LocationPickerResult | null {
  const result = pending;
  pending = null;
  return result;
}
