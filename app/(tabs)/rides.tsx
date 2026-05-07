import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../lib/driver";
import { listMyRides, RideResponse } from "../../lib/ride";

function PlusSvg() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function formatDeparture(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function rideStatusConfig(status: string) {
  switch (status) {
    case "active": return { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A", label: "Active" };
    case "completed": return { bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB", label: "Completed" };
    case "cancelled": return { bg: "#FFF1F0", border: "#FCA5A5", color: "#DC2626", label: "Cancelled" };
    default: return { bg: "#F5F5F5", border: "#D1D5DB", color: "#6B7280", label: status };
  }
}

/* ── Empty / Onboarding states ────────────────────────────────── */

function VerifyPrompt() {
  return (
    <View style={es.container}>
      <View style={[es.heroIcon, { backgroundColor: "#FFFBEB" }]}><Text style={es.heroEmoji}>🔐</Text></View>
      <Text style={es.title}>Verify to Post Rides</Text>
      <Text style={es.sub}>Complete driver verification to start posting rides and earning from your daily commute.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/driver-verification")}>
        <Text style={es.ctaText}>Complete Verification →</Text>
      </TouchableOpacity>
      <View style={es.stepsCard}>
        <Text style={es.stepsCardTitle}>Verification Steps</Text>
        {[
          { icon: "🪪", title: "Identity check", desc: "Upload a valid national ID or license" },
          { icon: "🚗", title: "Vehicle registration", desc: "Add at least one registered vehicle" },
          { icon: "✅", title: "Admin approval", desc: "Review usually within 24 hours" },
        ].map(s => (
          <View key={s.icon} style={es.step}>
            <View style={[es.stepBadge, { backgroundColor: "#FFFBEB" }]}><Text style={es.stepEmoji}>{s.icon}</Text></View>
            <View style={es.stepBody}><Text style={es.stepTitle}>{s.title}</Text><Text style={es.stepDesc}>{s.desc}</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

function NoRidesState() {
  return (
    <View style={es.container}>
      <View style={[es.heroIcon, { backgroundColor: "#F0F4FF" }]}><Text style={es.heroEmoji}>🛣️</Text></View>
      <Text style={es.title}>Post Your First Ride</Text>
      <Text style={es.sub}>Share your daily commute with riders going your way and earn from every trip.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/ride/new")}>
        <Text style={es.ctaText}>Post a Ride →</Text>
      </TouchableOpacity>
      <View style={es.stepsCard}>
        <Text style={es.stepsCardTitle}>How it works</Text>
        {[
          { icon: "📍", title: "Set your route", desc: "Enter your start, destination, and departure time" },
          { icon: "💰", title: "Name your price", desc: "Set a fair price per seat for riders" },
          { icon: "🤝", title: "Accept riders", desc: "Review requests and confirm who joins" },
        ].map(s => (
          <View key={s.icon} style={es.step}>
            <View style={[es.stepBadge, { backgroundColor: "#F0F4FF" }]}><Text style={es.stepEmoji}>{s.icon}</Text></View>
            <View style={es.stepBody}><Text style={es.stepTitle}>{s.title}</Text><Text style={es.stepDesc}>{s.desc}</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

const es = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 24, paddingBottom: 48 },
  heroIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  heroEmoji: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 10, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, paddingHorizontal: 16, marginBottom: 24 },
  cta: { backgroundColor: "#0D0D0D", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 28 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  stepsCard: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB", gap: 16 },
  stepsCardTitle: { fontSize: 12, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepEmoji: { fontSize: 22 },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  stepDesc: { fontSize: 12, color: "#888", marginTop: 2 },
});

/* ── Ride card ──────────────────────────────────────────────── */

function RideCard({ ride }: { ride: RideResponse }) {
  const sc = rideStatusConfig(ride.status);
  return (
    <TouchableOpacity
      style={rc.card}
      onPress={() => router.push({ pathname: "/ride/[rideId]", params: { rideId: ride.id } })}
      activeOpacity={0.85}
    >
      {/* Status + seats */}
      <View style={rc.topRow}>
        <View style={[rc.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[rc.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
        <View style={rc.seatRow}>
          <Text style={rc.seatEmoji}>💺</Text>
          <Text style={rc.seatText}>{ride.available_seats}/{ride.total_seats} seats</Text>
        </View>
        <Text style={rc.arrow}>›</Text>
      </View>

      {/* Route */}
      <View style={rc.routeBox}>
        <View style={rc.routeRow}>
          <View style={rc.dotGreen} />
          <Text style={rc.routeAddr} numberOfLines={2}>{ride.origin_address || "Origin"}</Text>
        </View>
        <View style={rc.connector}><View style={rc.connLine} /></View>
        <View style={rc.routeRow}>
          <View style={rc.dotRed} />
          <Text style={rc.routeAddr} numberOfLines={2}>{ride.dest_address || "Destination"}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={rc.footer}>
        <Text style={rc.depTime}>🕐 {formatDeparture(ride.departure_time)}</Text>
        <View style={rc.pricePill}><Text style={rc.priceText}>PKR {ride.price_per_seat}/seat</Text></View>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  seatRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  seatEmoji: { fontSize: 13 },
  seatText: { fontSize: 12, color: "#666", fontWeight: "600" },
  arrow: { marginLeft: "auto", fontSize: 22, color: "#CCCCCC" },
  routeBox: { backgroundColor: "#FAFAFA", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F0F0F0", marginBottom: 14 },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  connector: { paddingLeft: 4, paddingVertical: 3 },
  connLine: { width: 1.5, height: 14, backgroundColor: "#D0D0D0", marginLeft: 3 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A", marginTop: 4, flexShrink: 0 },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", marginTop: 4, flexShrink: 0 },
  routeAddr: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600", lineHeight: 18 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  depTime: { fontSize: 12, color: "#888", fontWeight: "500" },
  pricePill: { backgroundColor: "#F8F9FA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#EBEBEB" },
  priceText: { fontSize: 12, fontWeight: "800", color: "#1A1A1A" },
});

/* ── Screen ─────────────────────────────────────────────────── */

export default function RidesTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [rides, setRides] = useState<RideResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateScreen = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
      if (currentRole !== "driver") { setVerificationStatus(null); setRides([]); return; }
      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);
      if (driverProfile.verification_status !== "verified") { setRides([]); return; }
      const data = await listMyRides();
      setRides(data);
    } catch (error) {
      Alert.alert("Load error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void hydrateScreen(); }, [hydrateScreen]));

  const isDriver = role === "driver";
  const isVerified = verificationStatus === "verified";
  const activeRides = rides.filter(r => r.status === "active");
  const pastRides = rides.filter(r => r.status !== "active");

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>My Rides</Text>
            <Text style={s.subtitle}>Post rides and track commutes</Text>
          </View>
          {isDriver && isVerified && (
            <TouchableOpacity style={s.postBtn} onPress={() => router.push("/ride/new")}>
              <PlusSvg />
              <Text style={s.postBtnText}>Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeEmoji}>🚫</Text>
            <View style={s.noticeBody}>
              <Text style={s.noticeTitle}>Driver accounts only</Text>
              <Text style={s.noticeSub}>Sign in with a driver account to post rides and manage your commutes.</Text>
            </View>
          </View>
        ) : loading ? (
          <View style={s.loadingRow}><ActivityIndicator color="#0D0D0D" /><Text style={s.loadingText}>Loading rides…</Text></View>
        ) : !isVerified ? (
          <VerifyPrompt />
        ) : rides.length === 0 ? (
          <NoRidesState />
        ) : (
          <View style={s.list}>
            {activeRides.length > 0 && (
              <>
                <Text style={s.groupLabel}>Active ({activeRides.length})</Text>
                {activeRides.map(r => <RideCard key={r.id} ride={r} />)}
              </>
            )}
            {pastRides.length > 0 && (
              <>
                <Text style={[s.groupLabel, { marginTop: 10 }]}>Past Rides ({pastRides.length})</Text>
                {pastRides.map(r => <RideCard key={r.id} ride={r} />)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "900", color: "#1A1A1A", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#888", marginTop: 2 },
  postBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0D0D0D", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
  },
  postBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  noticeCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#fff", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "#EBEBEB",
  },
  noticeEmoji: { fontSize: 28 },
  noticeBody: { flex: 1 },
  noticeTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  noticeSub: { fontSize: 13, color: "#888", marginTop: 3 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20, backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#EBEBEB" },
  loadingText: { fontSize: 14, color: "#888" },
  list: { gap: 12 },
  groupLabel: { fontSize: 12, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
});
