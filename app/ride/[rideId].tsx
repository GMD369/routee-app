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
import { cancelRide, deleteRide, getMyRide, RideResponse } from "../../lib/ride";

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusConfig(status: string) {
  switch (status) {
    case "active": return { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A", label: "Active" };
    case "completed": return { bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB", label: "Completed" };
    case "cancelled": return { bg: "#FFF1F0", border: "#FCA5A5", color: "#DC2626", label: "Cancelled" };
    default: return { bg: "#F5F5F5", border: "#D1D5DB", color: "#6B7280", label: status };
  }
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoPill}>
      <Text style={s.infoPillLabel}>{label}</Text>
      <Text style={s.infoPillValue}>{value}</Text>
    </View>
  );
}

function ConfirmModal({
  visible, title, message, confirmLabel, confirmColor, onConfirm, onCancel, loading,
}: {
  visible: boolean; title: string; message: string; confirmLabel: string;
  confirmColor: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!visible) return null;
  return (
    <View style={m.overlay}>
      <View style={m.sheet}>
        <Text style={m.title}>{title}</Text>
        <Text style={m.message}>{message}</Text>
        <View style={m.btns}>
          <TouchableOpacity style={m.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={m.cancelTxt}>Keep Ride</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[m.confirmBtn, { backgroundColor: confirmColor }]} onPress={onConfirm} disabled={loading}>
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
  confirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  confirmTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default function RideDetailScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const rideId = Array.isArray(params.rideId) ? params.rideId[0] : params.rideId;

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [role, setRole] = useState<"driver" | "rider" | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [ride, setRide] = useState<RideResponse | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const hydrateRide = useCallback(async () => {
    if (!rideId) { router.back(); return; }
    setLoading(true);
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
      if (currentRole !== "driver") { setVerificationStatus(null); setRide(null); return; }
      const driverProfile = await getMyDriverProfile();
      setVerificationStatus(driverProfile.verification_status);
      if (driverProfile.verification_status !== "verified") { setRide(null); return; }
      const data = await getMyRide(rideId);
      setRide(data);
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useFocusEffect(useCallback(() => { void hydrateRide(); }, [hydrateRide]));

  const canCancel = !!ride && !["completed", "cancelled"].includes(ride.status);

  async function doCancel() {
    if (!ride || !canCancel) return;
    setCancelling(true);
    try {
      const updated = await cancelRide(ride.id);
      setRide(updated);
      setShowCancelModal(false);
    } catch (error) {
      Alert.alert("Cancel error", getApiErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  }

  async function doDelete() {
    if (!ride) return;
    setDeleting(true);
    try {
      await deleteRide(ride.id);
      setShowDeleteModal(false);
      router.back();
    } catch (error) {
      Alert.alert("Delete error", getApiErrorMessage(error));
      setDeleting(false);
    }
  }

  const isDriver = role === "driver";
  const isVerifiedDriver = verificationStatus === "verified";

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Cancel modal */}
      <ConfirmModal
        visible={showCancelModal}
        title="Cancel this ride?"
        message="Riders who requested to join will be notified. This action cannot be undone."
        confirmLabel="Cancel Ride"
        confirmColor="#DC2626"
        onConfirm={doCancel}
        onCancel={() => setShowCancelModal(false)}
        loading={cancelling}
      />
      {/* Delete modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Permanently delete?"
        message="This will remove your ride and all associated requests. This cannot be undone."
        confirmLabel="Delete"
        confirmColor="#991B1B"
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
          <Text style={s.pageTitle}>Ride Details</Text>
        </View>

        {!isDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Driver accounts only</Text>
            <Text style={s.noticeSub}>Sign in with a driver account to view ride details.</Text>
          </View>
        ) : !isVerifiedDriver ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Verification required</Text>
            <Text style={s.noticeSub}>Complete driver verification to view ride details.</Text>
            <TouchableOpacity style={s.noticeBtn} onPress={() => router.push("/driver-verification")}>
              <Text style={s.noticeBtnText}>Go to Verification</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={s.loadingCard}>
            <ActivityIndicator color="#0D0D0D" />
            <Text style={s.loadingText}>Loading ride…</Text>
          </View>
        ) : !ride ? (
          <View style={s.noticeCard}>
            <Text style={s.noticeTitle}>Ride not found</Text>
            <Text style={s.noticeSub}>This ride may have been removed.</Text>
          </View>
        ) : (() => {
          const sc = statusConfig(ride.status);
          return (
            <View style={s.body}>
              {/* Route card */}
              <View style={s.routeCard}>
                <View style={s.routeRow}>
                  <View style={s.dotGreen} />
                  <Text style={s.routeAddr} numberOfLines={2}>{ride.origin_address || "Origin"}</Text>
                </View>
                <View style={s.connector}><View style={s.connLine} /></View>
                <View style={s.routeRow}>
                  <View style={s.dotRed} />
                  <Text style={s.routeAddr} numberOfLines={2}>{ride.dest_address || "Destination"}</Text>
                </View>
                <View style={s.routeDivider} />
                <Text style={s.depTime}>🕐 {formatDateTime(ride.departure_time)}</Text>
              </View>

              {/* Info pills row */}
              <View style={s.pillsRow}>
                <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                  <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
                <View style={s.priceBadge}>
                  <Text style={s.priceText}>PKR {ride.price_per_seat}/seat</Text>
                </View>
                <View style={s.seatBadge}>
                  <Text style={s.seatText}>💺 {ride.available_seats}/{ride.total_seats}</Text>
                </View>
              </View>

              {/* Details card */}
              <View style={s.detailCard}>
                <InfoPill label="Gender Preference" value={ride.gender_pref || "Any"} />
                <View style={s.detailDivider} />
                <InfoPill label="Recurring" value={ride.is_recurring ? "Yes" : "No"} />
              </View>

              {/* Actions */}
              {canCancel && (
                <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCancelModal(true)} disabled={cancelling}>
                  <Text style={s.cancelBtnText}>Cancel Ride</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteModal(true)} disabled={deleting}>
                <Text style={s.deleteBtnText}>Delete Ride</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
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

  routeCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  connector: { paddingLeft: 3, paddingVertical: 4 },
  connLine: { width: 1.5, height: 18, backgroundColor: "#D0D0D0", marginLeft: 3 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#16A34A", marginTop: 3, flexShrink: 0 },
  dotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#DC2626", marginTop: 3, flexShrink: 0 },
  routeAddr: { flex: 1, fontSize: 14, color: "#1A1A1A", fontWeight: "600", lineHeight: 20 },
  routeDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 14 },
  depTime: { fontSize: 13, color: "#666", fontWeight: "500" },

  pillsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  priceBadge: { backgroundColor: "#0D0D0D", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  priceText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  seatBadge: { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  seatText: { fontSize: 12, fontWeight: "600", color: "#444" },

  detailCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  detailDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 14 },

  infoPill: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoPillLabel: { fontSize: 13, color: "#888", fontWeight: "500" },
  infoPillValue: { fontSize: 14, color: "#1A1A1A", fontWeight: "700" },

  cancelBtn: { backgroundColor: "#FFF1F0", borderRadius: 16, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: "#FCA5A5" },
  cancelBtnText: { fontSize: 15, fontWeight: "700", color: "#DC2626" },

  deleteBtn: { backgroundColor: "#1A1A1A", borderRadius: 16, paddingVertical: 15, alignItems: "center" },
  deleteBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
