import { loadSession } from "@/lib/auth";
import { isOnboardingCompleted } from "@/lib/onboardingStore";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

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
        if (isActive) {
          setRoute("/login");
        }
      }
    }

    void resolveStartupRoute();

    const hardFallback = setTimeout(() => {
      if (isActive) {
        setRoute("/login");
      }
    }, ASYNC_GUARD_MS + 1000);

    return () => {
      isActive = false;
      clearTimeout(hardFallback);
    };
  }, []);

  if (!route) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return <Redirect href={route} />;
}
