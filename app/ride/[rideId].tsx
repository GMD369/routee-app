import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
    listRecommendedRiders,
    RiderRecommendation,
} from "../../lib/recommendations";
import { cancelRide, getMyRide, RideResponse } from "../../lib/ride";

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
  const [cancelling, setCancelling] = useState(false);
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [ride, setRide] = useState<RideResponse | null>(null);
  const [recommendedRiders, setRecommendedRiders] = useState<
    RiderRecommendation[]
  >([]);
  const [loadingRecommendedRiders, setLoadingRecommendedRiders] =
    useState(false);

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

  useEffect(() => {
    let cancelled = false;

    async function hydrateRecommendedRiders() {
      if (role !== "driver" || verificationStatus !== "verified" || !ride) {
        setRecommendedRiders([]);
        return;
      }

      setLoadingRecommendedRiders(true);
      try {
        const riders = await listRecommendedRiders(ride.id, 8);
        if (!cancelled) {
          setRecommendedRiders(riders);
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendedRiders([]);
          Alert.alert("Recommendations error", getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendedRiders(false);
        }
      }
    }

    void hydrateRecommendedRiders();

    return () => {
      cancelled = true;
    };
  }, [role, ride, verificationStatus]);

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";
  const canCancel = !!ride && !["completed", "cancelled"].includes(ride.status);

  const handleCancelRide = useCallback(() => {
    if (!ride || !canCancel) {
      return;
    }

    Alert.alert("Cancel ride", "Are you sure you want to cancel this ride?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const updated = await cancelRide(ride.id);
            setRide(updated);
            Alert.alert("Ride cancelled", "Your ride is now cancelled.");
          } catch (error) {
            Alert.alert("Cancel error", getApiErrorMessage(error));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }, [ride, canCancel]);

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

            {canCancel ? (
              <TouchableOpacity
                className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-5 py-4"
                onPress={handleCancelRide}
                disabled={cancelling}
              >
                {cancelling ? (
                  <View className="flex-row items-center justify-center gap-2">
                    <ActivityIndicator color="#DC2626" size="small" />
                    <Text className="text-center text-base font-semibold text-red-600">
                      Cancelling...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-center text-base font-semibold text-red-600">
                    Cancel Ride
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <View className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                <Text className="text-sm text-slate-500">
                  This ride cannot be cancelled in status: {ride.status}
                </Text>
              </View>
            )}
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

          <View className="mt-4 rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recommended riders
                </Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  Best matches for this ride
                </Text>
              </View>
              <View className="rounded-full bg-white px-3 py-1.5">
                <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Top 8
                </Text>
              </View>
            </View>

            {loadingRecommendedRiders ? (
              <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
                <ActivityIndicator color="#0D0D0D" />
                <Text className="text-sm text-slate-500">
                  Loading rider matches...
                </Text>
              </View>
            ) : recommendedRiders.length > 0 ? (
              <View className="mt-4 gap-3">
                {recommendedRiders.map((rider) => {
                  const initials = rider.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0] ?? "")
                    .join("")
                    .toUpperCase();
                  const matchScore = Math.round(rider.match_score * 100);
                  const matchBreakdown = rider.match_breakdown ?? {};

                  return (
                    <View
                      key={rider.request_id ?? rider.rider_id}
                      className="rounded-2xl border border-stone-200 bg-white p-4"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-row flex-1 items-center gap-3">
                          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
                            <Text className="text-sm font-bold text-white">
                              {initials || "R"}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-bold text-slate-900">
                              {rider.full_name || "Rider"}
                            </Text>
                            <Text className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              {rider.match_type}
                            </Text>
                          </View>
                        </View>

                        <View className="rounded-full bg-slate-900 px-3 py-1.5">
                          <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {matchScore}%
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 gap-2 rounded-2xl bg-stone-50 p-3">
                        <Text className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Route hints
                        </Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {rider.virtual_pickup_location ??
                            "Pickup not available"}
                        </Text>
                        <Text className="text-sm text-slate-500">to</Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {rider.virtual_dropoff_location ??
                            "Dropoff not available"}
                        </Text>
                      </View>

                      <View className="mt-4 flex-row flex-wrap gap-2">
                        {rider.seats_requested != null ? (
                          <View className="rounded-full bg-stone-100 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-slate-600">
                              {rider.seats_requested} seat
                              {rider.seats_requested === 1 ? "" : "s"} requested
                            </Text>
                          </View>
                        ) : null}
                        {rider.rating_avg != null ? (
                          <View className="rounded-full bg-stone-100 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-slate-600">
                              ⭐ {rider.rating_avg.toFixed(1)}
                              {rider.rating_count
                                ? ` (${rider.rating_count})`
                                : ""}
                            </Text>
                          </View>
                        ) : null}
                        {rider.total_rides_taken != null ? (
                          <View className="rounded-full bg-stone-100 px-3 py-1.5">
                            <Text className="text-xs font-semibold text-slate-600">
                              {rider.total_rides_taken} past rides
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {rider.message ? (
                        <Text className="mt-4 text-sm leading-6 text-slate-600">
                          “{rider.message}”
                        </Text>
                      ) : null}

                      {Object.keys(matchBreakdown).length > 0 ? (
                        <View className="mt-4 flex-row flex-wrap gap-2">
                          {Object.entries(matchBreakdown).map(
                            ([key, value]) => (
                              <View
                                key={key}
                                className="rounded-full border border-stone-200 bg-white px-3 py-1.5"
                              >
                                <Text className="text-xs font-semibold text-slate-600">
                                  {key}: {value.toFixed(2)}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                <Text className="text-sm font-semibold text-slate-900">
                  No rider matches yet
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Once riders save locations or create requests for this ride,
                  they will appear here.
                </Text>
              </View>
            )}
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
