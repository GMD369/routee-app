import { Tabs } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { View } from "react-native";

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
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
            <HomeIcon color={color} />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="trips" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
    </Tabs>
  );
}
