import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { getIncomingRequests, IncomingRequest } from "../lib/match";
import { API_BASE_URL } from "../lib/config";

function BackSvg() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function AvatarImage({ uri, initials, style, textStyle }: { uri: string | null; initials: string; style: any; textStyle: any }) {
  const [error, setError] = useState(false);

  if (uri && !error) {
    return (
      <Image
        source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }}
        style={style}
        onError={() => setError(true)}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={style}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
}

export default function IncomingRequestsScreen() {
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    loadIncomingRequests();
  }, []);

  async function loadIncomingRequests() {
    setLoadingRequests(true);
    try {
      const data = await getIncomingRequests("pending");
      setIncomingRequests(data);
    } catch (error) {
      console.warn("Failed to fetch incoming requests", error);
    } finally {
      setLoadingRequests(false);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Incoming Requests</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {loadingRequests ? (
            <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
          ) : incomingRequests.length === 0 ? (
            <Text style={s.emptyStateText}>No pending requests right now.</Text>
          ) : (
            incomingRequests.map((req, idx) => {
              const partyName = req.other_party_name ?? "User";
              const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
              const safePath = req.other_party_avatar_url?.startsWith('/') ? req.other_party_avatar_url.substring(1) : req.other_party_avatar_url;
              const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

              return (
                <TouchableOpacity 
                  key={req.id ?? idx} 
                  style={s.recommendationCard}
                  onPress={() => {
                    router.push({
                      pathname: "/request-detail",
                      params: { data: JSON.stringify(req) }
                    });
                  }}
                >
                  <View style={s.cardHeader}>
                    <AvatarImage 
                      uri={avatarUri} 
                      initials={initials} 
                      style={s.driverAvatar} 
                      textStyle={s.driverAvatarText} 
                    />
                    <View style={s.driverInfo}>
                      <Text style={s.driverName}>{partyName}</Text>
                      <Text style={s.departureTime}>{formatDateTime(req.departure_time)}</Text>
                    </View>
                  </View>

                  <View style={s.cardBody}>
                    <View style={s.recommendationRouteWrap}>
                      <View style={s.routeTimeline}>
                         <View style={s.dotStart} />
                         <View style={s.verticalLine} />
                         <View style={s.dotEnd} />
                      </View>
                      <View style={s.routeTextContainer}>
                         <Text style={s.routeValue} numberOfLines={1}>{req.origin_address ?? "Unknown Origin"}</Text>
                         <Text style={s.routeValue} numberOfLines={1}>{req.dest_address ?? "Unknown Destination"}</Text>
                      </View>
                    </View>

                    {req.status === 'cancelled' && (
                      <View style={s.cancelledBadge}>
                        <Text style={s.cancelledText}>Request Cancelled</Text>
                      </View>
                    )}
                    {req.status === 'rejected' && (
                      <View style={s.cancelledBadge}>
                        <Text style={s.cancelledText}>Request Rejected</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  iconBtn: {
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
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 100,
    paddingTop: 20,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  recommendationCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
    padding: 16,
    gap: 12,
  },
  cardBody: {
    padding: 16,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  driverInfo: { flex: 1, gap: 2 },
  driverName: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  departureTime: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  cardDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
    marginVertical: 14,
  },
  recommendationRouteWrap: { flexDirection: "row", gap: 12 },
  routeTimeline: {
    alignItems: "center",
    marginTop: 4,
  },
  dotStart: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#2E7D32",
    backgroundColor: "#fff",
  },
  verticalLine: {
    width: 2,
    height: 20,
    backgroundColor: "#F0F0F0",
    marginVertical: 2,
  },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D32F2F",
  },
  routeTextContainer: {
    flex: 1,
    gap: 12,
  },
  routeValue: {
    fontSize: 13,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  recommendationRoute: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  recommendationRouteDest: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  routeArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingLeft: 4,
  },
  routeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#BDBDBD",
  },
  routeLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0", maxWidth: 40 },
  routeArrowHead: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#BDBDBD",
  },
  cancelledBadge: {
    marginTop: 14,
    backgroundColor: "#FFECEC",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  cancelledText: {
    color: "#D32F2F",
    fontSize: 12,
    fontWeight: "700",
  },
});
