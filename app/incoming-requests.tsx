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
import { getIncomingRequests, IncomingRequest } from "../lib/match";
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

function statusStyle(status: string) {
  switch (status) {
    case "accepted": return { badge: { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }, text: { color: "#16A34A" }, label: "Accepted" };
    case "rejected": return { badge: { backgroundColor: "#FFF1F0", borderColor: "#FCA5A5" }, text: { color: "#DC2626" }, label: "Rejected" };
    case "cancelled": return { badge: { backgroundColor: "#F5F5F5", borderColor: "#D1D5DB" }, text: { color: "#6B7280" }, label: "Cancelled" };
    default: return { badge: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }, text: { color: "#D97706" }, label: "Pending" };
  }
}

function EmptyState() {
  return (
    <View style={em.wrap}>
      <View style={em.icon}><Text style={em.emoji}>📨</Text></View>
      <Text style={em.title}>No Pending Requests</Text>
      <Text style={em.sub}>When riders or drivers send you a ride request, they'll appear here for you to accept or decline.</Text>
    </View>
  );
}
const em = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 60 },
  icon: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFF9EC", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
});

export default function IncomingRequestsScreen() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getIncomingRequests("pending");
      setRequests(data);
    } catch (error) {
      console.warn("Failed to fetch incoming requests", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Incoming Requests</Text>
            {requests.length > 0 && <Text style={s.headerSub}>{requests.length} pending</Text>}
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
            {requests.map((req, idx) => {
              const partyName = req.other_party_name ?? "User";
              const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
              const safePath = req.other_party_avatar_url?.startsWith('/') ? req.other_party_avatar_url.substring(1) : req.other_party_avatar_url;
              const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
              const st = statusStyle(req.status);

              return (
                <TouchableOpacity
                  key={req.id ?? idx}
                  style={s.card}
                  onPress={() => router.push({ pathname: "/request-detail", params: { data: JSON.stringify(req) } })}
                  activeOpacity={0.85}
                >
                  {/* Card top */}
                  <View style={s.cardTop}>
                    <AvatarImage uri={avatarUri} initials={initials} size={52} />
                    <View style={s.personInfo}>
                      <Text style={s.personName}>{partyName}</Text>
                      <Text style={s.personMeta}>{formatDateTime(req.departure_time)}</Text>
                    </View>
                    <View style={[s.statusBadge, st.badge as any]}>
                      <Text style={[s.statusText, st.text as any]}>{st.label}</Text>
                    </View>
                  </View>

                  {/* Route */}
                  <View style={s.routeBox}>
                    <View style={s.routeRow}>
                      <View style={s.dotGreen} />
                      <Text style={s.routeAddr} numberOfLines={2}>{req.origin_address ?? "Unknown origin"}</Text>
                    </View>
                    <View style={s.routeConnector}>
                      <View style={s.routeLine} />
                    </View>
                    <View style={s.routeRow}>
                      <View style={s.dotRed} />
                      <Text style={s.routeAddr} numberOfLines={2}>{req.dest_address ?? "Unknown destination"}</Text>
                    </View>
                  </View>

                  <View style={s.cardFooter}>
                    <Text style={s.tapHint}>Tap to view details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 14 },

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
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },

  routeBox: { backgroundColor: "#FAFAFA", marginHorizontal: 16, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#F0F0F0" },
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeConnector: { paddingLeft: 4, paddingVertical: 3 },
  routeLine: { width: 1.5, height: 14, backgroundColor: "#D0D0D0", marginLeft: 3 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A", marginTop: 4, flexShrink: 0 },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", marginTop: 4, flexShrink: 0 },
  routeAddr: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600", lineHeight: 18 },

  cardFooter: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  tapHint: { fontSize: 12, color: "#AAAAAA", fontWeight: "500" },
});
