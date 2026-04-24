import { markOnboardingCompleted } from "@/lib/onboardingStore";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

/* ── SVG Illustrations (exact from design file) ───────────── */

function IllustrationRides() {
  return (
    <Svg width={140} height={120} viewBox="0 0 140 120" fill="none">
      <Ellipse cx={70} cy={108} rx={48} ry={8} fill="#e8e8e8" />
      <Rect x={22} y={52} width={96} height={44} rx={14} fill="#1A1A1A" />
      <Rect x={30} y={44} width={80} height={18} rx={8} fill="#333" />
      <Circle cx={42} cy={96} r={10} fill="#fff" stroke="#1A1A1A" strokeWidth={2} />
      <Circle cx={42} cy={96} r={5} fill="#1A1A1A" />
      <Circle cx={98} cy={96} r={10} fill="#fff" stroke="#1A1A1A" strokeWidth={2} />
      <Circle cx={98} cy={96} r={5} fill="#1A1A1A" />
      <Rect x={55} y={60} width={30} height={18} rx={5} fill="#fff" fillOpacity={0.15} />
      <Path d="M30 52 L22 38" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
      <Path d="M110 52 L118 38" stroke="#1A1A1A" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={70} cy={18} r={12} fill="#D9D9D9" />
      <Path d="M54 52 C54 40, 86 40, 86 52" fill="#D9D9D9" />
    </Svg>
  );
}

function IllustrationSave() {
  return (
    <Svg width={140} height={120} viewBox="0 0 140 120" fill="none">
      <Circle cx={35} cy={50} r={18} fill="#E8E8E8" stroke="#1A1A1A" strokeWidth={2} />
      <Circle cx={35} cy={50} r={8} fill="#1A1A1A" />
      <Circle cx={105} cy={50} r={18} fill="#E8E8E8" stroke="#1A1A1A" strokeWidth={2} />
      <Circle cx={105} cy={50} r={8} fill="#1A1A1A" />
      <Path
        d="M53 50 L87 50"
        stroke="#1A1A1A"
        strokeWidth={2.5}
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <Path
        d="M80 44 L88 50 L80 56"
        stroke="#1A1A1A"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x={48} y={76} width={44} height={28} rx={10} fill="#1A1A1A" />
      <SvgText
        x={70}
        y={95}
        textAnchor="middle"
        fill="white"
        fontSize={13}
        fontWeight="700"
      >
        $4.50
      </SvgText>
      <Path d="M70 104 L70 112" stroke="#1A1A1A" strokeWidth={2} />
      <Path d="M35 68 L48 80" stroke="#1A1A1A" strokeWidth={2} strokeDasharray="3 3" />
      <Path d="M105 68 L92 80" stroke="#1A1A1A" strokeWidth={2} strokeDasharray="3 3" />
    </Svg>
  );
}

function IllustrationVerified() {
  return (
    <Svg width={140} height={120} viewBox="0 0 140 120" fill="none">
      <Rect x={20} y={20} width={100} height={80} rx={16} fill="#F0F0F0" stroke="#1A1A1A" strokeWidth={2} />
      <Rect x={32} y={36} width={40} height={6} rx={3} fill="#1A1A1A" />
      <Rect x={32} y={48} width={60} height={4} rx={2} fill="#D9D9D9" />
      <Rect x={32} y={58} width={50} height={4} rx={2} fill="#D9D9D9" />
      <Circle cx={100} cy={70} r={20} fill="#1A1A1A" />
      <Path
        d="M91 70 L97 76 L109 64"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={32} cy={86} r={4} fill="#1A1A1A" fillOpacity={0.2} />
      <Circle cx={44} cy={86} r={4} fill="#1A1A1A" fillOpacity={0.2} />
      <Circle cx={56} cy={86} r={4} fill="#1A1A1A" fillOpacity={0.4} />
      <Circle cx={68} cy={86} r={4} fill="#1A1A1A" />
    </Svg>
  );
}

/* ── Screen data ────────────────────────────────────────────── */

const SCREENS = [
  {
    illustration: IllustrationRides,
    title: "Find Rides Near You",
    desc: "Browse available carpools on your route in real-time. Get picked up right from your doorstep.",
  },
  {
    illustration: IllustrationSave,
    title: "Share & Save Money",
    desc: "Split fuel costs with fellow commuters. Save up to 60% compared to riding alone every day.",
  },
  {
    illustration: IllustrationVerified,
    title: "Safe & Verified Rides",
    desc: "All drivers are ID-verified and rated by the community. Travel with confidence every journey.",
  },
];

/* ── Component ──────────────────────────────────────────────── */

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  async function finish() {
    try {
      setIsLoading(true);
      await markOnboardingCompleted();
    } catch {
      // continue regardless
    } finally {
      setIsLoading(false);
    }
    router.replace("/login");
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
  const Illustration = screen.illustration;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === SCREENS.length - 1;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.inner}>
        {/* Skip */}
        <View style={styles.skipRow}>
          {!isLast ? (
            <TouchableOpacity
              onPress={() => void finish()}
              disabled={isLoading}
              hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>

        {/* Center: illustration + dots + text */}
        <View style={styles.contentArea}>
          <View style={styles.illustrationCard}>
            <Illustration />
          </View>

          <View style={styles.dots}>
            {SCREENS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.title}>{screen.title}</Text>
          <Text style={styles.desc}>{screen.desc}</Text>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          {!isFirst && (
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
            style={[styles.btnNext, isFirst && styles.btnNextFull]}
          >
            <Text style={styles.btnNextText}>
              {isLoading ? "..." : isLast ? "Get Started" : "Next"}
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
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  skipRow: {
    alignItems: "flex-end",
    paddingTop: 8,
    marginBottom: 4,
    minHeight: 36,
    justifyContent: "center",
  },
  skipText: {
    color: "#9E9E9E",
    fontSize: 14,
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationCard: {
    width: 220,
    height: 220,
    borderRadius: 40,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 36,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#1A1A1A",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#E0E0E0",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
    color: "#0D0D0D",
    marginBottom: 12,
  },
  desc: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  cta: {
    paddingBottom: 48,
    flexDirection: "row",
    gap: 12,
  },
  btnBack: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  btnBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0D0D0D",
  },
  btnNext: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  btnNextFull: {
    flex: 1,
  },
  btnNextText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
});
