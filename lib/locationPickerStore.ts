export type LocationPickerResult = {
  type: string;
  name?: string;
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
