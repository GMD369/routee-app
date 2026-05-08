import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { MusafeeTabBar } from "../../components/TabBar";
import { getPrimaryRole, loadSession, UserRole } from "../../lib/auth";

/* ── Icons — filled when focused, outline when not ───────────── */

function HomeIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"
        fill={focused ? color : "none"}
        stroke={focused ? "none" : color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {focused ? (
        <Rect x="9" y="14" width="6" height="7" rx="1" fill="#fff" />
      ) : (
        <Path
          d="M9 21V13h6v8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function LocationIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Path
            d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"
            fill={color}
          />
          <Path
            d="M9 3v15M15 6v15"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity={0.6}
          />
        </>
      ) : (
        <Path
          d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function VehicleIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Rect x="2" y="6" width="20" height="13" rx="3" fill={color} />
          <Path d="M2 10h20" stroke="#fff" strokeWidth="1.5" />
          <Rect x="5" y="13" width="4" height="3" rx="1" fill="#fff" opacity={0.7} />
          <Rect x="10" y="13" width="4" height="3" rx="1" fill="#fff" opacity={0.7} />
        </>
      ) : (
        <>
          <Rect x="2" y="6" width="20" height="13" rx="3" stroke={color} strokeWidth="2" />
          <Path d="M2 10h20" stroke={color} strokeWidth="1.5" />
          <Rect x="5" y="13" width="4" height="3" rx="1" fill={color} opacity={0.5} />
        </>
      )}
    </Svg>
  );
}

function RideIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {focused ? (
        <>
          <Rect x="2" y="6" width="20" height="13" rx="3" fill={color} />
          <Path d="M2 10h20" stroke="#fff" strokeWidth="1.5" />
          <Rect x="5" y="13" width="4" height="3" rx="1" fill="#fff" opacity={0.7} />
          <Rect x="10" y="13" width="4" height="3" rx="1" fill="#fff" opacity={0.7} />
        </>
      ) : (
        <>
          <Rect x="2" y="6" width="20" height="13" rx="3" stroke={color} strokeWidth="2" />
          <Path d="M2 10h20" stroke={color} strokeWidth="1.5" />
          <Rect x="5" y="13" width="4" height="3" rx="1" fill={color} opacity={0.5} />
        </>
      )}
    </Svg>
  );
}

function SearchIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="10.5" cy="10.5" r="6.5"
        fill={focused ? color : "none"}
        stroke={focused ? "none" : color}
        strokeWidth={2}
      />
      {focused ? (
        <Line x1="15.5" y1="15.5" x2="21" y2="21" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      ) : (
        <Path d="M15.5 15.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
      )}
    </Svg>
  );
}

function AccountIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="8"
        r="4"
        fill={focused ? color : "none"}
        stroke={focused ? "none" : color}
        strokeWidth="2"
      />
      <Path
        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
        fill={focused ? color : "none"}
        stroke={focused ? "none" : color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ── Layout ──────────────────────────────────────────────────── */

export default function TabsLayout() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const session = await loadSession();
        if (!cancelled) setRole(getPrimaryRole(session));
      } catch {
        if (!cancelled) setRole(null);
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, []);

  if (role === null) return null;

  const isDriver = role === "driver";

  if (isDriver) {
    return (
      <Tabs
        tabBar={(props) => <MusafeeTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <HomeIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: "Vehicles",
            tabBarIcon: ({ color, focused }) => (
              <VehicleIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="rides"
          options={{
            title: "Rides",
            tabBarIcon: ({ color, focused }) => (
              <RideIcon color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen name="location" options={{ tabBarButton: () => null }} />
        <Tabs.Screen name="search" options={{ tabBarButton: () => null }} />
        <Tabs.Screen name="account" options={{ tabBarButton: () => null }} />
      </Tabs>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <MusafeeTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <HomeIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="trips" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="rides" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="location"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <LocationIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <SearchIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="account" options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}
