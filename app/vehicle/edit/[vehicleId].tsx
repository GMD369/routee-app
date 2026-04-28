import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
} from "../../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../../lib/driver";
import {
    getMyVehicle,
    updateVehicle,
    VehicleResponse,
    VehicleUpdateFormRequest,
} from "../../../lib/vehicle";

const VEHICLE_TYPES = ["car", "suv", "van", "motorcycle", "pickup"] as const;

type VehicleType = (typeof VEHICLE_TYPES)[number];

type VehicleFormState = {
  make: string;
  model: string;
  year: string;
  color: string;
  plateNumber: string;
  vehicleType: VehicleType;
  totalSeats: string;
  hasAc: boolean;
  isPrimary: boolean;
  isActive: boolean;
};

function formatVehicleTitle(vehicle: VehicleResponse) {
  return `${vehicle.make} ${vehicle.model}`.trim();
}

function initialFormState(vehicle: VehicleResponse): VehicleFormState {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    color: vehicle.color,
    plateNumber: vehicle.plate_number,
    vehicleType: (VEHICLE_TYPES.includes(vehicle.vehicle_type as VehicleType)
      ? vehicle.vehicle_type
      : "car") as VehicleType,
    totalSeats: String(vehicle.total_seats),
    hasAc: vehicle.has_ac,
    isPrimary: vehicle.is_primary,
    isActive: vehicle.is_active,
  };
}

