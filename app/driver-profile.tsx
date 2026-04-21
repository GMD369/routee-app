import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import {
    clearSession,
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
} from "../lib/auth";
import { DriverProfile, getMyDriverProfile } from "../lib/driver";

export default function DriverProfileScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfile | null>(null);

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
        <Text className="text-3xl font-black text-white">Driver Profile</Text>
        <Text className="mt-2 text-sm text-slate-300">
          Login to view your driver profile.
        </Text>

        <Pressable
          onPress={() => router.push("/login")}
          className="mt-7 rounded-2xl border border-slate-600 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-100">
            Login
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!isDriver) {
    return (
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-white">Driver Profile</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-300">
          This screen is available for driver accounts only.
        </Text>

        <Pressable
          onPress={() => router.replace("/profile")}
          className="mt-7 rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-cyan-300">
            Open Rider Profile
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-6 pb-28 pt-16"
    >
      <Text className="text-3xl font-black text-white">Driver Profile</Text>
      <Text className="mt-2 text-sm text-slate-300">
        Profile details, verification status, and driving stats.
      </Text>

      <View className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-semibold text-slate-200">Identity</Text>
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

      <View className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4">
        <Text className="text-sm font-semibold text-cyan-200">
          Verification
        </Text>
        <Text className="mt-2 text-2xl font-black text-white">
          {summary?.status || "Unknown"}
        </Text>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <Text className="text-sm font-semibold text-slate-200">
          Driver Stats
        </Text>
        <View className="mt-3 flex-row justify-between">
          <Stat label="Rating" value={summary?.rating || "0.00"} />
          <Stat label="Ratings" value={summary?.count || "0"} />
          <Stat label="Rides" value={summary?.rides || "0"} />
        </View>
      </View>

      <Pressable
        onPress={() => void onLogout()}
        className="mt-8 items-center rounded-2xl border border-rose-400/50 bg-rose-900/20 px-5 py-4"
      >
        <Text className="text-base font-semibold text-rose-200">Logout</Text>
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
    <View className="mt-3 flex-row items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3">
      <Text className="text-sm text-slate-400">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm font-semibold text-slate-100">
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
      <Text className="text-xl font-black text-white">{value}</Text>
      <Text className="mt-1 text-xs text-slate-400">{label}</Text>
    </View>
  );
}
