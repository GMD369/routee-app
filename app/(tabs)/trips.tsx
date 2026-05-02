import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
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
    UserRole,
} from "../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../lib/driver";
import { getMyVehicles, VehicleResponse } from "../../lib/vehicle";

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

export default function TripsTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole !== "driver") {
        setVerificationStatus(null);
        setVehicles([]);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);

      if (driverProfile.verification_status !== "verified") {
        setVehicles([]);
        return;
      }

      const data = await getMyVehicles();
      setVehicles(data);
    } catch (error) {
      Alert.alert("Vehicles error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrateVehicles();
    }, [hydrateVehicles]),
  );

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">
        Driver Dashboard
      </Text>
      <Text className="mt-2 text-sm text-slate-500">
        Post rides and manage your vehicles.
      </Text>

      {!isDriver ? (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">Driver only</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Ride posting and vehicle management are available after signing in
            with a driver account.
          </Text>
        </View>
      ) : loading ? (
        <View className="mt-7 flex-row items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <ActivityIndicator color="#0D0D0D" />
          <Text className="text-sm text-slate-500">Loading vehicles...</Text>
        </View>
      ) : !isVerifiedDriver ? (
        <View className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Please verify your account
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">
            Your driver account is not verified yet. Complete verification to
            post rides and manage vehicles.
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
      ) : (
        <View className="mt-7 gap-6">
          {/* Vehicles Section */}
          <View className="gap-4">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Registered fleet
                </Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}
                </Text>
              </View>

              <TouchableOpacity
                className="rounded-2xl bg-slate-900 px-4 py-3"
                onPress={() => router.push("/vehicle/new")}
              >
                <Text className="text-sm font-semibold text-white">
                  + Add vehicle
                </Text>
              </TouchableOpacity>
            </View>

            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-5"
                  onPress={() =>
                    router.push({
                      pathname: "/vehicle/[vehicleId]",
                      params: { vehicleId: vehicle.id },
                    })
                  }
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg font-bold text-slate-900">
                          {formatVehicleTitle(vehicle)}
                        </Text>
                        {vehicle.is_primary ? (
                          <View className="rounded-full bg-slate-900 px-2 py-1">
                            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                              Primary
                            </Text>
                          </View>
                        ) : null}
                        {!vehicle.is_active ? (
                          <View className="rounded-full bg-rose-100 px-2 py-1">
                            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">
                              Inactive
                            </Text>
                          </View>
                        ) : null}
                      </View>
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

                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-white px-3 py-1.5">
                      <Text className="text-xs font-semibold text-slate-600">
                        {vehicle.vehicle_type}
                      </Text>
                    </View>
                    <View className="rounded-full bg-white px-3 py-1.5">
                      <Text className="text-xs font-semibold text-slate-600">
                        Driver ID{" "}
                        {vehicle.driver_id
                          ? vehicle.driver_id.slice(0, 8)
                          : "—"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <Text className="text-lg font-bold text-slate-900">
                  No vehicles yet
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Add your first vehicle so riders can see it on your driver
                  profile.
                </Text>

                <TouchableOpacity
                  className="mt-5 rounded-2xl bg-slate-900 px-5 py-4"
                  onPress={() => router.push("/vehicle/new")}
                >
                  <Text className="text-center text-base font-semibold text-white">
                    Add vehicle
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
