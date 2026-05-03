import "react-native-url-polyfill/auto";
import "@/global.css";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import "../lib/auth";
import { initializeNotifications, setupTokenRefreshListener } from "../lib/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    void initializeNotifications();

    function onAppStateChange(next: AppStateStatus) {
      if (next === "active") {
        void initializeNotifications();
      }
    }
    const appStateSub = AppState.addEventListener("change", onAppStateChange);
    const removeRefreshListener = setupTokenRefreshListener();

    return () => {
      appStateSub.remove();
      removeRefreshListener();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen
        name="driver-profile"
        options={{ title: "Driver Profile" }}
      />
      <Stack.Screen
        name="driver-verification"
        options={{ title: "Driver Verification" }}
      />
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup/rider" options={{ title: "Rider Signup" }} />
      <Stack.Screen name="signup/driver" options={{ title: "Driver Signup" }} />
      <Stack.Screen name="vehicle/new" options={{ title: "Add Vehicle" }} />
      <Stack.Screen
        name="vehicle/edit/[vehicleId]"
        options={{ title: "Edit Vehicle" }}
      />
      <Stack.Screen name="vehicle/[vehicleId]" options={{ title: "Vehicle" }} />
      <Stack.Screen name="ride/new" options={{ title: "Post Ride" }} />
      <Stack.Screen name="ride/[rideId]" options={{ title: "Ride" }} />
      <Stack.Screen
        name="map-picker"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}
