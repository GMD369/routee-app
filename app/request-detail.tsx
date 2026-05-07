import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { API_BASE_URL } from "../lib/config";
import { IncomingRequest, acceptMatchRequest, rejectMatchRequest } from "../lib/match";
import { getDriverPreferences, DriverPreferences } from "../lib/driver";

function BackSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function ChatSvg() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = ["#6366F1","#F59E0B","#10B981","#EF4444","#3B82F6","#8B5CF6","#F97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarImage({ uri, initials, size = 64 }: { uri: string | null; initials: string; size?: number }) {
  const [error, setError] = useState(false);
  const bg = getAvatarColor(initials || "U");
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: error || !uri ? bg : "#DDD", alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };
  if (uri && !error) return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />;
  return <View style={style}><Text style={{ fontSize: size * 0.36, fontWeight: "800", color: "#fff" }}>{initials}</Text></View>;
}

function statusConfig(status: string) {
  switch (status) {
    case "accepted": return { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A", label: "Accepted" };
    case "rejected": return { bg: "#FFF1F0", border: "#FCA5A5", color: "#DC2626", label: "Rejected" };
    case "cancelled": return { bg: "#F5F5F5", border: "#D1D5DB", color: "#6B7280", label: "Cancelled" };
    default: return { bg: "#FFFBEB", border: "#FCD34D", color: "#D97706", label: "Pending" };
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function PrefItem({ icon, label, value, positive }: { icon: string; label: string; value: string; positive: boolean }) {
  return (
    <View style={s.prefItem}>
      <Text style={s.prefIcon}>{icon}</Text>
      <View style={s.prefBody}>
        <Text style={s.prefLabel}>{label}</Text>
        <Text style={[s.prefValue, positive ? s.prefPositive : s.prefNegative]}>{value}</Text>
      </View>
    </View>
  );
}

/* ── Confirm-cancel dialog ──────────────────────────────────── */

function ConfirmModal({ visible, title, message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  visible: boolean; title: string; message: string; confirmLabel: string; confirmColor: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dlg.overlay}>
        <View style={dlg.box}>
          <Text style={dlg.title}>{title}</Text>
          <Text style={dlg.message}>{message}</Text>
          <View style={dlg.row}>
            <TouchableOpacity style={dlg.cancelBtn} onPress={onCancel}>
              <Text style={dlg.cancelText}>Keep</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[dlg.confirmBtn, { backgroundColor: confirmColor }]} onPress={onConfirm}>
              <Text style={dlg.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dlg = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  message: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 24 },
  row: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: "#F5F5F5" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#333" },
  confirmBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});

/* ── Screen ─────────────────────────────────────────────────── */

export default function RequestDetailScreen() {
  const params = useLocalSearchParams();
  let initialRequest: IncomingRequest | null = null;
  try { if (params.data) initialRequest = JSON.parse(params.data as string); } catch {}

  const [request, setRequest] = useState<IncomingRequest | null>(initialRequest);
  const [driverPrefs, setDriverPrefs] = useState<DriverPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (!request?.driver_id || request.my_role !== 'rider') return;
    setLoadingPrefs(true);
    getDriverPreferences(request.driver_id)
      .then(setDriverPrefs)
      .catch(e => console.warn("Failed to load driver prefs", e))
      .finally(() => setLoadingPrefs(false));
  }, [request?.driver_id, request?.my_role]);

  if (!request) {
    return <SafeAreaView style={s.root}><ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} /></SafeAreaView>;
  }

  const partyName = request.other_party_name || "User";
  const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const safePath = request.other_party_avatar_url?.startsWith('/') ? request.other_party_avatar_url.substring(1) : request.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
  const isIncoming = request.initiator !== request.my_role;
  const sc = statusConfig(request.status);
  const roleLabel = request.my_role === 'driver' ? 'Rider' : 'Driver';

  const doAccept = async () => {
    if (!request?.id) return;
    setSubmitting(true);
    try {
      await acceptMatchRequest(request.id);
      setRequest(prev => prev ? { ...prev, status: "accepted" } : prev);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept request.");
    } finally {
      setSubmitting(false);
    }
  };

  const doReject = async () => {
    if (!request?.id) return;
    setShowRejectModal(false);
    setSubmitting(true);
    try {
      await rejectMatchRequest(request.id);
      setRequest(prev => prev ? { ...prev, status: "rejected" } : prev);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject request.");
    } finally {
      setSubmitting(false);
    }
  };

  const doCancel = async () => {
    if (!request?.id) return;
    setShowCancelModal(false);
    setSubmitting(true);
    try {
      const { cancelMatchRequest } = await import("../lib/match");
      await cancelMatchRequest(request.id);
      setRequest(prev => prev ? { ...prev, status: "cancelled" } : prev);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to cancel request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><BackSvg /></TouchableOpacity>
          <Text style={s.headerTitle}>Request Detail</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Profile hero */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <AvatarImage uri={avatarUri} initials={initials} size={72} />
              <View style={s.heroInfo}>
                <Text style={s.heroName}>{partyName}</Text>
                <Text style={s.heroRole}>{roleLabel}</Text>
                <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                  <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
                </View>
              </View>
            </View>

            {/* Route visualization */}
            <View style={s.routeCard}>
              <View style={s.routeRow}>
                <View style={s.rDotGreen} />
                <View style={s.routeTextWrap}>
                  <Text style={s.routeLabel}>FROM</Text>
                  <Text style={s.routeAddr} numberOfLines={2}>{request.origin_address || "Unknown"}</Text>
                </View>
              </View>
              <View style={s.routeMiddle}>
                <View style={s.routeLineV} />
                {request.price_per_seat != null && (
                  <View style={s.pricePill}><Text style={s.priceText}>PKR {request.price_per_seat}</Text><Text style={s.priceSub}>/seat</Text></View>
                )}
              </View>
              <View style={s.routeRow}>
                <View style={s.rDotRed} />
                <View style={s.routeTextWrap}>
                  <Text style={s.routeLabel}>TO</Text>
                  <Text style={s.routeAddr} numberOfLines={2}>{request.dest_address || "Unknown"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Ride details */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ride Details</Text>
            <InfoRow label="Departure" value={formatDateTime(request.departure_time)} />
            <View style={s.divider} />
            <InfoRow label="Gender Preference" value={request.gender_pref ? request.gender_pref.charAt(0).toUpperCase() + request.gender_pref.slice(1) : "Any"} />
          </View>

          {/* Driver preferences */}
          {loadingPrefs && <ActivityIndicator color="#0D0D0D" style={{ marginBottom: 16 }} />}
          {driverPrefs && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Driver Preferences</Text>
              <View style={s.prefGrid}>
                <PrefItem icon="🎵" label="Music" value={driverPrefs.music ? "Allowed" : "No music"} positive={!!driverPrefs.music} />
                <PrefItem icon="🚬" label="Smoking" value={driverPrefs.smoking ? "Permitted" : "No smoking"} positive={!driverPrefs.smoking} />
                <PrefItem icon="🐾" label="Pets" value={driverPrefs.pets ? "Allowed" : "No pets"} positive={!!driverPrefs.pets} />
                <PrefItem icon="❄️" label="AC" value={driverPrefs.ac ? "Available" : "No AC"} positive={!!driverPrefs.ac} />
                <PrefItem icon="💬" label="Chat" value={driverPrefs.talking ? "Open to talk" : "Quiet ride"} positive={!!driverPrefs.talking} />
              </View>
            </View>
          )}

          <View style={{ height: 160 }} />
        </ScrollView>

        {/* Footer actions */}
        <View style={s.footer}>
          <TouchableOpacity
            style={s.chatBtn}
            onPress={() => request.chat_id && router.push(`/chat/${request.chat_id}`)}
          >
            <ChatSvg />
            <Text style={s.chatBtnText}>Open Chat</Text>
          </TouchableOpacity>

          {isIncoming && request.status === "pending" && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.rejectBtn, submitting && s.btnOff]}
                onPress={() => setShowRejectModal(true)}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={s.rejectText}>Decline</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.acceptBtn, submitting && s.btnOff]}
                onPress={doAccept}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.acceptText}>Accept</Text>}
              </TouchableOpacity>
            </View>
          )}

          {!isIncoming && request.status === "pending" && (
            <TouchableOpacity
              style={[s.cancelBtn, submitting && s.btnOff]}
              onPress={() => setShowCancelModal(true)}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={s.cancelText}>Cancel Request</Text>}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ConfirmModal
        visible={showRejectModal}
        title="Decline this request?"
        message={`${partyName} will be notified that you've declined their ride request.`}
        confirmLabel="Decline"
        confirmColor="#DC2626"
        onConfirm={doReject}
        onCancel={() => setShowRejectModal(false)}
      />

      <ConfirmModal
        visible={showCancelModal}
        title="Cancel your request?"
        message="This will cancel your ride request. The driver will be notified."
        confirmLabel="Yes, Cancel"
        confirmColor="#DC2626"
        onConfirm={doCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14,
    backgroundColor: "#F8F9FA",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#EBEBEB",
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 20 },

  heroCard: {
    backgroundColor: "#fff", borderRadius: 22, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  heroTop: { flexDirection: "row", gap: 14, marginBottom: 20 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.3 },
  heroRole: { fontSize: 13, color: "#888", fontWeight: "500" },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },

  routeCard: { backgroundColor: "#F8F9FA", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EBEBEB" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  rDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#16A34A", marginTop: 14, flexShrink: 0 },
  rDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#DC2626", marginTop: 14, flexShrink: 0 },
  routeTextWrap: { flex: 1 },
  routeLabel: { fontSize: 10, fontWeight: "700", color: "#A0A0A0", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  routeAddr: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", lineHeight: 20 },
  routeMiddle: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 5, paddingVertical: 6 },
  routeLineV: { width: 1.5, height: 28, backgroundColor: "#D0D0D0", marginLeft: -0.5 },
  pricePill: { flexDirection: "row", alignItems: "baseline", gap: 2, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  priceText: { fontSize: 15, fontWeight: "800", color: "#1A1A1A" },
  priceSub: { fontSize: 11, color: "#888", fontWeight: "500" },

  section: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#F5F5F5", marginVertical: 14 },
  infoRow: { gap: 4 },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#AAAAAA", textTransform: "uppercase", letterSpacing: 0.6 },
  infoValue: { fontSize: 15, color: "#1A1A1A", fontWeight: "600" },

  prefGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  prefItem: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#F8F9FA", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#EBEBEB", width: "47%" },
  prefIcon: { fontSize: 20 },
  prefBody: { flex: 1 },
  prefLabel: { fontSize: 11, color: "#888", fontWeight: "600" },
  prefValue: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  prefPositive: { color: "#16A34A" },
  prefNegative: { color: "#DC2626" },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EBEBEB",
    gap: 10,
  },
  chatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F5F5F5", borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  chatBtnText: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  actionRow: { flexDirection: "row", gap: 12 },
  rejectBtn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: "center", backgroundColor: "#FFF1F0", borderWidth: 1, borderColor: "#FCA5A5" },
  rejectText: { color: "#DC2626", fontSize: 15, fontWeight: "800" },
  acceptBtn: { flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: "center", backgroundColor: "#0D0D0D" },
  acceptText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  cancelBtn: { borderRadius: 16, paddingVertical: 15, alignItems: "center", backgroundColor: "#FFF1F0", borderWidth: 1, borderColor: "#FCA5A5" },
  cancelText: { color: "#DC2626", fontSize: 15, fontWeight: "800" },
  btnOff: { opacity: 0.5 },
});
