import { getApiErrorMessage, getPrimaryRole, loadSession } from "@/lib/auth";
import { getMyDriverProfile, VerificationStatus } from "@/lib/driver";
import {
    getPlaceDetails,
    getPlacePredictions,
    PlacePrediction,
} from "@/lib/geocoding";
import { consumePendingLocationResult } from "@/lib/locationPickerStore";
import { createRide, RideCreateRequest } from "@/lib/ride";
import { getMyVehicles, VehicleResponse } from "@/lib/vehicle";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Path } from "react-native-svg";

interface RideFormState {
  originAddress: string;
  originLat: number | null;
  originLng: number | null;
  destAddress: string;
  destLat: number | null;
  destLng: number | null;
  departureTime: Date;
  totalSeats: number;
  pricePerSeat: number;
  priceNegotiable: boolean;
  genderPref: "male" | "female" | "any";
  vehicleId: string | null;
  pickupRadiusM: number;
  isRecurring: boolean;
  recurrenceDays: number[];
  recurrenceEndDate: Date | null;
  notes: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MapIcon() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#64748B"
      strokeWidth={2}
    >
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <Path d="M12 13a2 2 0 100-4 2 2 0 000 4z" />
    </Svg>
  );
}

export default function CreateRideScreen() {
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Autocomplete states
  const [originPredictions, setOriginPredictions] = useState<PlacePrediction[]>(
    [],
  );
  const [destPredictions, setDestPredictions] = useState<PlacePrediction[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [originLoadingPredictions, setOriginLoadingPredictions] =
    useState(false);
  const [destLoadingPredictions, setDestLoadingPredictions] = useState(false);

  // DateTime Picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasTime, setHasTime] = useState(false);

  const [form, setForm] = useState<RideFormState>({
    originAddress: "",
    originLat: null,
    originLng: null,
    destAddress: "",
    destLat: null,
    destLng: null,
    departureTime: new Date(Date.now() + 3600000), // 1 hour from now
    totalSeats: 4,
    pricePerSeat: 0,
    priceNegotiable: false,
    genderPref: "any",
    vehicleId: null,
    pickupRadiusM: 500,
    isRecurring: false,
    recurrenceDays: [],
    recurrenceEndDate: null,
    notes: "",
  });

  // Handle origin address input and fetch predictions
  const handleOriginAddressChange = useCallback(async (text: string) => {
    setForm((prev) => ({ ...prev, originAddress: text }));

    if (text.trim().length < 2) {
      setOriginPredictions([]);
      setShowOriginSuggestions(false);
      return;
    }

    setOriginLoadingPredictions(true);
    try {
      const predictions = await getPlacePredictions(text);
      setOriginPredictions(predictions);
      setShowOriginSuggestions(true);
    } catch {
      setOriginPredictions([]);
    } finally {
      setOriginLoadingPredictions(false);
    }
  }, []);

  // Handle destination address input and fetch predictions
  const handleDestAddressChange = useCallback(async (text: string) => {
    setForm((prev) => ({ ...prev, destAddress: text }));

    if (text.trim().length < 2) {
      setDestPredictions([]);
      setShowDestSuggestions(false);
      return;
    }

    setDestLoadingPredictions(true);
    try {
      const predictions = await getPlacePredictions(text);
      setDestPredictions(predictions);
      setShowDestSuggestions(true);
    } catch {
      setDestPredictions([]);
    } finally {
      setDestLoadingPredictions(false);
    }
  }, []);

  // Handle origin prediction selection
  const handleOriginPredictionSelect = useCallback(
    async (prediction: PlacePrediction) => {
      const details = await getPlaceDetails(prediction.place_id);
      if (details) {
        setForm((prev) => ({
          ...prev,
          originAddress: details.address,
          originLat: details.latitude,
          originLng: details.longitude,
        }));
        setShowOriginSuggestions(false);
        setOriginPredictions([]);
      }
    },
    [],
  );

  // Handle destination prediction selection
  const handleDestPredictionSelect = useCallback(
    async (prediction: PlacePrediction) => {
      const details = await getPlaceDetails(prediction.place_id);
      if (details) {
        setForm((prev) => ({
          ...prev,
          destAddress: details.address,
          destLat: details.latitude,
          destLng: details.longitude,
        }));
        setShowDestSuggestions(false);
        setDestPredictions([]);
      }
    },
    [],
  );

  const hydrateScreen = useCallback(async () => {
    setLoading(true);
    try {
      // hydrate: nothing special here. We consume pending map results in focus effect below.

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

      const myVehicles = await getMyVehicles();
      setVehicles(myVehicles);

      // Auto-select primary vehicle if available
      const primaryVehicle = myVehicles.find((v) => v.is_primary);
      if (primaryVehicle) {
        setForm((prev) => ({ ...prev, vehicleId: primaryVehicle.id }));
      }
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

  const handleSubmit = async () => {
    // Validation
    if (!form.originAddress.trim()) {
      Alert.alert("Missing field", "Please enter pickup location");
      return;
    }
    if (form.originLat === null || form.originLng === null) {
      Alert.alert("Missing field", "Please select pickup coordinates");
      return;
    }
    if (!form.destAddress.trim()) {
      Alert.alert("Missing field", "Please enter destination");
      return;
    }
    if (form.destLat === null || form.destLng === null) {
      Alert.alert("Missing field", "Please select destination coordinates");
      return;
    }
    if (form.totalSeats < 1 || form.totalSeats > 11) {
      Alert.alert("Invalid field", "Total seats must be between 1 and 11");
      return;
    }
    if (form.pricePerSeat < 0) {
      Alert.alert("Invalid field", "Price per seat must be non-negative");
      return;
    }
    if (form.isRecurring && form.recurrenceDays.length === 0) {
      Alert.alert(
        "Missing field",
        "Select at least one day for recurring ride",
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: RideCreateRequest = {
        origin_address: form.originAddress.trim(),
        origin_lat: form.originLat,
        origin_lng: form.originLng,
        dest_address: form.destAddress.trim(),
        dest_lat: form.destLat,
        dest_lng: form.destLng,
        departure_time: form.departureTime.toISOString(),
        total_seats: form.totalSeats,
        price_per_seat: form.pricePerSeat,
        price_negotiable: form.priceNegotiable,
        gender_pref: form.genderPref,
        vehicle_id: form.vehicleId || undefined,
        pickup_radius_m: form.pickupRadiusM,
        is_recurring: form.isRecurring,
        recurrence_days: form.isRecurring ? form.recurrenceDays : [],
        recurrence_end_date: form.recurrenceEndDate
          ? form.recurrenceEndDate.toISOString().split("T")[0]
          : undefined,
        notes: form.notes.trim() || undefined,
      };

      const ride = await createRide(payload);
      Alert.alert("Ride posted", "Your ride has been created successfully.", [
        {
          text: "OK",
          onPress: () => {
            router.replace("/");
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Create error", getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setForm((prev) => {
        const newDate = new Date(prev.departureTime);
        newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return { ...prev, departureTime: newDate };
      });
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setHasTime(true);
      setForm((prev) => {
        const newDate = new Date(prev.departureTime);
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0);
        return { ...prev, departureTime: newDate };
      });
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => {
      const days = prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter((d) => d !== day)
        : [...prev.recurrenceDays, day].sort();
      return { ...prev, recurrenceDays: days };
    });
  };

  const handleOpenOriginMap = () => {
    void router.push({
      pathname: "/map-picker",
      params: { type: "origin", locationName: "Pickup" },
    });
  };

  const handleOpenDestinationMap = () => {
    void router.push({
      pathname: "/map-picker",
      params: { type: "destination", locationName: "Destination" },
    });
  };

  // Consume location result after navigation returns
  useFocusEffect(
    useCallback(() => {
      const pendingLocation = consumePendingLocationResult();
      if (pendingLocation) {
        setForm((prev) => {
          if (pendingLocation.type === "origin") {
            return {
              ...prev,
              originAddress: pendingLocation.address,
              originLat: pendingLocation.latitude,
              originLng: pendingLocation.longitude,
            };
          } else if (pendingLocation.type === "destination") {
            return {
              ...prev,
              destAddress: pendingLocation.address,
              destLat: pendingLocation.latitude,
              destLng: pendingLocation.longitude,
            };
          }
          return prev;
        });
      }
    }, []),
  );

  if (!isDriver) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Post Ride</Text>
        <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-lg font-bold text-slate-900">Driver only</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Ride posting is available after signing in with a driver account.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (!isVerifiedDriver) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Post Ride</Text>
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
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Post Ride</Text>
        <View className="mt-7 flex-row items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-5">
          <ActivityIndicator color="#0D0D0D" />
          <Text className="text-sm text-slate-500">Loading...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Post Ride</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Share your commute with other riders.
      </Text>

      {/* Location Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">Location</Text>

        <View className="mt-4 gap-6">
          {/* Origin Location */}
          <View>
            <Text className="text-sm font-semibold text-slate-700">
              From (Pickup)
            </Text>

            <View className="mt-2 flex-row items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-3">
              <TextInput
                placeholder="Enter pickup address"
                placeholderTextColor="#A1A1A1"
                value={form.originAddress}
                onChangeText={handleOriginAddressChange}
                onFocus={() =>
                  originPredictions.length > 0 && setShowOriginSuggestions(true)
                }
                className="flex-1 text-base text-slate-900"
              />
              <TouchableOpacity onPress={handleOpenOriginMap} className="p-2">
                <MapIcon />
              </TouchableOpacity>
            </View>

            {/* Origin Suggestions Dropdown */}
            {showOriginSuggestions && originPredictions.length > 0 && (
              <View className="mt-2 max-h-48 rounded-lg border border-stone-200 bg-white">
                <FlatList
                  data={originPredictions}
                  keyExtractor={(item) => item.place_id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="border-b border-stone-100 px-4 py-3"
                      onPress={() => handleOriginPredictionSelect(item)}
                    >
                      <Text className="text-sm font-medium text-slate-900">
                        {item.main_text}
                      </Text>
                      {item.secondary_text && (
                        <Text className="mt-1 text-xs text-slate-500">
                          {item.secondary_text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {originLoadingPredictions && (
              <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-stone-50 px-4 py-3">
                <ActivityIndicator size="small" color="#64748B" />
                <Text className="text-sm text-slate-500">
                  Loading suggestions...
                </Text>
              </View>
            )}

            {form.originLat !== null && form.originLng !== null ? (
              <Text className="mt-2 text-xs text-slate-500">
                📍 {form.originLat.toFixed(4)}, {form.originLng.toFixed(4)}
              </Text>
            ) : null}
          </View>

          {/* Destination Location */}
          <View>
            <Text className="text-sm font-semibold text-slate-700">
              To (Destination)
            </Text>

            <View className="mt-2 flex-row items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-3">
              <TextInput
                placeholder="Enter destination address"
                placeholderTextColor="#A1A1A1"
                value={form.destAddress}
                onChangeText={handleDestAddressChange}
                onFocus={() =>
                  destPredictions.length > 0 && setShowDestSuggestions(true)
                }
                className="flex-1 text-base text-slate-900"
              />
              <TouchableOpacity
                onPress={handleOpenDestinationMap}
                className="p-2"
              >
                <MapIcon />
              </TouchableOpacity>
            </View>

            {/* Destination Suggestions Dropdown */}
            {showDestSuggestions && destPredictions.length > 0 && (
              <View className="mt-2 max-h-48 rounded-lg border border-stone-200 bg-white">
                <FlatList
                  data={destPredictions}
                  keyExtractor={(item) => item.place_id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="border-b border-stone-100 px-4 py-3"
                      onPress={() => handleDestPredictionSelect(item)}
                    >
                      <Text className="text-sm font-medium text-slate-900">
                        {item.main_text}
                      </Text>
                      {item.secondary_text && (
                        <Text className="mt-1 text-xs text-slate-500">
                          {item.secondary_text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {destLoadingPredictions && (
              <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-stone-50 px-4 py-3">
                <ActivityIndicator size="small" color="#64748B" />
                <Text className="text-sm text-slate-500">
                  Loading suggestions...
                </Text>
              </View>
            )}

            {form.destLat !== null && form.destLng !== null ? (
              <Text className="mt-2 text-xs text-slate-500">
                📍 {form.destLat.toFixed(4)}, {form.destLng.toFixed(4)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Schedule Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">Schedule</Text>

        <View className="mt-4 gap-4">
          <View>
            <Text className="text-sm font-semibold text-slate-700">Date</Text>
            <TouchableOpacity
              className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-3"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="text-base text-slate-900">
                {form.departureTime.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="text-sm font-semibold text-slate-700">
              Time (Optional)
            </Text>
            <View className="mt-2 flex-row items-center gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3"
                onPress={() => setShowTimePicker(true)}
              >
                <Text className={`text-base ${hasTime ? "text-slate-900" : "text-slate-400"}`}>
                  {hasTime
                    ? form.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : "Select a time"}
                </Text>
              </TouchableOpacity>
              {hasTime && (
                <TouchableOpacity
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                  onPress={() => setHasTime(false)}
                >
                  <Text className="text-sm font-semibold text-red-600">Clear Time</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={form.departureTime}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={form.departureTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}
        </View>
      </View>

      {/* Capacity Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">Capacity</Text>

        <View className="mt-4">
          <Text className="text-sm font-semibold text-slate-700">
            Total Seats
          </Text>
          <View className="mt-2 flex-row items-center gap-3">
            <TouchableOpacity
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2"
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  totalSeats: Math.max(1, prev.totalSeats - 1),
                }))
              }
            >
              <Text className="text-lg font-bold text-slate-900">−</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold text-slate-900">
              {form.totalSeats}
            </Text>
            <TouchableOpacity
              className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2"
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  totalSeats: Math.min(11, prev.totalSeats + 1),
                }))
              }
            >
              <Text className="text-lg font-bold text-slate-900">+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Pricing Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">Pricing</Text>

        <View className="mt-4 gap-3">
          <View>
            <Text className="text-sm font-semibold text-slate-700">
              Price per Seat (PKR)
            </Text>
            <TextInput
              placeholder="0"
              placeholderTextColor="#A1A1A1"
              value={String(form.pricePerSeat)}
              onChangeText={(text) =>
                setForm((prev) => ({
                  ...prev,
                  pricePerSeat: parseFloat(text) || 0,
                }))
              }
              keyboardType="decimal-pad"
              className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-slate-900"
            />
          </View>

          <TouchableOpacity
            className="mt-2 flex-row items-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3"
            onPress={() =>
              setForm((prev) => ({
                ...prev,
                priceNegotiable: !prev.priceNegotiable,
              }))
            }
          >
            <View
              className={`h-5 w-5 rounded-md border-2 ${
                form.priceNegotiable
                  ? "border-slate-900 bg-slate-900"
                  : "border-slate-300 bg-white"
              }`}
            />
            <Text className="text-base font-medium text-slate-900">
              Price negotiable
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">
          Preferences
        </Text>

        <View className="mt-4">
          <Text className="text-sm font-semibold text-slate-700">
            Gender Preference
          </Text>
          <View className="mt-2 flex-row gap-2">
            {["any", "male", "female"].map((pref) => (
              <TouchableOpacity
                key={pref}
                className={`flex-1 rounded-lg border px-3 py-2 ${
                  form.genderPref === pref
                    ? "border-slate-900 bg-slate-900"
                    : "border-stone-300 bg-stone-50"
                }`}
                onPress={() =>
                  setForm((prev) => ({
                    ...prev,
                    genderPref: pref as "male" | "female" | "any",
                  }))
                }
              >
                <Text
                  className={`text-center text-sm font-semibold capitalize ${
                    form.genderPref === pref ? "text-white" : "text-slate-700"
                  }`}
                >
                  {pref}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mt-4">
          <Text className="text-sm font-semibold text-slate-700">
            Pickup Radius (meters)
          </Text>
          <TextInput
            placeholder="500"
            placeholderTextColor="#A1A1A1"
            value={String(form.pickupRadiusM)}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                pickupRadiusM: parseInt(text, 10) || 500,
              }))
            }
            keyboardType="number-pad"
            className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-slate-900"
          />
        </View>
      </View>

      {/* Vehicle Selection */}
      {vehicles.length > 0 && (
        <View className="mt-8">
          <Text className="text-lg font-semibold text-slate-900">Vehicle</Text>
          <View className="mt-4 gap-2">
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                className={`rounded-lg border px-4 py-3 ${
                  form.vehicleId === vehicle.id
                    ? "border-slate-900 bg-slate-900"
                    : "border-stone-300 bg-stone-50"
                }`}
                onPress={() =>
                  setForm((prev) => ({ ...prev, vehicleId: vehicle.id }))
                }
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text
                      className={`text-base font-semibold ${
                        form.vehicleId === vehicle.id
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {vehicle.make} {vehicle.model}
                    </Text>
                    <Text
                      className={`mt-1 text-sm ${
                        form.vehicleId === vehicle.id
                          ? "text-slate-100"
                          : "text-slate-600"
                      }`}
                    >
                      {vehicle.plate_number}
                    </Text>
                  </View>
                  {vehicle.is_primary && (
                    <View className="rounded-full bg-yellow-100 px-2 py-1">
                      <Text className="text-xs font-semibold text-yellow-700">
                        Primary
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recurring Section */}
      <View className="mt-8">
        <TouchableOpacity
          className="flex-row items-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3"
          onPress={() =>
            setForm((prev) => ({
              ...prev,
              isRecurring: !prev.isRecurring,
              recurrenceDays: !prev.isRecurring ? [] : prev.recurrenceDays,
            }))
          }
        >
          <View
            className={`h-5 w-5 rounded-md border-2 ${
              form.isRecurring
                ? "border-slate-900 bg-slate-900"
                : "border-slate-300 bg-white"
            }`}
          />
          <Text className="text-base font-medium text-slate-900">
            Recurring commute
          </Text>
        </TouchableOpacity>

        {form.isRecurring && (
          <View className="mt-4 gap-3">
            <Text className="text-sm font-semibold text-slate-700">
              Days of Week
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  className={`flex-1 rounded-lg border px-2 py-2 ${
                    form.recurrenceDays.includes(idx)
                      ? "border-slate-900 bg-slate-900"
                      : "border-stone-300 bg-stone-50"
                  }`}
                  onPress={() => toggleDay(idx)}
                >
                  <Text
                    className={`text-center text-sm font-semibold ${
                      form.recurrenceDays.includes(idx)
                        ? "text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View>
              <Text className="text-sm font-semibold text-slate-700">
                End Date (optional)
              </Text>
              <Text className="mt-2 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-base text-slate-900">
                {form.recurrenceEndDate
                  ? form.recurrenceEndDate.toLocaleDateString()
                  : "No end date"}
              </Text>
              <TouchableOpacity
                className="mt-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2"
                onPress={() => {
                  Alert.alert(
                    "Date picker",
                    "Date picker not yet implemented.",
                  );
                }}
              >
                <Text className="text-center text-sm font-semibold text-slate-700">
                  Set end date
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Notes Section */}
      <View className="mt-8">
        <Text className="text-lg font-semibold text-slate-900">
          Additional Notes
        </Text>
        <TextInput
          placeholder="Add any notes for riders (optional)"
          placeholderTextColor="#A1A1A1"
          value={form.notes}
          onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
          multiline
          numberOfLines={4}
          className="mt-4 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base text-slate-900"
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        className="mt-8 rounded-2xl bg-slate-900 px-5 py-4"
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <View className="flex-row items-center justify-center gap-2">
            <ActivityIndicator color="white" size="small" />
            <Text className="text-center text-base font-semibold text-white">
              Posting...
            </Text>
          </View>
        ) : (
          <Text className="text-center text-base font-semibold text-white">
            Post Ride
          </Text>
        )}
      </TouchableOpacity>

      <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Text className="text-sm text-amber-900">
          💡 Tap "Pick on map" to select pickup and destination locations using
          the interactive map.
        </Text>
      </View>
    </ScrollView>
  );
}
