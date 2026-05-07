import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { getSentRequests, IncomingRequest } from "../lib/match";
import { API_BASE_URL } from "../lib/config";

function BackSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const AVATAR_COLORS = ["#6366F1","#F59E0B","#10B981","#EF4444","#3B82F6","#8B5CF6","#F97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarImage({ uri, initials, size = 52 }: { uri: string | null; initials: string; size?: number }) {
  const [error, setError] = useState(false);
  const bg = getAvatarColor(initials || "U");
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: error || !uri ? bg : "#DDD", alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };
  if (uri && !error) return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />;
  return <View style={style}><Text style={{ fontSize: size * 0.36, fontWeight: "800", color: "#fff" }}>{initials}</Text></View>;
}

function statusConfig(status: string) {
  switch (status) {
    case "accepted": return { bg: "#F0FDF4", border: "#86EFAC", color: "#16A34A", label: "✓ Accepted", emoji: "✅" };
    case "rejected": return { bg: "#FFF1F0", border: "#FCA5A5", color: "#DC2626", label: "✕ Rejected", emoji: "❌" };
    case "cancelled": return { bg: "#F5F5F5", border: "#D1D5DB", color: "#6B7280", label: "Cancelled", emoji: "⛔" };
    default: return { bg: "#FFFBEB", border: "#FCD34D", color: "#D97706", label: "Pending", emoji: "⏳" };
  }
}

function EmptyState() {
  return (
    <View style={em.wrap}>
      <View style={em.icon}><Text style={em.emoji}>📤</Text></View>
      <Text style={em.title}>No Requests Sent</Text>
      <Text style={em.sub}>Ride requests you send to drivers will appear here. Browse recommended rides on the Home tab to get started.</Text>
      <TouchableOpacity style={em.btn} onPress={() => router.push("/(tabs)")}>
        <Text style={em.btnText}>Browse Rides</Text>
      </TouchableOpacity>
    </View>
  );
}
const em = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 60 },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F4FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  btn: { backgroundColor: "#0D0D0D", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default function SentRequestsScreen() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getSentRequests();
      setRequests(data);
    } catch (error) {
      console.warn("Failed to fetch sent requests", error);
    } finally {
      setLoading(false);
    }
  }

  // Group by status for better UX
  const pending = requests.filter(r => r.status === "pending");
  const others = requests.filter(r => r.status !== "pending");

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Sent Requests</Text>
            {requests.length > 0 && <Text style={s.headerSub}>{requests.length} total · {pending.length} pending</Text>}
          </View>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#0D0D0D" />
          </View>
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {pending.length > 0 && <Text style={s.groupLabel}>AWAITING RESPONSE</Text>}
            {pending.map((req, idx) => <RequestCard key={req.id ?? idx} req={req} />)}
            {others.length > 0 && <Text style={[s.groupLabel, { marginTop: 10 }]}>PAST REQUESTS</Text>}
            {others.map((req, idx) => <RequestCard key={req.id ?? idx} req={req} />)}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function RequestCard({ req }: { req: IncomingRequest }) {
  const partyName = req.other_party_name ?? "User";
  const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const safePath = req.other_party_avatar_url?.startsWith('/') ? req.other_party_avatar_url.substring(1) : req.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
  const sc = statusConfig(req.status);

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push({ pathname: '/request-detail', params: { data: JSON.stringify(req) } })}
      activeOpacity={0.85}
    >
      <View style={s.cardTop}>
        <AvatarImage uri={avatarUri} initials={initials} size={52} />
        <View style={s.personInfo}>
          <Text style={s.personName}>{partyName}</Text>
          <Text style={s.personMeta}>{formatDateTime(req.departure_time)}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[s.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>
      </View>

      <View style={s.routeBox}>
        <View style={s.routeRow}>
          <View style={s.dotGreen} />
          <Text style={s.routeAddr} numberOfLines={2}>{req.origin_address ?? "Unknown origin"}</Text>
        </View>
        <View style={s.routeConnector}><View style={s.routeLine} /></View>
        <View style={s.routeRow}>
          <View style={s.dotRed} />
          <Text style={s.routeAddr} numberOfLines={2}>{req.dest_address ?? "Unknown destination"}</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        {req.price_per_seat != null && (
          <View style={s.pricePill}><Text style={s.priceText}>PKR {req.price_per_seat}/seat</Text></View>
        )}
        <Text style={s.tapHint}>View details →</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14,
    backgroundColor: "#F8F9FA", borderBottomWidth: 1, borderBottomColor: "#EBEBEB",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", textAlign: "center" },
  headerSub: { fontSize: 12, color: "#888", textAlign: "center", marginTop: 2, fontWeight: "500" },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, gap: 12 },
  groupLabel: { fontSize: 11, fontWeight: "700", color: "#A0A0A0", letterSpacing: 1, textTransform: "uppercase", paddingVertical: 4 },

  card: {
    backgroundColor: "#fff", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12 },
  personInfo: { flex: 1, gap: 3 },
  personName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  personMeta: { fontSize: 12, color: "#888", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "700" },

  routeBox: { backgroundColor: "#FAFAFA", marginHorizontal: 16, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F0F0F0" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeConnector: { paddingLeft: 4, paddingVertical: 3 },
  routeLine: { width: 1.5, height: 14, backgroundColor: "#D0D0D0", marginLeft: 3 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A", marginTop: 4, flexShrink: 0 },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", marginTop: 4, flexShrink: 0 },
  routeAddr: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600", lineHeight: 18 },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  pricePill: { backgroundColor: "#F5F5F5", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  priceText: { fontSize: 12, fontWeight: "700", color: "#333" },
  tapHint: { fontSize: 12, color: "#AAAAAA", fontWeight: "500" },
});
