import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
} from "react-native";
import { clearSession, getApiErrorMessage, loadSession } from "../lib/auth";
import {
    consumePendingLocationResult,
} from "../lib/locationPickerStore";
import {
    deleteSavedLocation,
    getMyRiderProfile,
    RiderPreferences,
    RiderProfile,
    saveOrUpdateSavedLocation,
    updateRiderPreferences,
} from "../lib/rider";

export default function RiderProfileScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingLocation, setSavingLocation] = useState<"home" | "work" | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<"home" | "work" | null>(null);

  const [profile, setProfile] = useState<RiderProfile | null>(null);

  const [preferences, setPreferences] = useState<RiderPreferences>({
    uni_student: false,
    corporate_employee: false,
    female_only: false,
    music_ok: false,
    quiet_ride: false,
  });

  const [homeAddress, setHomeAddress] = useState("");
  const [homeLat, setHomeLat] = useState("");
  const [homeLng, setHomeLng] = useState("");

  const [workAddress, setWorkAddress] = useState("");
  const [workLat, setWorkLat] = useState("");
  const [workLng, setWorkLng] = useState("");

  const stats = useMemo(() => {
    if (!profile) return null;
    return {
      rating: Number(profile.rating_avg || 0).toFixed(2),
      count: profile.rating_count || 0,
      rides: profile.total_rides_taken || 0,
    };
  }, [profile]);

  useEffect(() => {
    void initialize();
  }, []);

  // When navigating back from map-picker, consume the pending result and
  // populate the correct location fields without saving yet.
  useFocusEffect(
    useCallback(() => {
      const result = consumePendingLocationResult();
      if (!result) return;

      if (result.type === "home") {
        setHomeAddress(result.address);
        setHomeLat(String(result.latitude));
        setHomeLng(String(result.longitude));
      } else {
        setWorkAddress(result.address);
        setWorkLat(String(result.latitude));
        setWorkLng(String(result.longitude));
      }
    }, []),
  );

  async function initialize() {
    setLoading(true);
    try {
      const existingSession = await loadSession();
      if (!existingSession) {
        setIsLoggedIn(false);
        setProfile(null);
        return;
      }

      setIsLoggedIn(true);
      await fetchProfile();
    } catch (error) {
      Alert.alert("Session error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  }

  async function fetchProfile() {
    const riderProfile = await getMyRiderProfile();
    setProfile(riderProfile);
    setPreferences(riderProfile.preferences);

    const home = riderProfile.saved_locations.find(
      (l) => l.name.toLowerCase() === "home",
    );
    const work = riderProfile.saved_locations.find(
      (l) => l.name.toLowerCase() === "work",
    );

    setHomeAddress(home?.address || "");
    setHomeLat(home ? String(home.latitude) : "");
    setHomeLng(home ? String(home.longitude) : "");

    setWorkAddress(work?.address || "");
    setWorkLat(work ? String(work.latitude) : "");
    setWorkLng(work ? String(work.longitude) : "");
  }

  function setPreferenceFlag<K extends keyof RiderPreferences>(
    key: K,
    value: RiderPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function onSavePreferences() {
    setSavingPrefs(true);
    try {
      const updatedProfile = await updateRiderPreferences(preferences);
      setProfile(updatedProfile);
      Alert.alert("Saved", "Your rider preferences were updated.");
    } catch (error) {
      Alert.alert("Save failed", getApiErrorMessage(error));
    } finally {
      setSavingPrefs(false);
    }
  }

  async function onSaveLocation(kind: "home" | "work") {
    if (!profile) {
      Alert.alert("Not ready", "Profile is still loading.");
      return;
    }

    const isHome = kind === "home";
    const address = isHome ? homeAddress : workAddress;
    const latValue = isHome ? homeLat : workLat;
    const lngValue = isHome ? homeLng : workLng;

    const latitude = Number(latValue);
    const longitude = Number(lngValue);

    if (!latValue || !lngValue || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      Alert.alert(
        "No location",
        `Set your ${isHome ? "home" : "work"} location on the map first.`,
      );
      return;
    }

    setSavingLocation(kind);
    try {
      await saveOrUpdateSavedLocation(profile, {
        name: kind,
        address: address || undefined,
        latitude,
        longitude,
        is_default: true,
      });
      await fetchProfile();
      Alert.alert("Saved", `${isHome ? "Home" : "Work"} location updated.`);
    } catch (error) {
      Alert.alert("Save failed", getApiErrorMessage(error));
    } finally {
      setSavingLocation(null);
    }
  }

  async function onLogout() {
    await clearSession();
    setIsLoggedIn(false);
    setProfile(null);
    router.replace("/login");
  }

  async function onDeleteLocation(kind: "home" | "work") {
    if (!profile) {
      Alert.alert("Not ready", "Profile is still loading.");
      return;
    }

    const target = profile.saved_locations.find(
      (l) => l.name.trim().toLowerCase() === kind,
    );

    if (!target) {
      Alert.alert(
        "Nothing to delete",
        `No saved ${kind === "home" ? "Home" : "Work"} location found.`,
      );
      return;
    }

    setDeletingLocation(kind);
    try {
      await deleteSavedLocation(target.id);
      await fetchProfile();
      Alert.alert("Deleted", `${kind === "home" ? "Home" : "Work"} removed.`);
    } catch (error) {
      Alert.alert("Delete failed", getApiErrorMessage(error));
    } finally {
      setDeletingLocation(null);
    }
  }

  if (!sessionChecked || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#0284c7" />
        <Text className="mt-3 text-sm text-slate-500">Loading profile...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Profile</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Login to view and update your rider profile.
        </Text>

        <View className="mt-7 gap-4">
          <Pressable
            onPress={() => router.push("/login")}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
          >
            <Text className="text-center text-lg font-semibold text-slate-700">
              Login
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/signup")}
            className="rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4"
          >
            <Text className="text-center text-lg font-semibold text-white">
              Start Signup
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Profile</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Rider profile, preferences, and saved places.
      </Text>

      {stats ? (
        <View className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <Text className="text-sm font-semibold text-slate-700">Ride Stats</Text>
          <View className="mt-3 flex-row justify-between">
            <Stat label="Rating" value={stats.rating} />
            <Stat label="Ratings" value={String(stats.count)} />
            <Stat label="Rides" value={String(stats.rides)} />
          </View>
        </View>
      ) : null}

      <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <Text className="text-sm font-semibold text-slate-800">Preferences</Text>
        <View className="mt-4 gap-3">
          <PreferenceRow
            label="University Student"
            value={preferences.uni_student}
            onValueChange={(v) => setPreferenceFlag("uni_student", v)}
          />
          <PreferenceRow
            label="Corporate Employee"
            value={preferences.corporate_employee}
            onValueChange={(v) => setPreferenceFlag("corporate_employee", v)}
          />
          <PreferenceRow
            label="Female-only Matching"
            value={preferences.female_only}
            onValueChange={(v) => setPreferenceFlag("female_only", v)}
          />
          <PreferenceRow
            label="Music Allowed"
            value={preferences.music_ok}
            onValueChange={(v) => setPreferenceFlag("music_ok", v)}
          />
          <PreferenceRow
            label="Quiet Ride"
            value={preferences.quiet_ride}
            onValueChange={(v) => setPreferenceFlag("quiet_ride", v)}
          />
        </View>

        <Pressable
          onPress={onSavePreferences}
          disabled={savingPrefs}
          className="mt-4 items-center rounded-xl bg-sky-500 px-4 py-3"
        >
          {savingPrefs ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Save Preferences
            </Text>
          )}
        </Pressable>
      </View>

      <LocationCard
        title="Home Location"
        type="home"
        address={homeAddress}
        latitude={homeLat}
        longitude={homeLng}
        saveText="Save Home"
        onSave={() => void onSaveLocation("home")}
        saving={savingLocation === "home"}
        deleting={deletingLocation === "home"}
        onDelete={() => void onDeleteLocation("home")}
        deleteText="Delete Home"
      />

      <LocationCard
        title="Work Location"
        type="work"
        address={workAddress}
        latitude={workLat}
        longitude={workLng}
        saveText="Save Work"
        onSave={() => void onSaveLocation("work")}
        saving={savingLocation === "work"}
        deleting={deletingLocation === "work"}
        onDelete={() => void onDeleteLocation("work")}
        deleteText="Delete Work"
      />

      <Pressable
        onPress={() => void onLogout()}
        className="mt-8 items-center rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4"
      >
        <Text className="text-base font-semibold text-rose-600">Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type StatProps = { label: string; value: string };

function Stat({ label, value }: StatProps) {
  return (
    <View className="items-start">
      <Text className="text-xl font-black text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{label}</Text>
    </View>
  );
}

type PreferenceRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function PreferenceRow({ label, value, onValueChange }: PreferenceRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3">
      <Text className="mr-3 flex-1 text-sm font-medium text-slate-700">
        {label}
      </Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

type LocationCardProps = {
  title: string;
  type: "home" | "work";
  address: string;
  latitude: string;
  longitude: string;
  saveText: string;
  onSave: () => void;
  saving: boolean;
  deleting: boolean;
  onDelete: () => void;
  deleteText: string;
};

function LocationCard({
  title,
  type,
  address,
  latitude,
  longitude,
  saveText,
  onSave,
  saving,
  deleting,
  onDelete,
  deleteText,
}: LocationCardProps) {
  const hasLocation = latitude !== "" && longitude !== "";

  function openMapPicker() {
    router.push({
      pathname: "/map-picker",
      params: {
        type,
        initialLat: latitude || "",
        initialLng: longitude || "",
        initialAddress: address || "",
      },
    });
  }

  return (
    <View className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <Text className="text-sm font-semibold text-slate-800">{title}</Text>

      {/* Current location preview */}
      <View className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
        {hasLocation ? (
          <>
            <Text className="text-sm leading-5 text-slate-700" numberOfLines={2}>
              {address || "Address not available"}
            </Text>
            <Text className="mt-1 text-xs text-slate-400">
              {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-slate-400">No location set yet</Text>
        )}
      </View>

      {/* Open map button */}
      <Pressable
        onPress={openMapPicker}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3"
      >
        <Ionicons name="map-outline" size={18} color="#0284c7" />
        <Text className="text-sm font-semibold text-sky-600">
          {hasLocation ? "Change on Map" : "Set on Map"}
        </Text>
      </Pressable>

      {/* Save and delete — only shown once a location is picked */}
      {hasLocation ? (
        <>
          <Pressable
            onPress={onSave}
            disabled={saving || deleting}
            className="mt-3 items-center rounded-xl border border-slate-900 bg-slate-900 px-4 py-3"
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {saveText}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={saving || deleting}
            className="mt-3 items-center rounded-xl border border-rose-300 bg-rose-50 px-4 py-3"
          >
            {deleting ? (
              <ActivityIndicator color="#e11d48" />
            ) : (
              <Text className="text-base font-semibold text-rose-600">
                {deleteText}
              </Text>
            )}
          </Pressable>
        </>
      ) : null}
    </View>
  );
}
