import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getPrimaryRole, loadSession, UserRole } from "../../lib/auth";

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void hydrateRole();
  }, []);

  async function hydrateRole() {
    const session = await loadSession();
    setRole(getPrimaryRole(session));
  }

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

  return (
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      <View className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-cyan-500/20" />
      <View className="absolute -right-16 top-44 h-44 w-44 rounded-full bg-emerald-500/20" />

      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs uppercase tracking-[2px] text-cyan-300">
            Routee Dashboard
          </Text>
          <Text className="mt-2 text-4xl font-black leading-tight text-white">
            Move Smarter,
            {"\n"}
            Every Ride
          </Text>
        </View>

        <Pressable
          onPress={() => router.push(profileRoute)}
          className="mt-1 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <Ionicons name="person-circle-outline" size={26} color="#22d3ee" />
        </Pressable>
      </View>
      <Text className="mt-3 text-base leading-6 text-slate-300">
        Track nearby activity, manage ride requests, and get live updates in one
        place.
      </Text>

      <View className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
        <Text className="text-sm font-semibold text-slate-200">
          Quick Snapshot
        </Text>
        <View className="mt-4 flex-row justify-between">
          <Stat label="Nearby Drivers" value="24" />
          <Stat label="Avg Wait" value="4 min" />
          <Stat label="Today Trips" value="18" />
        </View>
      </View>

      <View className="mt-5 rounded-3xl border border-cyan-500/30 bg-cyan-950/40 p-5">
        <Text className="text-sm font-semibold text-cyan-200">Live Note</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-200">
          Premium lane routing is active. Driver matching quality is currently
          high in your area.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push(profileRoute)}
        className="mt-5 rounded-3xl border border-slate-700 bg-slate-900 px-5 py-4"
      >
        <Text className="text-sm font-semibold text-cyan-300">
          {isDriver ? "Driver Profile" : "Rider Profile"}
        </Text>
        <Text className="mt-1 text-base font-medium text-white">
          {isDriver
            ? "View verification status and driver account details."
            : "View and update your rider profile, preferences, and saved places."}
        </Text>
      </Pressable>
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
