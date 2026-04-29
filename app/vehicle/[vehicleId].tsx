import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
} from "../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../lib/driver";
import {
    deleteVehicle,
    getMyVehicle,
    VehicleResponse,
} from "../../lib/vehicle";

function formatVehicleTitle(vehicle: VehicleResponse) {
  return `${vehicle.make} ${vehicle.model}`.trim();
}

function formatVehicleMeta(vehicle: VehicleResponse) {
  const parts = [
    String(vehicle.year),
    vehicle.color,
    `${vehicle.total_seats} seats`,
    vehicle.has_ac ? "AC" : null,
  ].filter(Boolean);

  return parts.join(" • ");
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </Text>
      <Text className="mt-2 text-base font-semibold text-slate-900">
        {value || "Not available"}
      </Text>
    </View>
  );
}

export default function VehicleDetailScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = Array.isArray(params.vehicleId)
    ? params.vehicleId[0]
    : params.vehicleId;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);

  const hydrateVehicle = useCallback(async () => {
    if (!vehicleId) {
      Alert.alert("Vehicle missing", "No vehicle was selected.");
      router.back();
      return;
    }

    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole !== "driver") {
        setVerificationStatus(null);
        setVehicle(null);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);

      if (driverProfile.verification_status !== "verified") {
        setVehicle(null);
        return;
      }

      const data = await getMyVehicle(vehicleId);
      setVehicle(data);
    } catch (error) {
      Alert.alert("Vehicle error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete vehicle",
      "Are you sure you want to delete this vehicle? This action cannot be undone.",
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            if (!vehicle) return;

            setDeleting(true);
            try {
              await deleteVehicle(vehicle.id);
              Alert.alert(
                "Vehicle deleted",
                "Your vehicle has been successfully removed.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/");
                    },
                  },
                ],
              );
            } catch (error) {
              Alert.alert("Delete error", getApiErrorMessage(error));
            } finally {
              setDeleting(false);
            }
          },
          style: "destructive",
        },
      ],
    );
  }, [vehicle]);

  useFocusEffect(
    useCallback(() => {
      void hydrateVehicle();
    }, [hydrateVehicle]),
  );

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Vehicle</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Review the details for this registered vehicle.
      </Text>

      {!isDriver ? (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">Driver only</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Vehicle details are available after signing in with a driver
            account.
          </Text>
        </View>
      ) : !isVerifiedDriver ? (
        <View className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Please verify your account
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">
            Your driver account is not verified yet. Complete verification to
            view vehicle details.
          </Text>

          <TouchableOpacity
            className="mt-5 rounded-2xl bg-slate-900 px-5 py-4"
            onPress={() => router.push("/driver-verification")}
          >
            <Text className="text-center text-base font-semibold text-white">
              Go to verification
            </Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View className="mt-7 flex-row items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <ActivityIndicator color="#0D0D0D" />
          <Text className="text-sm text-slate-500">Loading vehicle...</Text>
        </View>
      ) : vehicle ? (
        <View className="mt-7 gap-4">
          <View className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-2xl font-black text-slate-900">
                  {formatVehicleTitle(vehicle)}
                </Text>
                <Text className="mt-2 text-sm text-slate-500">
                  {formatVehicleMeta(vehicle)}
                </Text>
              </View>
              <View className="rounded-2xl bg-white px-3 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Plate
                </Text>
                <Text className="mt-1 text-sm font-bold text-slate-900">
                  {vehicle.plate_number}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="mt-4 rounded-2xl bg-slate-900 px-5 py-4"
              onPress={() =>
                router.push({
                  pathname: "/vehicle/edit/[vehicleId]",
                  params: { vehicleId: vehicle.id },
                })
              }
              disabled={deleting}
            >
              <Text className="text-center text-base font-semibold text-white">
                Edit vehicle
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-3 rounded-2xl border border-red-300 bg-red-50 px-5 py-4"
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <View className="flex-row items-center justify-center gap-2">
                  <ActivityIndicator color="#DC2626" size="small" />
                  <Text className="text-center text-base font-semibold text-red-600">
                    Deleting...
                  </Text>
                </View>
              ) : (
                <Text className="text-center text-base font-semibold text-red-600">
                  Delete vehicle
                </Text>
              )}
            </TouchableOpacity>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {vehicle.is_primary ? (
                <View className="rounded-full bg-slate-900 px-3 py-1.5">
                  <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Primary Vehicle
                  </Text>
                </View>
              ) : null}
              <View className="rounded-full bg-white px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  {vehicle.vehicle_type}
                </Text>
              </View>
              <View className="rounded-full bg-white px-3 py-1.5">
                <Text className="text-xs font-semibold text-slate-600">
                  {vehicle.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <FieldRow label="Vehicle ID" value={vehicle.id} />
            <FieldRow label="Driver ID" value={vehicle.driver_id} />
            <FieldRow label="Make" value={vehicle.make} />
            <FieldRow label="Model" value={vehicle.model} />
            <FieldRow label="Year" value={String(vehicle.year)} />
            <FieldRow label="Color" value={vehicle.color} />
            <FieldRow label="Seats" value={String(vehicle.total_seats)} />
            <FieldRow label="AC" value={vehicle.has_ac ? "Yes" : "No"} />
          </View>
        </View>
      ) : (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Vehicle not found
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            This vehicle may have been removed or you may not have access to it.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
