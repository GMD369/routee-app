import { loadSession } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboardingStore";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

type StartupRoute = "/onboarding" | "/login" | "/(tabs)";

const ASYNC_GUARD_MS = 2000;

async function withTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ASYNC_GUARD_MS);
    }),
  ]);
}

// Single animated dot
function BounceDot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        // 0→40%: scale up, fade in (560ms)
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 1,
            duration: 560,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 40→80%: scale down, fade out (560ms)
        Animated.parallel([
          Animated.timing(anim, {
            toValue: 0,
            duration: 560,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        // 80→100%: stay small (280ms)
        Animated.delay(280),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <Animated.View
      style={[styles.dot, { transform: [{ scale }], opacity }]}
    />
  );
}

// Single expanding ring
function PulseRing({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        // reset instantly before next cycle
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.6] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Animated.View
      style={[styles.ring, { transform: [{ scale }], opacity }]}
    />
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
          setRoute("/(tabs)");
          return;
        }

        setRoute("/login");
      } catch (error) {
        console.error("Failed to resolve startup route:", error);
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
      <View style={styles.root}>
        {/* Pulse rings — behind everything */}
        <PulseRing delay={0} />
        <PulseRing delay={800} />
        <PulseRing delay={1600} />

        {/* Center content */}
        <View style={styles.center}>
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/icon.jpeg")}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.appName}>Musafee</Text>
          <Text style={styles.tagline}>Share the road. Split the cost.</Text>

          <View style={styles.divider} />

          <View style={styles.dotsRow}>
            <BounceDot delay={0} />
            <BounceDot delay={180} />
            <BounceDot delay={360} />
          </View>
          <Text style={styles.loadingLabel}>Loading</Text>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    );
  }

  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },

  // Rings — absolute, centered at 38% from top
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    top: "38%",
    alignSelf: "center",
  },

  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  logoBox: {
    width: 148,
    height: 148,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: "#0D0D0D",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  logoImg: {
    width: "152%",
    height: "152%",
    marginLeft: "-26%",
    marginTop: "-26%",
  },

  appName: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 46,
    textAlign: "center",
    marginBottom: 10,
  },
  tagline: {
    color: "rgba(255,255,255,0.32)",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },

  divider: {
    width: 32,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 28,
  },

  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  loadingLabel: {
    color: "rgba(255,255,255,0.15)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  version: {
    position: "absolute",
    bottom: 38,
    color: "rgba(255,255,255,0.1)",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
