import { loadSession } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboardingStore";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

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
      <LinearGradient
        colors={["#0D0D0D", "#1c1c1c"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.root}
      >
        <View style={styles.center}>
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Musafee</Text>
          <Text style={styles.tagline}>Share the road. Split the cost.</Text>
        </View>

        <View style={styles.loadingSection}>
          <View style={styles.dots}>
            {([1, 0.3, 0.15] as number[]).map((opacity, i) => (
              <View key={i} style={[styles.dot, { opacity }]} />
            ))}
          </View>
          <Text style={styles.loadingText}>LOADING</Text>
        </View>

        <View style={styles.progressBar} />
      </LinearGradient>
    );
  }

  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
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
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: 72,
    height: 72,
  },
  appName: {
    fontSize: 40,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
  },
  loadingSection: {
    paddingBottom: 60,
    alignItems: "center",
    gap: 12,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  loadingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.2)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  progressBar: {
    position: "absolute",
    bottom: 12,
    height: 5,
    width: "60%",
    backgroundColor: "#ffffff",
    borderRadius: 2.5,
    opacity: 0.6,
  },
});
