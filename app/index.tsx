import { loadSession } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboardingStore";
import { getUserLocation } from "@/lib/userLocation";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type StartupRoute = "/onboarding" | "/login" | "/(tabs)" | "/location-setup";

const ASYNC_GUARD_MS = 2500;

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ASYNC_GUARD_MS);
    }),
  ]);
}

function CarLogo() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
      <Path d="M8 36 C8 36, 14 20, 28 20 C42 20, 48 36, 48 36" stroke="#0D0D0D" strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={18} cy={36} r={5} fill="#0D0D0D" />
      <Circle cx={38} cy={36} r={5} fill="#0D0D0D" />
      <Rect x={12} y={26} width={32} height={14} rx={5} fill="#0D0D0D" />
      <Path d="M28 8 L28 20" stroke="#0D0D0D" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={28} cy={6} r={3} fill="#0D0D0D" />
    </Svg>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

  return (
    <Animated.View style={[s.dot, { opacity, transform: [{ scale }] }]} />
  );
}

function SplashContent() {
  return (
    <LinearGradient
      colors={["#0D0D0D", "#1c1c1c"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    >
      {/* Center */}
      <View style={s.center}>
        {/* White logo box */}
        <View style={s.logoBox}>
          <CarLogo />
        </View>

        <Text style={s.appName}>Musafee</Text>
        <Text style={s.tagline}>Share the road. Split the cost.</Text>
      </View>

      {/* Bottom loading */}
      <View style={s.bottom}>
        <View style={s.dotsRow}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={160} />
          <AnimatedDot delay={320} />
        </View>
        <Text style={s.loadingLabel}>Loading</Text>
      </View>
    </LinearGradient>
  );
}

export default function StartupRouter() {
  const [route, setRoute] = useState<StartupRoute | null>(null);

  useEffect(() => {
    let isActive = true;

    async function resolveStartupRoute() {
      try {
        const [session, onboardingDone] = await Promise.all([
          withTimeout(loadSession(), null),
          withTimeout(isOnboardingCompleted(), false),
        ]);

        if (!isActive) return;

        if (!onboardingDone) {
          setRoute("/onboarding");
          return;
        }

        if (session) {
          const loc = await withTimeout(getUserLocation(), null);
          setRoute(loc ? "/(tabs)" : "/location-setup");
          return;
        }

        setRoute("/login");
      } catch {
        if (isActive) setRoute("/login");
      }
    }

    void resolveStartupRoute();

    const hardFallback = setTimeout(() => {
      if (isActive) setRoute("/login");
    }, ASYNC_GUARD_MS + 1000);

    return () => {
      isActive = false;
      clearTimeout(hardFallback);
    };
  }, []);

  if (!route) {
    return (
      <View style={s.root}>
        <SplashContent />
      </View>
    );
  }

  return <Redirect href={route} />;
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },

  appName: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: -1.5,
    marginBottom: 8,
  },

  tagline: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0.5,
  },

  bottom: {
    paddingBottom: 60,
    alignItems: "center",
    gap: 10,
  },

  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },

  loadingLabel: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "PlusJakartaSans_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
