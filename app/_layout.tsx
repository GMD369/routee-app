import "react-native-url-polyfill/auto";
import "@/global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import "../lib/auth";
import { initializeNotifications, setupTokenRefreshListener } from "../lib/notifications";

export default function RootLayout() {
  useEffect(() => {
    // Initial token check on app launch
    void initializeNotifications();

    // Re-check token whenever app comes back to foreground
    function onAppStateChange(next: AppStateStatus) {
      if (next === "active") {
        void initializeNotifications();
      }
    }
    const appStateSub = AppState.addEventListener("change", onAppStateChange);

    // Listen for Firebase token rotations
    const removeRefreshListener = setupTokenRefreshListener();

    return () => {
      appStateSub.remove();
      removeRefreshListener();
    };
  }, []);

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
