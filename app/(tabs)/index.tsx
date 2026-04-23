import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import { consumePendingLocationResult } from "../../lib/locationPickerStore";
import {
    deleteSavedLocation,
    getMyRiderProfile,
    SavedLocation,
    saveOrUpdateSavedLocation,
} from "../../lib/rider";

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  const refreshSavedLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const profile = await getMyRiderProfile();
      setSavedLocations(profile.saved_locations || []);
    } catch (error) {
      Alert.alert("Locations error", getApiErrorMessage(error));
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole === "rider") {
        await refreshSavedLocations();
      }
    } catch (error) {
      Alert.alert("Home error", getApiErrorMessage(error));
    }
  }, [refreshSavedLocations]);

  const createSavedLocation = useCallback(
    async (result: {
      name?: string;
      address: string;
      latitude: number;
      longitude: number;
    }) => {
      try {
        const profile = await getMyRiderProfile();
        const fallbackName = `Location ${profile.saved_locations.length + 1}`;

        await saveOrUpdateSavedLocation(profile, {
          name: result.name?.trim() || fallbackName,
          address: result.address || undefined,
          latitude: result.latitude,
          longitude: result.longitude,
          is_default: false,
        });

        await refreshSavedLocations();
      } catch (error) {
        Alert.alert("Add location failed", getApiErrorMessage(error));
      }
    },
    [refreshSavedLocations],
  );

  useEffect(() => {
    void hydrateHome();
  }, [hydrateHome]);

  useFocusEffect(
    useCallback(() => {
      const result = consumePendingLocationResult();
      if (!result || result.type !== "saved") {
        return;
      }

      void createSavedLocation(result);
    }, [createSavedLocation]),
  );

  function onAddLocation() {
    setNewLocationName("");
    setShowAddLocationModal(true);
  }

  function onConfirmAddLocation(useCustomName: boolean) {
    const trimmedName = newLocationName.trim();

    setShowAddLocationModal(false);
    router.push({
      pathname: "/map-picker",
      params: {
        type: "saved",
        locationName: useCustomName && trimmedName ? trimmedName : "",
      },
    });
  }

  function onLocationPress(location: SavedLocation) {
    Alert.alert(location.name, location.address || "No address", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void onDeleteLocation(location.id),
      },
    ]);
  }

  async function onDeleteLocation(locationId: string) {
    try {
      await deleteSavedLocation(locationId);
      await refreshSavedLocations();
    } catch (error) {
      Alert.alert("Delete failed", getApiErrorMessage(error));
    }
  }

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

  return (
    <>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <View className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-sky-200/40" />
        <View className="absolute -right-16 top-44 h-44 w-44 rounded-full bg-emerald-200/40" />

        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs uppercase tracking-[2px] text-sky-600">
              Musafee Dashboard
            </Text>
            <Text className="mt-2 text-4xl font-black leading-tight text-slate-900">
              Move Smarter,
              {"\n"}
              Every Ride
            </Text>
          </View>

          <Pressable
            onPress={() => router.push(profileRoute)}
            className="mt-1 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2"
          >
            <Ionicons name="person-circle-outline" size={26} color="#0284c7" />
          </Pressable>
        </View>

        <Text className="mt-3 text-base leading-6 text-slate-500">
          Track nearby activity, manage ride requests, and get live updates in
          one place.
        </Text>

        <View className="mt-8 rounded-3xl border border-stone-200 bg-stone-50 p-5">
          <Text className="text-sm font-semibold text-slate-700">
            Quick Snapshot
          </Text>
          <View className="mt-4 flex-row justify-between">
            <Stat label="Nearby Drivers" value="24" />
            <Stat label="Avg Wait" value="4 min" />
            <Stat label="Today Trips" value="18" />
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <Text className="text-sm font-semibold text-sky-700">Live Note</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-600">
            Premium lane routing is active. Driver matching quality is currently
            high in your area.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push(profileRoute)}
          className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 px-5 py-4"
        >
          <Text className="text-sm font-semibold text-sky-600">
            {isDriver ? "Driver Profile" : "Rider Profile"}
          </Text>
          <Text className="mt-1 text-base font-medium text-slate-900">
            {isDriver
              ? "View verification status and driver account details."
              : "View and update your rider profile, preferences, and saved places."}
          </Text>
        </Pressable>

        {!isDriver ? (
          <View className="mt-5 rounded-3xl border border-stone-200 bg-stone-50 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-800">
                Saved Locations
              </Text>
              <Pressable
                onPress={onAddLocation}
                className="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2"
              >
                <Text className="text-xs font-semibold text-sky-700">
                  Add Location
                </Text>
              </Pressable>
            </View>

            {loadingLocations ? (
              <View className="mt-4 flex-row items-center gap-2">
                <ActivityIndicator color="#0284c7" />
                <Text className="text-sm text-slate-500">
                  Loading locations...
                </Text>
              </View>
            ) : savedLocations.length > 0 ? (
              <View className="mt-4 gap-3">
                {savedLocations.map((location) => (
                  <Pressable
                    key={location.id}
                    onPress={() => onLocationPress(location)}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <Text className="text-sm font-semibold text-slate-900">
                      {location.name}
                    </Text>
                    <Text
                      className="mt-1 text-xs text-slate-500"
                      numberOfLines={2}
                    >
                      {location.address || "Address not available"}
                    </Text>
                    <Text className="mt-1 text-[11px] text-slate-400">
                      {location.latitude.toFixed(5)},{" "}
                      {location.longitude.toFixed(5)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text className="mt-4 text-sm text-slate-500">
                No saved locations yet. Tap Add Location to create one.
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={showAddLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddLocationModal(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="text-lg font-bold text-slate-900">
              Add Location
            </Text>
            <Text className="mt-2 text-sm text-slate-500">
              Enter a name or skip to use automatic naming.
            </Text>

            <TextInput
              value={newLocationName}
              onChangeText={setNewLocationName}
              placeholder="e.g. Gym, Grandma House"
              placeholderTextColor="#94a3b8"
              className="mt-4 rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-slate-900"
            />

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setShowAddLocationModal(false)}
                className="flex-1 items-center rounded-xl border border-stone-300 bg-stone-100 px-4 py-3"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onConfirmAddLocation(false)}
                className="flex-1 items-center rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Skip Name
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onConfirmAddLocation(true)}
                className="flex-1 items-center rounded-xl border border-slate-900 bg-slate-900 px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white">
                  Continue
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <View className="items-start">
      <Text className="text-xl font-black text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{label}</Text>
    </View>
  );
}
