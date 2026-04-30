import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { getPrimaryRole, loadSession, UserRole } from "../../lib/auth";

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

function VehicleIcon({ color }: { color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 11h14l-1.2-4.2A2 2 0 0 0 16 5.4H8a2 2 0 0 0-1.8 1.4z" />
      <Path d="M4 11v6h2" />
      <Path d="M18 11v6h2" />
      <Path d="M6 17a1.5 1.5 0 1 0 0 .01" />
      <Path d="M18 17a1.5 1.5 0 1 0 0 .01" />
      <Path d="M8 11v-2" />
      <Path d="M16 11v-2" />
    </Svg>
  );
}

function RideIcon({ color }: { color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M17 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
      <Path d="M3 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0" />
      <Path d="M1 4v6h14" />
      <Path d="M15 10v6h2" />
      <Path d="M17 4h2a2 2 0 0 1 2 2v4" />
    </Svg>
  );
}

function LocationIcon({ color }: { color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z" />
      <Path d="M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
    </Svg>
  );
}

function AccountIcon({ color }: { color: string }) {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </Svg>
  );
}

export default function TabsLayout() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const session = await loadSession();
        if (!cancelled) {
          setRole(getPrimaryRole(session));
        }
      } catch {
        if (!cancelled) {
          setRole(null);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  if (role === null) {
    return null;
  }

  const isDriver = role === "driver";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 20,
          backgroundColor: "#ffffff",
          borderColor: "#EBEBEB",
          borderWidth: 1.5,
          borderRadius: 24,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarActiveTintColor: "#0D0D0D",
        tabBarInactiveTintColor: "#C2C2C2",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              backgroundColor: focused ? "#F0F0F0" : "transparent",
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}
          >
            {route.name === "trips" ? (
              <VehicleIcon color={color} />
            ) : route.name === "rides" ? (
              <RideIcon color={color} />
            ) : route.name === "location" ? (
              <LocationIcon color={color} />
            ) : route.name === "account" ? (
              <AccountIcon color={color} />
            ) : (
              <HomeIcon color={color} />
            )}
          </View>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen
        name="trips"
        options={{ title: "Vehicles", href: isDriver ? undefined : null }}
      />
      <Tabs.Screen
        name="rides"
        options={{ title: "Rides", href: isDriver ? undefined : null }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: "Location",
          tabBarButton: isDriver ? () => null : undefined,
        }}
      />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
