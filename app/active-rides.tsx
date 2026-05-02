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
import Svg, { Path, Line } from "react-native-svg";
import { listDriverActiveRides, DriverActiveRide } from "../lib/rider";
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
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function formatTicketDate(value?: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
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

export default function ActiveRidesScreen() {
  const [rides, setRides] = useState<DriverActiveRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRides();
  }, []);

  async function loadRides() {
    setLoading(true);
    try {
      const data = await listDriverActiveRides();
      setRides(data);
    } catch (error) {
      console.warn("Failed to fetch active rides", error);
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
          <Text style={s.headerTitle}>Active Rides</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
          ) : rides.length === 0 ? (
            <Text style={s.emptyStateText}>No active rides with passengers yet.</Text>
          ) : (
            rides.map((ride, idx) => {
              return (
                <View key={ride.ride_id ?? idx} style={s.ticketContainer}>
                  {/* TICKET HEADER */}
                  <View style={s.ticketHeader}>
                    <View>
                      <Text style={s.ticketDate}>{formatTicketDate(ride.departure_time)}</Text>
                      <Text style={s.ticketTime}>{formatTicketTime(ride.departure_time)}</Text>
                    </View>
                    <View style={s.rideStatusBadge}>
                       <Text style={s.rideStatusText}>{ride.ride_status}</Text>
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
                        <Text style={s.routeLabel}>FROM</Text>
                        <Text style={s.routeValue} numberOfLines={1}>{ride.origin_address ?? "Unknown"}</Text>
                      </View>
                      <View style={s.routeNodeEnd}>
                        <Text style={s.routeLabel}>TO</Text>
                        <Text style={s.routeValue} numberOfLines={1}>{ride.dest_address ?? "Unknown"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* PASSENGER SECTION TITLE */}
                  <View style={s.passengerHeader}>
                     <Text style={s.passengerTitle}>PASSENGERS ({ride.passengers.length})</Text>
                     <Text style={s.seatInfo}>{ride.available_seats} / {ride.total_seats} Seats Left</Text>
                  </View>

                  {/* PASSENGERS LIST */}
                  <View style={s.passengerList}>
                    {ride.passengers.map((p, pIdx) => {
                       const riderName = p.rider_name ?? "Rider";
                       const initials = riderName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
                       const safePath = p.rider_avatar_url?.startsWith('/') ? p.rider_avatar_url.substring(1) : p.rider_avatar_url;
                       const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

                       return (
                         <View key={p.match_request_id ?? pIdx} style={s.passengerRow}>
                            <AvatarImage 
                              uri={avatarUri} 
                              initials={initials} 
                              style={s.riderAvatar} 
                              textStyle={s.riderAvatarText} 
                            />
                            <View style={s.riderInfo}>
                               <Text style={s.riderName}>{riderName}</Text>
                               <Text style={s.riderRating}>⭐ {p.rider_rating_avg.toFixed(1)} • {p.seats_reserved} Seat{p.seats_reserved > 1 ? 's' : ''}</Text>
                            </View>
                            <TouchableOpacity 
                               style={s.miniChatBtn}
                               onPress={() => p.chat_id && router.push(`/chat/${p.chat_id}`)}
                            >
                               <ChatIcon />
                            </TouchableOpacity>
                         </View>
                       );
                    })}
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
  ticketContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EBEBEB",
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
    marginBottom: 4,
  },
  ticketTime: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  rideStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rideStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  ticketBody: {
    padding: 20,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  routeTimeline: {
    alignItems: "center",
    marginRight: 16,
    marginTop: 4,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#2E7D32",
    backgroundColor: "#fff",
  },
  verticalLine: {
    width: 2,
    height: 30,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D32F2F",
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  routeNode: {
    marginBottom: 16,
  },
  routeNodeEnd: {},
  routeLabel: {
    fontSize: 10,
    color: "#999",
    fontWeight: "800",
    marginBottom: 2,
  },
  routeValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  passengerHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passengerTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A0A0A0",
    letterSpacing: 0.5,
  },
  seatInfo: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
  },
  passengerList: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  riderAvatarText: { fontSize: 14, fontWeight: "800", color: "#666" },
  riderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  riderRating: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginTop: 2,
  },
  miniChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
});
