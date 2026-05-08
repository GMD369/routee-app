import { router } from "expo-router";
import * as ExpoLocation from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { saveUserLocation } from "../lib/userLocation";

function PinIllustration() {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={40} fill="#F0F4FF" />
      <Path
        d="M40 16C30.06 16 22 24.06 22 34c0 13.25 18 30 18 30s18-16.75 18-30c0-9.94-8.06-18-18-18z"
        fill="#0D0D0D"
      />
      <Circle cx={40} cy={34} r={7} fill="#fff" />
    </Svg>
  );
}

type Step = "prompt" | "loading" | "denied" | "saving" | "saveerror";

export default function LocationSetupScreen() {
  const [step, setStep] = useState<Step>("prompt");

  async function handleAllow() {
    setStep("loading");
    let status: ExpoLocation.PermissionStatus;
    try {
      const result = await ExpoLocation.requestForegroundPermissionsAsync();
      status = result.status;
    } catch {
      setStep("denied");
      return;
    }

    if (status !== "granted") {
      setStep("denied");
      return;
    }

    setStep("saving");
    try {
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      await saveUserLocation(pos.coords.latitude, pos.coords.longitude);
      router.replace("/(tabs)");
    } catch {
      setStep("saveerror");
    }
  }

  function handleSkip() {
    // User skips — go to home without saving location.
    // Map picker will use GPS on-the-fly.
    router.replace("/(tabs)");
  }

  const isLoading = step === "loading" || step === "saving";

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>
        <View style={s.illustrationWrap}>
          <PinIllustration />
        </View>

        <Text style={s.title}>Enable Location</Text>
        <Text style={s.subtitle}>
          Musafee uses your location to find nearby rides and show you accurate route options.
        </Text>

        <View style={s.stepsList}>
          {[
            { icon: "📍", text: "Find rides near your area" },
            { icon: "🗺️", text: "Open maps centered on your location" },
            { icon: "🚗", text: "Accurate pickup & dropoff matching" },
          ].map((item, i) => (
            <View key={i} style={s.stepRow}>
              <Text style={s.stepIcon}>{item.icon}</Text>
              <Text style={s.stepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {step === "denied" && (
          <View style={s.deniedBox}>
            <Text style={s.deniedText}>
              Location permission was denied. You can enable it in your device Settings → Apps → Musafee, or skip for now.
            </Text>
          </View>
        )}

        {step === "saveerror" && (
          <View style={[s.deniedBox, { borderColor: "#FECACA", backgroundColor: "#FFF1F0" }]}>
            <Text style={[s.deniedText, { color: "#991B1B" }]}>
              Could not save your location. Please try again.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.primaryBtn, isLoading && s.primaryBtnLoading]}
          onPress={() => void handleAllow()}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>
              {step === "denied" || step === "saveerror" ? "Try Again" : "Allow Location"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.skipBtn} onPress={handleSkip} disabled={isLoading}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, paddingHorizontal: 32, paddingTop: 48, alignItems: "center" },

  illustrationWrap: { marginBottom: 32 },

  title: { fontSize: 28, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5, textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 15, color: "#888", textAlign: "center", lineHeight: 24, marginBottom: 36 },

  stepsList: { width: "100%", gap: 0, marginBottom: 40 },
  stepRow: {
    flexDirection: "row", alignItems: "center", gap: 16,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#F0F0F0",
  },
  stepIcon: { fontSize: 22, width: 28, textAlign: "center" },
  stepText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#333" },

  deniedBox: {
    backgroundColor: "#FFF7ED", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#FED7AA", marginBottom: 20, width: "100%",
  },
  deniedText: { fontSize: 13, color: "#92400E", lineHeight: 20, textAlign: "center" },

  primaryBtn: {
    width: "100%", backgroundColor: "#0D0D0D", borderRadius: 16,
    paddingVertical: 17, alignItems: "center", marginBottom: 14,
  },
  primaryBtnLoading: { backgroundColor: "#555" },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  skipBtn: { paddingVertical: 12 },
  skipText: { fontSize: 14, color: "#AAA", fontWeight: "600" },
});