export default function EditVehicleScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = Array.isArray(params.vehicleId)
    ? params.vehicleId[0]
    : params.vehicleId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [form, setForm] = useState<VehicleFormState | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<{
    uri: string;
    name: string;
    type?: string | null;
  } | null>(null);

  useEffect(() => {
    void initialize();
  }, [vehicleId]);

  async function initialize() {
    if (!vehicleId) {
      Alert.alert("Vehicle missing", "No vehicle was selected.");
      router.back();
      return;
    }

    setLoading(true);
    try {
      const session = await loadSession();
      const role = getPrimaryRole(session);
      if (!session || role !== "driver") {
        setIsAllowed(false);
        setVerificationStatus(null);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);

      if (driverProfile.verification_status !== "verified") {
        setIsAllowed(false);
        return;
      }

      const existing = await getMyVehicle(vehicleId);
      setVehicle(existing);
      setForm(initialFormState(existing));
      setIsAllowed(true);
    } catch (error) {
      Alert.alert("Screen error", getApiErrorMessage(error));
      setIsAllowed(false);
    } finally {
      setLoading(false);
    }
  }

  async function pickRegistrationDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert("Selection failed", "Could not read the selected file.");
        return;
      }

      setRegistrationDoc({
        uri: asset.uri,
        name: asset.name || "vehicle-registration.jpg",
        type: asset.mimeType,
      });
    } catch (error) {
      Alert.alert("Picker error", getApiErrorMessage(error));
    }
  }

  const previewLabel = useMemo(() => {
    if (!form) return "Vehicle preview";
    return (
      [form.make.trim(), form.model.trim()].filter(Boolean).join(" ") ||
      "Vehicle preview"
    );
  }, [form]);

  function updateField<K extends keyof VehicleFormState>(
    key: K,
    value: VehicleFormState[K],
  ) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onSubmit() {
    if (!form || !vehicleId) {
      return;
    }

    const make = form.make.trim();
    const model = form.model.trim();
    const color = form.color.trim();
    const plateNumber = form.plateNumber.trim();
    const year = Number(form.year);
    const totalSeats = Number(form.totalSeats);

    if (!make || !model || !color || !plateNumber) {
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }

    if (!Number.isInteger(year) || year < 1990 || year > 2030) {
      Alert.alert(
        "Invalid year",
        "Vehicle year must be between 1990 and 2030.",
      );
      return;
    }

    if (!Number.isInteger(totalSeats) || totalSeats < 2 || totalSeats > 12) {
      Alert.alert("Invalid seats", "Total seats must be between 2 and 12.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: VehicleUpdateFormRequest = {
        make,
        model,
        year,
        color,
        plate_number: plateNumber,
        vehicle_type: form.vehicleType,
        total_seats: totalSeats,
        has_ac: form.hasAc,
        is_primary: form.isPrimary,
        is_active: form.isActive,
        registration_doc: registrationDoc,
      };

      const updated = await updateVehicle(vehicleId, payload);
      Alert.alert(
        "Vehicle updated",
        `${formatVehicleTitle(updated)} was saved successfully.`,
        [
          {
            text: "View vehicle",
            onPress: () =>
              router.replace({
                pathname: "/vehicle/[vehicleId]",
                params: { vehicleId: updated.id },
              }),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Update failed", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !form) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-500">
          Loading vehicle form...
        </Text>
      </View>
    );
  }

  if (!isAllowed) {
    return (
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="px-6 pb-16 pt-12"
      >
        <Text className="text-3xl font-black text-slate-900">Edit Vehicle</Text>
        <Text className="mt-2 text-sm text-slate-500">
          This page is available for verified driver accounts only.
        </Text>

        <Pressable
          onPress={() => router.replace("/driver-verification")}
          className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-900">
            Please verify your account
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-600">
            Open verification to continue.
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-6 pb-16 pt-12"
    >
      <Text className="text-3xl font-black text-slate-900">Edit Vehicle</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Update the details for{" "}
        {vehicle ? formatVehicleTitle(vehicle) : "this vehicle"}.
      </Text>

      <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">Preview</Text>
        <Text className="mt-2 text-lg font-black text-slate-900">
          {previewLabel}
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          {form.year} • {form.color || "Color"} • {form.vehicleType}
        </Text>
      </View>

      <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">
          Vehicle Info
        </Text>

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Make *
        </Text>
        <TextInput
          value={form.make}
          onChangeText={(value) => updateField("make", value)}
          placeholder="Toyota"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Model *
        </Text>
        <TextInput
          value={form.model}
          onChangeText={(value) => updateField("model", value)}
          placeholder="Corolla"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Year *
        </Text>
        <TextInput
          value={form.year}
          onChangeText={(value) => updateField("year", value)}
          keyboardType="number-pad"
          placeholder="2024"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Color *
        </Text>
        <TextInput
          value={form.color}
          onChangeText={(value) => updateField("color", value)}
          placeholder="White"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Plate Number *
        </Text>
        <TextInput
          value={form.plateNumber}
          onChangeText={(value) => updateField("plateNumber", value)}
          placeholder="ABC-123"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Vehicle Type
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {VEHICLE_TYPES.map((type) => {
            const active = form.vehicleType === type;
            return (
              <Pressable
                key={type}
                onPress={() => updateField("vehicleType", type)}
                className={
                  active
                    ? "rounded-full bg-slate-900 px-4 py-2"
                    : "rounded-full border border-slate-200 bg-slate-50 px-4 py-2"
                }
              >
                <Text
                  className={
                    active
                      ? "text-sm font-semibold text-white"
                      : "text-sm font-semibold text-slate-700"
                  }
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 mt-4 text-sm font-semibold text-slate-900">
          Total Seats
        </Text>
        <TextInput
          value={form.totalSeats}
          onChangeText={(value) => updateField("totalSeats", value)}
          keyboardType="number-pad"
          placeholder="4"
          placeholderTextColor="#94a3b8"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />

        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-slate-900">
              Air Conditioning
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              Mark if the vehicle has AC.
            </Text>
          </View>
          <Switch
            value={form.hasAc}
            onValueChange={(value) => updateField("hasAc", value)}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-slate-900">
              Primary Vehicle
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              Make this your main active vehicle.
            </Text>
          </View>
          <Switch
            value={form.isPrimary}
            onValueChange={(value) => updateField("isPrimary", value)}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold text-slate-900">Active</Text>
            <Text className="mt-1 text-xs text-slate-500">
              Disable a vehicle without deleting it.
            </Text>
          </View>
          <Switch
            value={form.isActive}
            onValueChange={(value) => updateField("isActive", value)}
          />
        </View>
      </View>

      <View className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">
          Registration Image
        </Text>
        <Text className="mt-1 text-sm text-slate-500">
          Optional replacement. JPEG, PNG, or WebP up to 5 MB.
        </Text>

        <Pressable
          onPress={() => void pickRegistrationDocument()}
          className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <Text className="text-sm font-semibold text-sky-600">
            {registrationDoc
              ? registrationDoc.name
              : "Select replacement document"}
          </Text>
        </Pressable>
      </View>

      <View className="mt-6 flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4"
        >
          <Text className="text-center text-base font-semibold text-slate-700">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void onSubmit()}
          disabled={submitting}
          className="flex-1 rounded-2xl bg-slate-900 px-5 py-4"
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-center text-base font-semibold text-white">
              Save Changes
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
