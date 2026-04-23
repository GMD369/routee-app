import { markOnboardingCompleted } from "@/lib/onboardingStore";
import { router } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREENS = [
  {
    id: 1,
    title: "Get There",
    subtitle: "Smarter",
    description:
      "Book affordable rides in seconds. Tell us where you're headed and we'll match you with a nearby driver — no calls, no haggling.",
    steps: [
      "Open the app and set your destination",
      "Get matched with a nearby driver",
      "Sit back and enjoy the ride",
    ],
    note: "No waiting, no haggling. Tap once and you're on your way.",
    bgColor: "#e0f2fe",
    icon: "📍",
  },
  {
    id: 2,
    title: "Ride With",
    subtitle: "Confidence",
    description:
      "Every driver on Musafee is verified, trained, and rated by real passengers. Share your live trip for extra peace of mind.",
    steps: [
      "Verified and rated drivers only",
      "Share live trip with loved ones",
      "Rate your experience after every ride",
    ],
    note: "Your safety is our highest priority on every single journey.",
    bgColor: "#d1fae5",
    icon: "🛡️",
  },
  {
    id: 3,
    title: "Drive On",
    subtitle: "Your Terms",
    description:
      "Turn your free time into steady income. Go online whenever you want, accept rides on your schedule, and get paid fast.",
    steps: [
      "Sign up and get verified as a driver",
      "Go online whenever you choose",
      "Earn on your own schedule",
    ],
    note: "Join thousands of drivers already earning with Musafee across Pakistan.",
    bgColor: "#fef3c7",
    icon: "💰",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  async function finish() {
    try {
      setIsLoading(true);
      await markOnboardingCompleted();
      router.replace("/login");
    } catch {
      // silently fall through to login
      router.replace("/login");
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    if (currentIndex < SCREENS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      void finish();
    }
  }

  function handlePrev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  const screen = SCREENS[currentIndex];
  const isLast = currentIndex === SCREENS.length - 1;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>MUSAFEE</Text>
        <TouchableOpacity
          onPress={() => void finish()}
          disabled={isLoading}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>{isLast ? "" : "Skip"}</Text>
        </TouchableOpacity>
      </View>

      {/* Content card */}
      <View style={[styles.card, { backgroundColor: screen.bgColor }]}>
        {/* Icon */}
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>{screen.icon}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{screen.title}</Text>
        <Text style={styles.titleAccent}>{screen.subtitle}</Text>

        {/* Description */}
        <Text style={styles.description}>{screen.description}</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {screen.steps.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{screen.note}</Text>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SCREENS.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentIndex(i)}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={handlePrev}
              disabled={isLoading}
              style={styles.btnBack}
            >
              <Text style={styles.btnBackText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            disabled={isLoading}
            style={styles.btnNext}
          >
            <Text style={styles.btnNextText}>
              {isLoading ? "Loading..." : isLast ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconText: {
    fontSize: 56,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 46,
  },
  titleAccent: {
    fontSize: 40,
    fontWeight: "900",
    color: "#0284c7",
    textAlign: "center",
    lineHeight: 46,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  stepsContainer: {
    width: "100%",
    gap: 10,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  noteBox: {
    width: "100%",
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noteText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 28,
    backgroundColor: "#0f172a",
  },
  dotInactive: {
    width: 10,
    backgroundColor: "#cbd5e1",
  },
  buttons: {
    gap: 10,
  },
  btnBack: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnBackText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  btnNext: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnNextText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
