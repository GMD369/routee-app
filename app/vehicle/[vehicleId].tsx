import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
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
import { getApiErrorMessage, getPrimaryRole, loadSession } from "../../lib/auth";
import { getMyDriverProfile, VerificationStatus } from "../../lib/driver";
import { deleteVehicle, getMyVehicle, VehicleResponse } from "../../lib/vehicle";

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function CarIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#4F6FC2" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h16a2 2 0 012 2v6a2 2 0 01-2 2h-2" />
      <Path d="M5 17l2-7h10l2 7" />
      <Path d="M5 17h14" />
      <Path d="M7 17v2M17 17v2" />
      <Path d="M9 11h6" />
    </Svg>
  );
}

function ConfirmModal({
  visible, title, message, confirmLabel, onConfirm, onCancel, loading,
}: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!visible) return null;
  return (
    <View style={m.overlay}>
      <View style={m.sheet}>
        <Text style={m.title}>{title}</Text>
        <Text style={m.message}>{message}</Text>
        <View style={m.btns}>
          <TouchableOpacity style={m.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={m.cancelTxt}>Keep Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={m.confirmBtn} onPress={onConfirm} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={m.confirmTxt}>{confirmLabel}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const m = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 },
  sheet: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%" },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 10 },
  message: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 24 },
  btns: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelTxt: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  confirmBtn: { flex: 1, backgroundColor: "#DC2626", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  confirmTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default function VehicleDetailScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string }>();
  const vehicleId = Array.isArray(params.vehicleId) ? params.vehicleId[0] : params.vehicleId;

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const hydrateVehicle = useCallback(async () => {
    if (!vehicleId) { router.back(); return; }
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
      if (currentRole !== "driver") { setVerificationStatus(null); setVehicle(null); return; }
      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);
      if (driverProfile.verification_status !== "verified") { setVehicle(null); return; }
      const data = await getMyVehicle(vehicleId);
      setVehicle(data);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useFocusEffect(useCallback(() => { void hydrateVehicle(); }, [hydrateVehicle]));

  async function doDelete() {
    if (!vehicle) return;
    setDeleting(true);
    try {
      await deleteVehicle(vehicle.id);
      setShowDeleteModal(false);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Delete error", getApiErrorMessage(error));
      setDeleting(false);
    }
  }

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete this vehicle?"
        message="This will permanently remove the vehicle from your account. Any active rides using this vehicle may be affected."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setShowDeleteModal(false)}
        loading={deleting}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackIcon />
          </TouchableOpacity>
          <Text style={s.pageTitle}>Vehicle Details</Text>
        </View>

        {!isDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Driver accounts only</Text>
            <Text style={s.noticeSub}>Sign in with a driver account to view vehicle details.</Text>
          </View>
        ) : !isVerifiedDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Verification required</Text>
            <Text style={s.noticeSub}>Complete driver verification to view vehicle details.</Text>
            <TouchableOpacity style={s.noticeBtn} onPress={() => router.push("/driver-verification")}>
              <Text style={s.noticeBtnText}>Go to Verification</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color="#0D0D0D" />
            <Text style={s.loadingText}>Loading vehicle…</Text>
          </View>
        ) : !vehicle ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Vehicle not found</Text>
            <Text style={s.noticeSub}>This vehicle may have been removed.</Text>
          </View>
        ) : (
          <View style={s.body}>
            {/* Hero card */}
            <View style={s.heroCard}>
              <View style={s.heroIconWrap}>
                <CarIcon />
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroTitle}>{vehicle.make} {vehicle.model}</Text>
                <Text style={s.heroMeta}>{vehicle.year} · {vehicle.color}</Text>
              </View>
              <View style={s.platePill}>
                <Text style={s.plateText}>{vehicle.plate_number}</Text>
              </View>
            </View>

            {/* Badges row */}
            <View style={s.badgeRow}>
              {vehicle.is_primary && (
                <View style={[s.badge, s.badgePrimary]}>
                  <Text style={s.badgePrimaryText}>Primary</Text>
                </View>
              )}
              <View style={s.badge}>
                <Text style={s.badgeText}>{vehicle.vehicle_type || "Car"}</Text>
              </View>
              <View style={s.badge}>
                <Text style={s.badgeText}>{vehicle.is_active ? "Active" : "Inactive"}</Text>
              </View>
              {vehicle.has_ac && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>❄️ AC</Text>
                </View>
              )}
            </View>

            {/* Specs card */}
            <View style={s.specsCard}>
              <View style={s.specRow}>
                <Text style={s.specLabel}>Total Seats</Text>
                <Text style={s.specValue}>{vehicle.total_seats}</Text>
              </View>
              <View style={s.specDivider} />
              <View style={s.specRow}>
                <Text style={s.specLabel}>Air Conditioning</Text>
                <Text style={s.specValue}>{vehicle.has_ac ? "Yes" : "No"}</Text>
              </View>
              <View style={s.specDivider} />
              <View style={s.specRow}>
                <Text style={s.specLabel}>Make</Text>
                <Text style={s.specValue}>{vehicle.make}</Text>
              </View>
              <View style={s.specDivider} />
              <View style={s.specRow}>
                <Text style={s.specLabel}>Model</Text>
                <Text style={s.specValue}>{vehicle.model}</Text>
              </View>
              <View style={s.specDivider} />
              <View style={s.specRow}>
                <Text style={s.specLabel}>Year</Text>
                <Text style={s.specValue}>{vehicle.year}</Text>
              </View>
              <View style={s.specDivider} />
              <View style={s.specRow}>
                <Text style={s.specLabel}>Color</Text>
                <Text style={s.specValue}>{vehicle.color}</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => router.push({ pathname: "/vehicle/edit/[vehicleId]", params: { vehicleId: vehicle.id } })}
            >
              <Text style={s.editBtnText}>Edit Vehicle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteModal(true)} disabled={deleting}>
              <Text style={s.deleteBtnText}>Delete Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 },

  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EBEBEB" },
  pageTitle: { fontSize: 20, fontWeight: "800", color: "#1A1A1A" },

  noticeCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  noticeTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A", marginBottom: 6 },
  noticeSub: { fontSize: 13, color: "#888", lineHeight: 20 },
  noticeBtn: { marginTop: 16, backgroundColor: "#0D0D0D", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  noticeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  loadingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  loadingText: { fontSize: 14, color: "#888" },

  body: { gap: 14 },

  heroCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  heroIconWrap: { width: 60, height: 60, borderRadius: 16, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroInfo: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  heroMeta: { fontSize: 13, color: "#888", marginTop: 3 },
  platePill: { backgroundColor: "#0D0D0D", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  plateText: { fontSize: 13, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },

  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#444" },
  badgePrimary: { backgroundColor: "#0D0D0D", borderColor: "#0D0D0D" },
  badgePrimaryText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  specsCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  specRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  specDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
  specLabel: { fontSize: 13, color: "#888", fontWeight: "500" },
  specValue: { fontSize: 14, color: "#1A1A1A", fontWeight: "700" },

  editBtn: { backgroundColor: "#0D0D0D", borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  editBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  deleteBtn: { backgroundColor: "#FFF1F0", borderRadius: 16, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#FCA5A5" },
  deleteBtnText: { fontSize: 15, fontWeight: "700", color: "#DC2626" },
});
