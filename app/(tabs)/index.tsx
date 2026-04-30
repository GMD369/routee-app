import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";

/* ── Icons ──────────────────────────────────────────────────── */
function DummyMap() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 390 320"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Base background */}
      <Rect x={0} y={0} width={390} height={320} fill="#E8EAE6" />

      {/* Grid roads — horizontal */}
      <Rect x={0} y={48} width={390} height={18} fill="#fff" />
      <Rect x={0} y={110} width={390} height={14} fill="#fff" />
      <Rect x={0} y={170} width={390} height={18} fill="#fff" />
      <Rect x={0} y={240} width={390} height={14} fill="#fff" />
      <Rect x={0} y={290} width={390} height={18} fill="#fff" />

      {/* Grid roads — vertical */}
      <Rect x={40} y={0} width={18} height={320} fill="#fff" />
      <Rect x={110} y={0} width={14} height={320} fill="#fff" />
      <Rect x={180} y={0} width={20} height={320} fill="#fff" />
      <Rect x={260} y={0} width={14} height={320} fill="#fff" />
      <Rect x={330} y={0} width={18} height={320} fill="#fff" />

      {/* Road center dashes — horizontal main road */}
      <Rect x={0} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={36} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={72} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={108} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={144} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={200} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={236} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={280} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={316} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={352} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />

      {/* Road center dashes — vertical main road */}
      <Rect x={189} y={0} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={36} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={72} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={108} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={196} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={232} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={268} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={304} width={2} height={28} rx={1} fill="#E0D9C0" />

      {/* City blocks */}
      <Rect x={58} y={0} width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={0} width={44} height={42} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={0} width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={0} width={42} height={42} rx={4} fill="#D0D5CC" />

      <Rect x={0} y={66} width={34} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={58} y={66} width={44} height={38} rx={4} fill="#C8CCCA" />
      <Rect x={128} y={66} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={66} width={44} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={348} y={66} width={42} height={38} rx={4} fill="#D8DDD4" />

      <Rect x={0} y={124} width={34} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={58} y={124} width={44} height={40} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={124} width={44} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={124} width={44} height={40} rx={4} fill="#C8CCCA" />
      <Rect x={348} y={124} width={42} height={40} rx={4} fill="#D8DDD4" />

      <Rect x={0} y={188} width={34} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={58} y={188} width={44} height={46} rx={4} fill="#D0D5CC" />
      <Rect x={128} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={188} width={42} height={46} rx={4} fill="#D0D5CC" />

      <Rect x={0} y={254} width={34} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={58} y={254} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={254} width={44} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={254} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={254} width={42} height={38} rx={4} fill="#C8CCCA" />

      {/* Green park block */}
      <Rect x={200} y={124} width={52} height={40} rx={6} fill="#B8D4AC" />
      <Rect x={200} y={188} width={52} height={46} rx={6} fill="#ACC8A4" />

      {/* Park trees (tiny circles) */}
      <Circle cx={214} cy={140} r={5} fill="#90B888" />
      <Circle cx={228} cy={136} r={4} fill="#90B888" />
      <Circle cx={240} cy={142} r={5} fill="#90B888" />
      <Circle cx={220} cy={200} r={5} fill="#90B888" />
      <Circle cx={236} cy={196} r={4} fill="#90B888" />
      <Circle cx={246} cy={204} r={5} fill="#90B888" />

      {/* Location pin — center */}
      <Ellipse cx={195} cy={162} rx={10} ry={5} fill="rgba(0,0,0,0.15)" />
      <Path
        d="M195 128 C184 128 175 137 175 148 C175 162 195 178 195 178 C195 178 215 162 215 148 C215 137 206 128 195 128Z"
        fill="#0D0D0D"
      />
      <Circle cx={195} cy={148} r={6} fill="#fff" />

      {/* Pulse rings around pin */}
      <Circle
        cx={195}
        cy={162}
        r={18}
        fill="none"
        stroke="rgba(13,13,13,0.08)"
        strokeWidth={1.5}
      />
      <Circle
        cx={195}
        cy={162}
        r={28}
        fill="none"
        stroke="rgba(13,13,13,0.05)"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

function UserSvg() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

/* ── Screen ─────────────────────────────────────────────────── */

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
    } catch (error) {
      Alert.alert("Home error", getApiErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    void hydrateHome();
  }, [hydrateHome]);

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

  return (
    <View style={s.root}>
      {/* Dummy map background */}
      <View style={s.mapArea}>
        <DummyMap />
        <SafeAreaView style={s.mapOverlay} edges={["top"]}>
          <View style={s.topBar}>
            <View>
              <Text style={s.greeting}>Good morning 👋</Text>
              <Text style={s.appName}>Musafee</Text>
            </View>
            <TouchableOpacity
              style={s.profileBtn}
              onPress={() => router.push(profileRoute)}
            >
              <UserSvg />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E8EAE6" },

  // Map area
  mapArea: { flex: 1, backgroundColor: "#E8EAE6", overflow: "hidden" },
  mapOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: "500" },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D0D0D",
    marginBottom: 6,
  },
  modalSub: { fontSize: 13, color: "#9E9E9E", marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0D0D0D",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "#F8F8F8",
  },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: "#757575" },
  modalSkip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  modalSkipText: { fontSize: 13, fontWeight: "600", color: "#424242" },
  modalContinue: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#0D0D0D",
  },
  modalContinueText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
