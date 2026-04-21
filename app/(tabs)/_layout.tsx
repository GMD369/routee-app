import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 18,
          backgroundColor: "#ffffff",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 24,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const iconName =
            route.name === "index"
              ? "home"
              : route.name === "trips"
                ? "car-sport"
                : "person";

          return (
            <View
              style={{
                backgroundColor: focused ? "#e0f2fe" : "transparent",
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.4,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
