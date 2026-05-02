import { Link, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  clearSession,
  getApiErrorMessage,
  getPrimaryRole,
  loadSession,
  UserRole,
} from "../../lib/auth";
import {
  clearNotificationToken,
  disableNotifications,
  initializeNotifications,
  isNotificationsEnabled,
} from "../../lib/notifications";

export default function AccountTabScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [togglingNotifications, setTogglingNotifications] = useState(false);

  useEffect(() => {
    void initialize();
  }, []);

  // Refresh notification toggle state whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      void isNotificationsEnabled().then(setNotificationsOn);
    }, [])
  );

  async function initialize() {
    try {
      const existingSession = await loadSession();
      setIsLoggedIn(Boolean(existingSession));
      setRole(getPrimaryRole(existingSession));
      setNotificationsOn(await isNotificationsEnabled());
    } catch (error) {
      Alert.alert("Session error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
    }
  }

  async function onToggleNotifications(value: boolean) {
    if (togglingNotifications) return;
    setTogglingNotifications(true);

    try {
      if (!value) {
        // User turning OFF — remove token from backend
        await disableNotifications();
        setNotificationsOn(false);
      } else {
        // User turning ON — check OS permission first
        if (!Device.isDevice) {
          Alert.alert("Not supported", "Push notifications require a real device.");
          return;
        }

        const { status } = await Notifications.getPermissionsAsync();

        if (status === "denied") {
          // OS permission was denied — must go to device settings
          Alert.alert(
            "Permission required",
            "Notifications are blocked by your device. Open Settings to allow them.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        // Permission granted or undetermined — register token
        await initializeNotifications();
        setNotificationsOn(await isNotificationsEnabled());
      }
    } catch (err) {
      Alert.alert("Error", "Could not update notification settings.");
      console.warn("[notifications] toggle error:", err);
    } finally {
      setTogglingNotifications(false);
    }
  }

  async function onLogout() {
    try {
      await clearNotificationToken();
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

        <Link
          href="/saved-pairs/new"
          className="rounded-2xl border border-slate-900 bg-slate-900 px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-white">
            Add Saved Location Pair
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

        {/* Notifications toggle */}
        <View className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-slate-700">
              Push Notifications
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              {notificationsOn
                ? "You will receive ride and chat alerts"
                : "Notifications are turned off"}
            </Text>
          </View>
          <Switch
            value={notificationsOn}
            onValueChange={(v) => void onToggleNotifications(v)}
            disabled={togglingNotifications}
            trackColor={{ false: "#E5E7EB", true: "#0D0D0D" }}
            thumbColor="#ffffff"
          />
        </View>

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
