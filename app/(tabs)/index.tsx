import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
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

  const homeLocation = savedLocations.find(
    (location) => location.name.trim().toLowerCase() === "home",
  );
  const workLocation = savedLocations.find(
    (location) => location.name.trim().toLowerCase() === "work",
  );

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
      type: string;
      address: string;
      latitude: number;
      longitude: number;
    }) => {
      try {
        const profile = await getMyRiderProfile();
        const normalizedType = result.type.trim().toLowerCase();

        if (normalizedType !== "home" && normalizedType !== "work") {
          return;
        }

        await saveOrUpdateSavedLocation(profile, {
          name: normalizedType,
          address: result.address || undefined,
          latitude: result.latitude,
          longitude: result.longitude,
          is_default: true,
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
      if (!result) {
        return;
      }

      void createSavedLocation(result);
    }, [createSavedLocation]),
  );

  function openMapPicker(type: "home" | "work") {
    const existing = type === "home" ? homeLocation : workLocation;

    router.push({
      pathname: "/map-picker",
      params: {
        type,
        initialLat: existing ? String(existing.latitude) : "",
        initialLng: existing ? String(existing.longitude) : "",
        initialAddress: existing?.address || "",
      },
    });
  }

  function onAddLocation() {
    Alert.alert("Add Location", "Select which location you want to set.", [
      {
        text: "Home",
        onPress: () => openMapPicker("home"),
      },
      {
        text: "Work",
        onPress: () => openMapPicker("work"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <View className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-sky-200/40" />
      <View className="absolute -right-16 top-44 h-44 w-44 rounded-full bg-emerald-200/40" />

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs uppercase tracking-[2px] text-sky-600">
            Routee Dashboard
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
        Track nearby activity, manage ride requests, and get live updates in one
        place.
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
          ) : (
            <View className="mt-4 gap-3">
              <LocationCard
                title="Home Location"
                location={homeLocation || null}
                onPressEmpty={() => openMapPicker("home")}
                onPressSet={(location) => onLocationPress(location)}
              />
              <LocationCard
                title="Work Location"
                location={workLocation || null}
                onPressEmpty={() => openMapPicker("work")}
                onPressSet={(location) => onLocationPress(location)}
              />
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
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

type LocationCardProps = {
  title: string;
  location: SavedLocation | null;
  onPressEmpty: () => void;
  onPressSet: (location: SavedLocation) => void;
};

function LocationCard({
  title,
  location,
  onPressEmpty,
  onPressSet,
}: LocationCardProps) {
  return (
    <Pressable
      onPress={() => (location ? onPressSet(location) : onPressEmpty())}
      className="rounded-2xl border border-stone-200 bg-white p-4"
    >
      <Text className="text-sm font-semibold text-slate-900">{title}</Text>

      {location ? (
        <>
          <Text className="mt-1 text-xs text-slate-500" numberOfLines={2}>
            {location.address || "Address not available"}
          </Text>
          <Text className="mt-1 text-[11px] text-slate-400">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
          <Text className="mt-2 text-[11px] font-medium text-rose-500">
            Tap to delete
          </Text>
        </>
      ) : (
        <Text className="mt-2 text-xs font-medium text-sky-600">
          Not set. Tap to add.
        </Text>
      )}
    </Pressable>
  );
}
