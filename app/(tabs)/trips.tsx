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
import Svg, { Path, Rect, Circle } from "react-native-svg";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../lib/driver";
import { getMyVehicles, VehicleResponse } from "../../lib/vehicle";

function PlusSvg() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function CarSvg({ color = "#0D0D0D" }: { color?: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1" />
      <Path d="M22 17h-1a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1" />
      <Path d="M5 7l2-4h10l2 4" />
      <Rect x={3} y={7} width={18} height={10} rx={2} />
      <Circle cx={7} cy={17} r={2} />
      <Circle cx={17} cy={17} r={2} />
    </Svg>
  );
}

function formatVehicleTitle(vehicle: VehicleResponse) {
  return `${vehicle.make} ${vehicle.model}`.trim();
}

function formatVehicleMeta(vehicle: VehicleResponse) {
  return [String(vehicle.year), vehicle.color, `${vehicle.total_seats} seats`, vehicle.has_ac ? "AC" : null].filter(Boolean).join(" · ");
}

/* ── Beautiful empty state with steps ───────────────────────── */

function VerifyEmptyState() {
  return (
    <View style={es.container}>
      <View style={[es.heroIcon, { backgroundColor: "#FFFBEB" }]}>
        <Text style={es.heroEmoji}>🔐</Text>
      </View>
      <Text style={es.title}>Verify Your Account First</Text>
      <Text style={es.sub}>Driver verification is required to list vehicles and post rides. It only takes a few minutes.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/driver-verification")}>
        <Text style={es.ctaText}>Start Verification →</Text>
      </TouchableOpacity>
      <View style={es.stepsCard}>
        <Text style={es.stepsCardTitle}>How it works</Text>
        {[
          { n: "1", icon: "🪪", title: "Upload your ID", desc: "National ID or driver's license" },
          { n: "2", icon: "🚗", title: "Add your vehicle", desc: "Registration number, make, and model" },
          { n: "3", icon: "✅", title: "Get approved", desc: "Usually within 24 hours" },
        ].map(step => (
          <View key={step.n} style={es.step}>
            <View style={[es.stepBadge, { backgroundColor: "#FFFBEB" }]}>
              <Text style={es.stepEmoji}>{step.icon}</Text>
            </View>
            <View style={es.stepBody}>
              <Text style={es.stepTitle}>{step.title}</Text>
              <Text style={es.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function AddVehicleEmptyState() {
  return (
    <View style={es.container}>
      <View style={[es.heroIcon, { backgroundColor: "#F0F4FF" }]}>
        <Text style={es.heroEmoji}>🚗</Text>
      </View>
      <Text style={es.title}>Add Your First Vehicle</Text>
      <Text style={es.sub}>Register your vehicle to start posting rides and earning from your commute.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/vehicle/new")}>
        <Text style={es.ctaText}>Add Vehicle →</Text>
      </TouchableOpacity>
      <View style={es.stepsCard}>
        <Text style={es.stepsCardTitle}>What you'll need</Text>
        {[
          { icon: "📋", title: "Registration number", desc: "Your vehicle's license plate" },
          { icon: "🎨", title: "Vehicle details", desc: "Make, model, year, and color" },
          { icon: "💺", title: "Seating capacity", desc: "Number of available seats for riders" },
        ].map(item => (
          <View key={item.icon} style={es.step}>
            <View style={[es.stepBadge, { backgroundColor: "#F0F4FF" }]}>
              <Text style={es.stepEmoji}>{item.icon}</Text>
            </View>
            <View style={es.stepBody}>
              <Text style={es.stepTitle}>{item.title}</Text>
              <Text style={es.stepDesc}>{item.desc}</Text>
            </View>
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

/* ── Vehicle card ─────────────────────────────────────────────── */

function VehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  return (
    <TouchableOpacity
      style={vc.card}
      onPress={() => router.push({ pathname: "/vehicle/[vehicleId]", params: { vehicleId: vehicle.id } })}
      activeOpacity={0.85}
    >
      <View style={vc.top}>
        <View style={vc.iconWrap}><CarSvg /></View>
        <View style={vc.info}>
          <View style={vc.titleRow}>
            <Text style={vc.title}>{formatVehicleTitle(vehicle)}</Text>
            {vehicle.is_primary && <View style={vc.primaryBadge}><Text style={vc.primaryText}>Primary</Text></View>}
            {!vehicle.is_active && <View style={vc.inactiveBadge}><Text style={vc.inactiveText}>Inactive</Text></View>}
          </View>
          <Text style={vc.meta}>{formatVehicleMeta(vehicle)}</Text>
        </View>
      </View>
      <View style={vc.bottom}>
        <View style={vc.platePill}>
          <Text style={vc.plateLabel}>PLATE</Text>
          <Text style={vc.plateNum}>{vehicle.plate_number}</Text>
        </View>
        <View style={vc.typePill}><Text style={vc.typeText}>{vehicle.vehicle_type}</Text></View>
        <Text style={vc.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  title: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  primaryBadge: { backgroundColor: "#0D0D0D", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  primaryText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  inactiveBadge: { backgroundColor: "#FFF1F0", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#FCA5A5" },
  inactiveText: { color: "#DC2626", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  meta: { fontSize: 13, color: "#888", fontWeight: "500" },
  bottom: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  platePill: { flexDirection: "row", alignItems: "baseline", gap: 6, backgroundColor: "#F8F9FA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  plateLabel: { fontSize: 9, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.5 },
  plateNum: { fontSize: 13, fontWeight: "800", color: "#1A1A1A" },
  typePill: { backgroundColor: "#F8F9FA", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  typeText: { fontSize: 12, fontWeight: "600", color: "#555" },
  arrow: { marginLeft: "auto", fontSize: 22, color: "#CCCCCC" },
});

/* ── Screen ─────────────────────────────────────────────────── */

export default function TripsTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrateVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
      if (currentRole !== "driver") { setVerificationStatus(null); setVehicles([]); return; }
      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);
      if (driverProfile.verification_status !== "verified") { setVehicles([]); return; }
      const data = await getMyVehicles();
      setVehicles(data);
    } catch (error) {
      Alert.alert("Vehicles error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void hydrateVehicles(); }, [hydrateVehicles]));

  const isDriver = role === "driver";
  const isVerified = verificationStatus === "verified";

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>My Vehicles</Text>
            <Text style={s.subtitle}>Manage your registered fleet</Text>
          </View>
          {isDriver && isVerified && (
            <TouchableOpacity style={s.addBtn} onPress={() => router.push("/vehicle/new")}>
              <PlusSvg />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeEmoji}>🚫</Text>
            <View style={s.noticeBody}>
              <Text style={s.noticeTitle}>Driver accounts only</Text>
              <Text style={s.noticeSub}>Switch to a driver account to manage vehicles and post rides.</Text>
            </View>
          </View>
        ) : loading ? (
          <View style={s.loadingRow}><ActivityIndicator color="#0D0D0D" /><Text style={s.loadingText}>Loading your vehicles…</Text></View>
        ) : !isVerified ? (
          <VerifyEmptyState />
        ) : vehicles.length === 0 ? (
          <AddVehicleEmptyState />
        ) : (
          <View style={s.list}>
            <Text style={s.listLabel}>{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} registered</Text>
            {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
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
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0D0D0D", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

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
  listLabel: { fontSize: 12, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
});
