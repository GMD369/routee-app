import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
    clearSession,
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";

export default function AccountTabScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      const existingSession = await loadSession();
      setIsLoggedIn(Boolean(existingSession));
      setRole(getPrimaryRole(existingSession));
    } catch (error) {
      Alert.alert("Session error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
    }
  }

  async function onLogout() {
    try {
      await clearSession();
      setIsLoggedIn(false);
      setRole(null);
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  }

  const profileRoute = role === "driver" ? "/driver-profile" : "/profile";
  const profileTitle =
    role === "driver" ? "Open Driver Profile" : "Open Rider Profile";

  if (!sessionChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-sm text-slate-500">Loading account...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">Account</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Login to access your rider profile and saved locations.
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
      <Text className="text-3xl font-black text-slate-900">Account</Text>
      <Text className="mt-2 text-sm text-slate-500">
        Open your {role === "driver" ? "driver" : "rider"} profile or sign out
        of the app.
      </Text>

      <View className="mt-7 gap-4">
        <Link
          href={profileRoute}
          className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-sky-600">
            {profileTitle}
          </Text>
        </Link>

        <Pressable
          onPress={() => router.push("/")}
          className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-700">
            Go to Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void onLogout()}
          className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-rose-600">
            Logout
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
