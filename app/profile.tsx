import { router } from "expo-router";
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
import { clearSession, getApiErrorMessage, loadSession } from "../lib/auth";
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
  const [savingLocation, setSavingLocation] = useState<"home" | "work" | null>(
    null,
  );
  const [deletingLocation, setDeletingLocation] = useState<
    "home" | "work" | null
  >(null);

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
      (location) => location.name.toLowerCase() === "home",
    );
    const work = riderProfile.saved_locations.find(
      (location) => location.name.toLowerCase() === "work",
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
    const address = isHome ? homeAddress.trim() : workAddress.trim();
    const latValue = isHome ? homeLat.trim() : workLat.trim();
    const lngValue = isHome ? homeLng.trim() : workLng.trim();

    const latitude = Number(latValue);
    const longitude = Number(lngValue);

    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      Alert.alert(
        "Invalid latitude",
        `${isHome ? "Home" : "Work"} latitude must be between -90 and 90.`,
      );
      return;
    }

    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      Alert.alert(
        "Invalid longitude",
        `${isHome ? "Home" : "Work"} longitude must be between -180 and 180.`,
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
      (location) => location.name.trim().toLowerCase() === kind,
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
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#22d3ee" />
        <Text className="mt-3 text-sm text-slate-300">Loading profile...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-white">Profile</Text>
        <Text className="mt-2 text-sm text-slate-300">
          Login to view and update your rider profile.
        </Text>

        <View className="mt-7 gap-4">
          <Pressable
            onPress={() => router.push("/login")}
            className="rounded-2xl border border-slate-600 bg-slate-900 px-5 py-4"
          >
            <Text className="text-center text-lg font-semibold text-slate-100">
              Login
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/signup")}
            className="rounded-2xl border border-white bg-white px-5 py-4"
          >
            <Text className="text-center text-lg font-semibold text-slate-950">
              Start Signup
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-white">Profile</Text>
      <Text className="mt-2 text-sm text-slate-300">
        Rider profile, preferences, and saved places.
      </Text>

      {stats ? (
        <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <Text className="text-sm font-semibold text-slate-200">
            Ride Stats
          </Text>
          <View className="mt-3 flex-row justify-between">
            <Stat label="Rating" value={stats.rating} />
            <Stat label="Ratings" value={String(stats.count)} />
            <Stat label="Rides" value={String(stats.rides)} />
          </View>
        </View>
      ) : null}

      <View className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-semibold text-slate-100">
          Preferences
        </Text>
        <View className="mt-4 gap-3">
          <PreferenceRow
            label="University Student"
            value={preferences.uni_student}
            onValueChange={(value) => setPreferenceFlag("uni_student", value)}
          />
          <PreferenceRow
            label="Corporate Employee"
            value={preferences.corporate_employee}
            onValueChange={(value) =>
              setPreferenceFlag("corporate_employee", value)
            }
          />
          <PreferenceRow
            label="Female-only Matching"
            value={preferences.female_only}
            onValueChange={(value) => setPreferenceFlag("female_only", value)}
          />
          <PreferenceRow
            label="Music Allowed"
            value={preferences.music_ok}
            onValueChange={(value) => setPreferenceFlag("music_ok", value)}
          />
          <PreferenceRow
            label="Quiet Ride"
            value={preferences.quiet_ride}
            onValueChange={(value) => setPreferenceFlag("quiet_ride", value)}
          />
        </View>

        <Pressable
          onPress={onSavePreferences}
          disabled={savingPrefs}
          className="mt-4 items-center rounded-xl bg-cyan-400 px-4 py-3"
        >
          {savingPrefs ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text className="text-base font-semibold text-slate-950">
              Save Preferences
            </Text>
          )}
        </Pressable>
      </View>

      <LocationEditor
        title="Home Location"
        address={homeAddress}
        latitude={homeLat}
        longitude={homeLng}
        onAddressChange={setHomeAddress}
        onLatitudeChange={setHomeLat}
        onLongitudeChange={setHomeLng}
        saveText="Save Home"
        onSave={() => void onSaveLocation("home")}
        loading={savingLocation === "home"}
        deleting={deletingLocation === "home"}
        onDelete={() => void onDeleteLocation("home")}
        deleteText="Delete Home"
      />

      <LocationEditor
        title="Work Location"
        address={workAddress}
        latitude={workLat}
        longitude={workLng}
        onAddressChange={setWorkAddress}
        onLatitudeChange={setWorkLat}
        onLongitudeChange={setWorkLng}
        saveText="Save Work"
        onSave={() => void onSaveLocation("work")}
        loading={savingLocation === "work"}
        deleting={deletingLocation === "work"}
        onDelete={() => void onDeleteLocation("work")}
        deleteText="Delete Work"
      />

      <Pressable
        onPress={() => void onLogout()}
        className="mt-8 items-center rounded-2xl border border-rose-400/50 bg-rose-900/20 px-5 py-4"
      >
        <Text className="text-base font-semibold text-rose-200">Logout</Text>
      </Pressable>
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
      <Text className="text-xl font-black text-white">{value}</Text>
      <Text className="mt-1 text-xs text-slate-400">{label}</Text>
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
    <View className="flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
      <Text className="mr-3 flex-1 text-sm font-medium text-slate-200">
        {label}
      </Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

type LocationEditorProps = {
  title: string;
  address: string;
  latitude: string;
  longitude: string;
  onAddressChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  saveText: string;
  onSave: () => void;
  loading: boolean;
  deleting: boolean;
  onDelete: () => void;
  deleteText: string;
};

function LocationEditor({
  title,
  address,
  latitude,
  longitude,
  onAddressChange,
  onLatitudeChange,
  onLongitudeChange,
  saveText,
  onSave,
  loading,
  deleting,
  onDelete,
  deleteText,
}: LocationEditorProps) {
  return (
    <View className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <Text className="text-sm font-semibold text-slate-100">{title}</Text>

      <View className="mt-4 gap-3">
        <Field
          label="Address"
          value={address}
          onChangeText={onAddressChange}
          placeholder="Optional"
        />
        <Field
          label="Latitude"
          value={latitude}
          onChangeText={onLatitudeChange}
          keyboardType="default"
          placeholder="e.g. 24.8607"
        />
        <Field
          label="Longitude"
          value={longitude}
          onChangeText={onLongitudeChange}
          keyboardType="default"
          placeholder="e.g. 67.0011"
        />
      </View>

      <Pressable
        onPress={onSave}
        disabled={loading || deleting}
        className="mt-4 items-center rounded-xl border border-white bg-white px-4 py-3"
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text className="text-base font-semibold text-slate-950">
            {saveText}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={onDelete}
        disabled={loading || deleting}
        className="mt-3 items-center rounded-xl border border-rose-400/50 bg-rose-900/20 px-4 py-3"
      >
        {deleting ? (
          <ActivityIndicator color="#fecaca" />
        ) : (
          <Text className="text-base font-semibold text-rose-200">
            {deleteText}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  placeholder?: string;
};

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
}: FieldProps) {
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-slate-200">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
