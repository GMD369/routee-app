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
import {
    clearSession,
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
} from "../lib/auth";
import {
    DriverPreferences,
    DriverProfile,
    getMyDriverProfile,
    updateMyDriverProfile,
} from "../lib/driver";

export default function DriverProfileScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [bio, setBio] = useState("");
  const [preferences, setPreferences] = useState<DriverPreferences>({
    music: false,
    smoking: false,
    pets: false,
    ac: true,
    talking: true,
  });

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    try {
      const existingSession = await loadSession();
      if (!existingSession) {
        setIsLoggedIn(false);
        setIsDriver(false);
        setProfile(null);
        return;
      }

      setIsLoggedIn(true);
      const role = getPrimaryRole(existingSession);
      const hasDriverRole = role === "driver";
      setIsDriver(hasDriverRole);

      if (hasDriverRole) {
        const driverProfile = await getMyDriverProfile();
        setProfile(driverProfile);
        setBio(driverProfile.bio || "");
        setPreferences(
          driverProfile.preferences || {
            music: false,
            smoking: false,
            pets: false,
            ac: true,
            talking: true,
          },
        );
      }
    } catch (error) {
      Alert.alert("Profile error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    if (!profile) return null;
    return {
      rating: profile.rating_avg.toFixed(2),
      count: String(profile.rating_count),
      rides: String(profile.total_rides_given),
      status: prettyStatus(profile.verification_status),
    };
  }, [profile]);

  const isVerified = profile?.verification_status === "verified";

  async function onLogout() {
    try {
      await clearSession();
      setIsLoggedIn(false);
      setProfile(null);
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  }

  function setPreferenceFlag<K extends keyof DriverPreferences>(
    key: K,
    value: DriverPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function onSaveDriverProfile() {
    const trimmedBio = bio.trim();

    if (trimmedBio.length > 500) {
      Alert.alert("Invalid bio", "Bio must be 500 characters or less.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyDriverProfile({
        preferences,
        bio: trimmedBio || undefined,
      });

      setProfile((current) => ({
        ...updated,
        profiles: updated.profiles || current?.profiles,
      }));
      setBio(updated.bio || "");
      setPreferences(updated.preferences || preferences);
      Alert.alert("Saved", "Driver profile updated successfully.");
    } catch (error) {
      Alert.alert("Update failed", getApiErrorMessage(error));
    } finally {
      setSaving(false);
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
        <Text className="text-3xl font-black text-slate-900">Driver Profile</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Login to view your driver profile.
        </Text>

        <Pressable
          onPress={() => router.push("/login")}
          className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-700">
            Login
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!isDriver) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Driver Profile</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">
          This screen is available for driver accounts only.
        </Text>

        <Pressable
          onPress={() => router.replace("/profile")}
          className="mt-7 rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-sky-600">
            Open Rider Profile
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-slate-900">Driver Profile</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Profile details, verification status, and driving stats.
      </Text>

      <View className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <Text className="text-sm font-semibold text-slate-700">Identity</Text>
        <InfoRow
          label="Full Name"
          value={profile?.profiles?.full_name || "-"}
        />
        <InfoRow label="Email" value={profile?.profiles?.email || "-"} />
        <InfoRow label="Phone" value={profile?.profiles?.phone || "-"} />
        <InfoRow label="CNIC" value={profile?.cnic_number || "Not submitted"} />
        <InfoRow
          label="License"
          value={profile?.license_number || "Not submitted"}
        />
      </View>

      <View className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Text className="text-sm font-semibold text-sky-700">
          Verification
        </Text>
        <Text className="mt-2 text-2xl font-black text-slate-900">
          {summary?.status || "Unknown"}
        </Text>
      </View>

      {!isVerified ? (
        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-semibold text-amber-700">
            Verification Required
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            Please verify your account to continue as an active driver.
          </Text>
          <Pressable
            onPress={() => router.push("/driver-verification")}
            className="mt-3 items-center rounded-xl bg-amber-500 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              Please Verify
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Text className="text-sm font-semibold text-emerald-700">
            Verification Complete
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            Your account is verified. No further action is needed.
          </Text>
        </View>
      )}

      <View className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <Text className="text-sm font-semibold text-slate-700">
          Driver Stats
        </Text>
        <View className="mt-3 flex-row justify-between">
          <Stat label="Rating" value={summary?.rating || "0.00"} />
          <Stat label="Ratings" value={summary?.count || "0"} />
          <Stat label="Rides" value={summary?.rides || "0"} />
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <Text className="text-sm font-semibold text-slate-700">
          Driver Preferences
        </Text>

        <View className="mt-3 gap-3">
          <PreferenceRow
            label="Music"
            value={preferences.music}
            onValueChange={(value) => setPreferenceFlag("music", value)}
          />
          <PreferenceRow
            label="Smoking"
            value={preferences.smoking}
            onValueChange={(value) => setPreferenceFlag("smoking", value)}
          />
          <PreferenceRow
            label="Pets"
            value={preferences.pets}
            onValueChange={(value) => setPreferenceFlag("pets", value)}
          />
          <PreferenceRow
            label="AC"
            value={preferences.ac}
            onValueChange={(value) => setPreferenceFlag("ac", value)}
          />
          <PreferenceRow
            label="Talking"
            value={preferences.talking}
            onValueChange={(value) => setPreferenceFlag("talking", value)}
          />
        </View>

        <Text className="mb-2 mt-4 text-sm font-medium text-slate-700">
          Bio
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          textAlignVertical="top"
          placeholder="Tell riders about your driving style"
          placeholderTextColor="#94a3b8"
          className="min-h-28 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-slate-900"
        />
        <Text className="mt-2 text-right text-xs text-slate-500">
          {bio.length}/500
        </Text>

        <Pressable
          onPress={() => void onSaveDriverProfile()}
          disabled={saving}
          className="mt-4 items-center rounded-xl bg-sky-500 px-4 py-3"
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Save Driver Profile
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => void onLogout()}
        className="mt-8 items-center rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4"
      >
        <Text className="text-base font-semibold text-rose-600">Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function prettyStatus(value?: string) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View className="mt-3 flex-row items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-3">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm font-semibold text-slate-800">
        {value}
      </Text>
    </View>
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
