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
import { getMyRide, RideResponse } from "../../lib/ride";

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </Text>
      <Text className="mt-2 text-base font-semibold text-slate-900">
        {value}
      </Text>
    </View>
  );
}

export default function RideDetailScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const rideId = Array.isArray(params.rideId)
    ? params.rideId[0]
    : params.rideId;

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [ride, setRide] = useState<RideResponse | null>(null);

  const hydrateRide = useCallback(async () => {
    if (!rideId) {
      Alert.alert("Ride missing", "No ride was selected.");
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
        setRide(null);
        return;
      }

      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);

      if (driverProfile.verification_status !== "verified") {
        setRide(null);
        return;
      }

      const data = await getMyRide(rideId);
      setRide(data);
    } catch (error) {
      Alert.alert("Ride error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useFocusEffect(
    useCallback(() => {
      void hydrateRide();
    }, [hydrateRide]),
  );

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Ride</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Review the details of your posted ride.
      </Text>

      {!isDriver ? (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">Driver only</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Ride details are available after signing in with a driver account.
          </Text>
        </View>
      ) : !isVerifiedDriver ? (
        <View className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Please verify your account
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">
            Your driver account is not verified yet. Complete verification to
            view ride details.
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
          <Text className="text-sm text-slate-500">Loading ride...</Text>
        </View>
      ) : ride ? (
        <View className="mt-7 gap-4">
          <View className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <Text className="text-2xl font-black text-slate-900">
              {ride.origin_address} → {ride.dest_address}
            </Text>
            <Text className="mt-2 text-sm text-slate-500">
              Departure: {formatDateTime(ride.departure_time)}
            </Text>
          </View>

          <View className="gap-3">
            <FieldRow label="Ride ID" value={ride.id} />
            <FieldRow label="Driver ID" value={ride.driver_id} />
            <FieldRow
              label="Vehicle ID"
              value={ride.vehicle_id || "Not assigned"}
            />
            <FieldRow label="Origin" value={ride.origin_address} />
            <FieldRow label="Destination" value={ride.dest_address} />
            <FieldRow
              label="Origin Coordinates"
              value={`${ride.origin_lat}, ${ride.origin_lng}`}
            />
            <FieldRow
              label="Destination Coordinates"
              value={`${ride.dest_lat}, ${ride.dest_lng}`}
            />
            <FieldRow
              label="Price Per Seat"
              value={`PKR ${ride.price_per_seat}`}
            />
            <FieldRow
              label="Seats"
              value={`${ride.available_seats}/${ride.total_seats} available`}
            />
            <FieldRow
              label="Pickup Radius"
              value={`${ride.pickup_radius_m} m`}
            />
            <FieldRow label="Gender Preference" value={ride.gender_pref} />
            <FieldRow label="Status" value={ride.status} />
            <FieldRow
              label="Recurring"
              value={ride.is_recurring ? "Yes" : "No"}
            />
            <FieldRow
              label="Estimated Arrival"
              value={formatDateTime(ride.estimated_arrival)}
            />
            <FieldRow
              label="Created At"
              value={formatDateTime(ride.created_at)}
            />
            <FieldRow
              label="Updated At"
              value={formatDateTime(ride.updated_at)}
            />
          </View>
        </View>
      ) : (
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">
            Ride not found
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            This ride may have been removed or you may not have access to it.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
