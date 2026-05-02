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
import Svg, { Path, Circle, Line } from "react-native-svg";
import { listActiveCommutes, ActiveCommute } from "../lib/rider";
import { API_BASE_URL } from "../lib/config";

function BackSvg() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function formatTicketDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTicketTime(value?: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

export default function ActiveCommutesScreen() {
  const [commutes, setCommutes] = useState<ActiveCommute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommutes();
  }, []);

  async function loadCommutes() {
    setLoading(true);
    try {
      const data = await listActiveCommutes();
      setCommutes(data);
    } catch (error) {
      console.warn("Failed to fetch active commutes", error);
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
          <Text style={s.headerTitle}>Active Commutes</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
          ) : commutes.length === 0 ? (
            <Text style={s.emptyStateText}>You don't have any active rides.</Text>
          ) : (
            commutes.map((commute, idx) => {
              const driverName = commute.driver_name ?? "Driver";
              const initials = driverName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
              const safePath = commute.driver_avatar_url?.startsWith('/') ? commute.driver_avatar_url.substring(1) : commute.driver_avatar_url;
              const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

              return (
                <View key={commute.match_request_id ?? idx} style={s.ticketContainer}>
                  {/* TICKET HEADER */}
                  <View style={s.ticketHeader}>
                    <View>
                      <Text style={s.ticketDate}>{formatTicketDate(commute.departure_time)}</Text>
                      <Text style={s.ticketTime}>{formatTicketTime(commute.departure_time)}</Text>
                    </View>
                    <View style={s.seatBadge}>
                      <Text style={s.seatBadgeText}>{commute.seats_reserved} Seat{commute.seats_reserved > 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {/* TICKET BODY (ROUTE) */}
                  <View style={s.ticketBody}>
                    <View style={s.routeTimeline}>
                      <View style={s.dotStart} />
                      <View style={s.verticalLine} />
                      <View style={s.dotEnd} />
                    </View>
                    <View style={s.routeTextContainer}>
                      <View style={s.routeNode}>
                        <Text style={s.routeLabel}>PICKUP</Text>
                        <Text style={s.routeValue}>{commute.origin_address ?? "Unknown"}</Text>
                      </View>
                      <View style={s.routeNodeEnd}>
                        <Text style={s.routeLabel}>DROPOFF</Text>
                        <Text style={s.routeValue}>{commute.dest_address ?? "Unknown"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* DOTTED SEPARATOR */}
                  <View style={s.ticketSeparator}>
                    <View style={s.cutoutLeft} />
                    <View style={s.dashedLineContainer}>
                      <Svg height="2" width="100%">
                        <Line stroke="#E0E0E0" strokeWidth="2" strokeDasharray="6, 6" x1="0" y1="1" x2="100%" y2="1" />
                      </Svg>
                    </View>
                    <View style={s.cutoutRight} />
                  </View>

                  {/* TICKET FOOTER */}
                  <View style={s.ticketFooter}>
                    <View style={s.driverSection}>
                      <AvatarImage 
                        uri={avatarUri} 
                        initials={initials} 
                        style={s.driverAvatar} 
                        textStyle={s.driverAvatarText} 
                      />
                      <View style={s.driverInfo}>
                        <Text style={s.driverName}>{driverName}</Text>
                        <Text style={s.driverRating}>⭐ {commute.driver_rating_avg.toFixed(1)} • Driver</Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={s.chatBtn}
                      onPress={() => {
                        if (commute.chat_id) {
                          router.push(`/chat/${commute.chat_id}`);
                        } else {
                          Alert.alert("Notice", "Chat is currently unavailable.");
                        }
                      }}
                    >
                      <ChatIcon />
                      <Text style={s.chatBtnText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F6F8" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#F4F6F8",
  },
  headerTitle: {
    fontSize: 20,
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
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 100,
    paddingTop: 10,
  },
  emptyStateText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 40,
    fontStyle: "italic",
  },
  
  // TICKET STYLING
  ticketContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
    overflow: "hidden", // So cutouts don't break boundaries if positioned outside
  },
  ticketHeader: {
    backgroundColor: "#0D0D0D",
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketDate: {
    color: "#A0A0A0",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ticketTime: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  seatBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seatBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  ticketBody: {
    padding: 20,
    flexDirection: "row",
  },
  routeTimeline: {
    alignItems: "center",
    marginRight: 16,
    marginTop: 6,
  },
  dotStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#2E7D32",
    backgroundColor: "#fff",
  },
  verticalLine: {
    width: 2,
    height: 40,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  dotEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D32F2F",
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  routeNode: {
    marginBottom: 24,
  },
  routeNodeEnd: {
    marginTop: 0,
  },
  routeLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "600",
  },

  ticketSeparator: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    height: 24,
  },
  dashedLineContainer: {
    flex: 1,
    height: 2,
    opacity: 0.5,
  },
  cutoutLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F4F6F8",
    marginLeft: -12,
  },
  cutoutRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F4F6F8",
    marginRight: -12,
  },

  ticketFooter: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  driverRating: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginTop: 2,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  chatBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
