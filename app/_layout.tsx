import "@/global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="signup/rider" options={{ title: "Rider Signup" }} />
      <Stack.Screen name="signup/driver" options={{ title: "Driver Signup" }} />
    </Stack>
  );
}
