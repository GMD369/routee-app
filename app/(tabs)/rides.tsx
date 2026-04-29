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
import { listMyRides, RideResponse } from "../../lib/ride";

function formatDeparture(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function rideStatusBadge(status: string) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "completed") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-stone-100 text-stone-700";
}

export default function RidesTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [rides, setRides] = useState<RideResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const hydrateScreen = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole !== "driver") {
        setVerificationStatus(null);
        setRides([]);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);

      if (driverProfile.verification_status !== "verified") {
        setRides([]);
        return;
      }

      const data = await listMyRides();
      setRides(data);
    } catch (error) {
      Alert.alert("Load error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrateScreen();
    }, [hydrateScreen]),
  );

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Rides</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Share your commute with riders and earn money.
      </Text>

      {!isDriver ? (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">Driver only</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Ride posting is available after signing in with a driver account.
          </Text>
        </View>
      ) : !isVerifiedDriver ? (
        <View className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Please verify your account
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">
            Your driver account is not verified yet. Complete verification to
            post rides.
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
          <Text className="text-sm text-slate-500">Loading...</Text>
        </View>
      ) : (
        <View className="mt-7 gap-4">
          <View className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
            <Text className="text-2xl font-black text-slate-900">
              Ready to post a ride?
            </Text>
            <Text className="mt-3 text-sm leading-6 text-slate-600">
              Share your commute route with other riders. Set your price,
              vehicle details, and schedule preferences.
            </Text>

            <TouchableOpacity
              className="mt-6 rounded-2xl bg-slate-900 px-5 py-4"
              onPress={() => router.push("/ride/new")}
            >
              <Text className="text-center text-base font-semibold text-white">
                + Post New Ride
              </Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              My Posted Rides
            </Text>

            {rides.length === 0 ? (
              <View className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <Text className="text-lg font-bold text-slate-900">
                  No rides yet
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Your posted rides will appear here. Tap Post New Ride to
                  create your first one.
                </Text>
              </View>
            ) : (
              rides.map((ride) => (
                <TouchableOpacity
                  key={ride.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-5"
                  onPress={() =>
                    router.push({
                      pathname: "/ride/[rideId]",
                      params: { rideId: ride.id },
                    })
                  }
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-slate-900">
                        {ride.origin_address} → {ride.dest_address}
                      </Text>
                      <Text className="mt-2 text-sm text-slate-500">
                        Departure: {formatDeparture(ride.departure_time)}
                      </Text>
                      <Text className="mt-1 text-sm text-slate-500">
                        Seats: {ride.available_seats}/{ride.total_seats}{" "}
                        available
                      </Text>
                      <Text className="mt-1 text-sm text-slate-500">
                        Price: PKR {ride.price_per_seat}
                      </Text>
                    </View>

                    <View
                      className={`rounded-full px-3 py-1.5 ${rideStatusBadge(ride.status)}`}
                    >
                      <Text className="text-xs font-semibold uppercase tracking-[0.14em]">
                        {ride.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <Text className="text-sm font-semibold text-blue-900">💡 Tips</Text>
            <Text className="mt-2 text-sm leading-6 text-blue-800">
              • Set competitive prices to attract more riders{"\n"}• Include
              additional notes about your vehicle or route{"\n"}• Mark recurring
              rides for regular commutes
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
