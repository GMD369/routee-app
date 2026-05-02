import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    Animated,
    Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import React from "react";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import {
    getIncomingRequests,
    IncomingRequest
} from "../../lib/match";
import {
    listRecommendedRides,
    RideRecommendation,
} from "../../lib/recommendations";
import { listSavedLocationsSummary, SavedLocationPairSummary } from "../../lib/rider";
import { API_BASE_URL } from "../../lib/config";

function UserSvg() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

function MenuSvg() {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#0D0D0D"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M3 12h18M3 6h18M3 18h18" />
    </Svg>
  );
}

function CloseSvg() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 6L6 18M6 6l12 12" />
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

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [pairsSummary, setPairsSummary] = useState<SavedLocationPairSummary[]>([]);
  const [pairRecommendations, setPairRecommendations] = useState<Record<string, RideRecommendation[]>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState<Record<string, boolean>>({});

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-Dimensions.get("window").width)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSidebarOpen ? 0 : -Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isSidebarOpen]);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole !== "rider") {
        setPairsSummary([]);
        setPairRecommendations({});
        return;
      }

      setLoadingSummary(true);
      const summaries = await listSavedLocationsSummary();
      setPairsSummary(summaries);
    } catch (error) {
      Alert.alert("Home error", getApiErrorMessage(error));
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void hydrateHome();
    }, [hydrateHome])
  );

  useEffect(() => {
    let cancelled = false;
    if (pairsSummary.length === 0) return;

    async function fetchAllRecs() {
       setLoadingPairs(pairsSummary.reduce((acc, p) => ({...acc, [p.pair_id]: true}), {}));
       
       for (const pair of pairsSummary) {
          if (cancelled) break;
          try {
             const rides = await listRecommendedRides(pair.pair_id, 10);
             if (!cancelled) {
                setPairRecommendations(prev => ({...prev, [pair.pair_id]: rides}));
             }
          } catch {
             if (!cancelled) {
                setPairRecommendations(prev => ({...prev, [pair.pair_id]: []}));
             }
          } finally {
             if (!cancelled) {
                setLoadingPairs(prev => ({...prev, [pair.pair_id]: false}));
             }
          }
       }
    }

    void fetchAllRecs();

    return () => {
      cancelled = true;
    };
  }, [pairsSummary]);

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <TouchableOpacity
              style={s.menuBtn}
              onPress={() => setIsSidebarOpen(true)}
            >
              <MenuSvg />
            </TouchableOpacity>
            <View>
              <Text style={s.greeting}>Good morning 👋</Text>
              <Text style={s.appName}>Musafee</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.profileBtn}
            onPress={() => router.push(profileRoute)}
          >
            <UserSvg />
          </TouchableOpacity>
        </View>

        {!isDriver && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
             <Text style={s.mainHeading}>Recommended rides for your saved locations</Text>

             {loadingSummary ? (
                <ActivityIndicator color="#0D0D0D" style={{ marginTop: 20 }} />
             ) : pairsSummary.length === 0 ? (
                <Text style={s.emptyStateText}>You don't have any saved locations yet.</Text>
             ) : (
                pairsSummary.map(pair => {
                   const isLoading = loadingPairs[pair.pair_id];
                   const rides = pairRecommendations[pair.pair_id] || [];

                   return (
                      <View key={pair.pair_id} style={s.pairSection}>
                         <Text style={s.pairHeading}>
                           {pair.start_address || "Unknown"} → {pair.end_address || "Unknown"}
                         </Text>
                         
                         {isLoading ? (
                            <ActivityIndicator color="#0D0D0D" style={{ marginVertical: 10, alignSelf: "flex-start" }} />
                         ) : rides.length === 0 ? (
                            <Text style={s.noRidesText}>No recommendations found for this route.</Text>
                         ) : (
                            rides.map((ride, idx) => {
                               const driverName = ride.driver_full_name ?? "Driver";
                               const initials = driverName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
                               const pickup = ride.virtual_pickup_location ?? ride.origin_address;
                               const dropoff = ride.virtual_dropoff_location ?? ride.dest_address;
                               
                               const safePath = ride.driver_avatar_url?.startsWith('/') ? ride.driver_avatar_url.substring(1) : ride.driver_avatar_url;
                               const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

                               return (
                                  <TouchableOpacity 
                                     key={ride.id ?? idx} 
                                     style={s.recommendationCard}
                                     onPress={() => router.push({
                                        pathname: `/recommendation/${ride.id}`,
                                        params: { 
                                           data: JSON.stringify(ride),
                                           pairId: pair.pair_id
                                        }
                                     })}
                                  >
                                     <View style={s.driverRow}>
                                        <AvatarImage 
                                           uri={avatarUri} 
                                           initials={initials} 
                                           style={s.driverAvatar} 
                                           textStyle={s.driverAvatarText} 
                                        />
                                        <View style={s.driverInfo}>
                                           <Text style={s.driverName}>{driverName}</Text>
                                           <Text style={s.departureTime}>{formatDateTime(ride.departure_time)}</Text>
                                        </View>
                                     </View>

                                     <View style={s.cardDivider} />
                                     
                                     <View style={s.recommendationRouteWrap}>
                                        <Text style={s.recommendationRoute} numberOfLines={1}>{pickup}</Text>
                                        <View style={s.routeArrowRow}>
                                          <View style={s.routeDot} />
                                          <View style={s.routeLine} />
                                          <View style={s.routeArrowHead} />
                                        </View>
                                        <Text style={s.recommendationRouteDest} numberOfLines={1}>{dropoff}</Text>
                                     </View>
                                  </TouchableOpacity>
                               );
                            })
                         )}
                      </View>
                   );
                })
             )}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={isSidebarOpen} transparent={true} animationType="none">
        <View style={s.modalOverlay}>
          <TouchableOpacity 
            style={s.modalBackground} 
            activeOpacity={1} 
            onPress={() => setIsSidebarOpen(false)} 
          />
          <Animated.View style={[s.sidebarContainer, { left: 0, position: 'absolute', height: '100%', transform: [{ translateX: slideAnim }] }]}>
            <SafeAreaView style={s.sidebarSafeArea} edges={["top", "bottom"]}>
              <View style={s.sidebarHeader}>
                <Text style={s.sidebarTitle}>Menu</Text>
                <TouchableOpacity onPress={() => setIsSidebarOpen(false)} style={s.closeBtn}>
                  <CloseSvg />
                </TouchableOpacity>
              </View>
              
              <View style={s.sidebarMenu}>
                <TouchableOpacity 
                  style={s.menuItem}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.push("/incoming-requests");
                  }}
                >
                  <Text style={s.menuItemText}>Incoming Requests</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={s.menuItem}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.push("/sent-requests");
                  }}
                >
                  <Text style={s.menuItemText}>Sent Requests</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

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
  },
  greeting: { fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: "500" },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuBtn: {
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
  profileBtn: {
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
  modalOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sidebarContainer: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#F8F9FA",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarSafeArea: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  closeBtn: {
    padding: 4,
  },
  sidebarMenu: {
    padding: 16,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 100,
    paddingTop: 10,
  },
  mainHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  pairSection: {
    marginBottom: 32,
  },
  pairHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  noRidesText: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    marginTop: 4,
  },
  recommendationCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  driverInfo: { flex: 1, gap: 2 },
  driverName: { fontSize: 14, fontWeight: "700", color: "#1A1A1A" },
  departureTime: { fontSize: 12, color: "#6B6B6B", fontWeight: "600" },
  cardDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
    marginVertical: 14,
  },
  recommendationRouteWrap: { gap: 6 },
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
});
