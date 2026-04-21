import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { clearSession, getApiErrorMessage, loadSession } from "../../lib/auth";

export default function AccountTabScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    try {
      const existingSession = await loadSession();
      setIsLoggedIn(Boolean(existingSession));
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
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  }

  if (!sessionChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-sm text-slate-300">Loading account...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <ScrollView
        className="flex-1 bg-slate-950"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-white">Account</Text>
        <Text className="mt-2 text-sm text-slate-300">
          Login to access your rider profile and saved locations.
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
      <Text className="text-3xl font-black text-white">Account</Text>
      <Text className="mt-2 text-sm text-slate-300">
        Open your rider profile or sign out of the app.
      </Text>

      <View className="mt-7 gap-4">
        <Link
          href="/profile"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-cyan-300">
            Open Profile
          </Text>
        </Link>

        <Pressable
          onPress={() => router.push("/")}
          className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-100">
            Go to Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void onLogout()}
          className="rounded-2xl border border-rose-400/50 bg-rose-900/20 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-rose-200">
            Logout
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
