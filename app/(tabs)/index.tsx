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
    <View className="flex-1 bg-white px-6 pt-16">
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
