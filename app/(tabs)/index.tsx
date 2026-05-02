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
    listRecommendedRiders,
    RiderRecommendation,
} from "../../lib/recommendations";
import { listSavedLocationsSummary, SavedLocationPairSummary } from "../../lib/rider";
import { API_BASE_URL } from "../../lib/config";
import { listMyRides, RideResponse } from "../../lib/ride";

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
  
  // Driver state
  const [driverRides, setDriverRides] = useState<RideResponse[]>([]);
  const [loadingDriverRides, setLoadingDriverRides] = useState(false);
  const [riderRecommendations, setRiderRecommendations] = useState<Record<string, RiderRecommendation[]>>({});
  const [loadingRiders, setLoadingRiders] = useState<Record<string, boolean>>({});

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

      if (currentRole === "driver") {
        setLoadingDriverRides(true);
        try {
          const rides = await listMyRides();
          setDriverRides(rides);
        } catch (error) {
          Alert.alert("Error loading rides", getApiErrorMessage(error));
        } finally {
          setLoadingDriverRides(false);
        }
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

  // Fetch recommended riders for all driver rides
  useEffect(() => {
    let cancelled = false;
    if (driverRides.length === 0) return;

    async function fetchAllRiders() {
       setLoadingRiders(driverRides.reduce((acc, r) => ({...acc, [r.id]: true}), {}));
       
       for (const ride of driverRides) {
          if (cancelled) break;
          try {
             const riders = await listRecommendedRiders(ride.id, 10);
             if (!cancelled) {
                setRiderRecommendations(prev => ({...prev, [ride.id]: riders}));
             }
          } catch {
             if (!cancelled) {
                setRiderRecommendations(prev => ({...prev, [ride.id]: []}));
             }
          } finally {
             if (!cancelled) {
                setLoadingRiders(prev => ({...prev, [ride.id]: false}));
             }
          }
       }
    }

    void fetchAllRiders();

    return () => {
      cancelled = true;
    };
  }, [driverRides]);

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

        {isDriver && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.mainHeading}>Recommended riders for your active rides</Text>

            {loadingDriverRides ? (
              <ActivityIndicator color="#0D0D0D" style={{ marginTop: 20 }} />
            ) : driverRides.length === 0 ? (
              <Text style={s.emptyStateText}>You don't have any active posted rides yet.</Text>
            ) : (
              driverRides.map((ride, idx) => {
                const isLoadingRiders = loadingRiders[ride.id];
                const riders = riderRecommendations[ride.id] || [];

                return (
                  <View key={ride.id ?? idx} style={s.pairSection}>
                    <Text style={s.pairHeading}>
                      {ride.origin_address || "Unknown"} → {ride.dest_address || "Unknown"}
                    </Text>

                    {isLoadingRiders ? (
                      <ActivityIndicator color="#0D0D0D" style={{ marginVertical: 10, alignSelf: "flex-start" }} />
                    ) : riders.length === 0 ? (
                      <Text style={s.noRidesText}>No recommended riders found for this route.</Text>
                    ) : (
                      riders.map((rider, rIdx) => {
                         const riderName = rider.full_name ?? "Rider";
                         const initials = riderName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
                         const pickup = rider.virtual_pickup_location ?? "Unknown";
                         const dropoff = rider.virtual_dropoff_location ?? "Unknown";
                         
                         const safePath = rider.avatar_url?.startsWith('/') ? rider.avatar_url.substring(1) : rider.avatar_url;
                         const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

                         const matchPercent = Math.round((rider.match_score || 0) * 100);

                         return (
                            <TouchableOpacity 
                               key={rider.rider_id ?? rIdx} 
                               style={s.recommendationCard}
                               onPress={() => router.push({
                                  pathname: `/rider-recommendation/${rider.rider_id}`,
                                  params: { rideId: ride.id, data: JSON.stringify(rider) }
                               })}
                            >
                               <View style={s.cardHeader}>
                                  <AvatarImage 
                                     uri={avatarUri} 
                                     initials={initials} 
                                     style={s.driverAvatar} 
                                     textStyle={s.driverAvatarText} 
                                  />
                                  <View style={s.driverInfo}>
                                     <Text style={s.driverName}>{riderName}</Text>
                                     <Text style={s.departureTime}>Match: {matchPercent}%</Text>
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
                                        <Text style={s.routeValue} numberOfLines={1}>{pickup}</Text>
                                        <Text style={s.routeValue} numberOfLines={1}>{dropoff}</Text>
                                     </View>
                                  </View>
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
                                     <View style={s.cardHeader}>
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

                                     <View style={s.cardBody}>
                                        <View style={s.recommendationRouteWrap}>
                                           <View style={s.routeTimeline}>
                                              <View style={s.dotStart} />
                                              <View style={s.verticalLine} />
                                              <View style={s.dotEnd} />
                                           </View>
                                           <View style={s.routeTextContainer}>
                                              <Text style={s.routeValue} numberOfLines={1}>{pickup}</Text>
                                              <Text style={s.routeValue} numberOfLines={1}>{dropoff}</Text>
                                           </View>
                                        </View>
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

                <TouchableOpacity 
                  style={s.menuItem}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    router.push("/chats");
                  }}
                >
                  <Text style={s.menuItemText}>Chats</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={s.menuItem}
                  onPress={() => {
                    setIsSidebarOpen(false);
                    if (role === 'driver') {
                       router.push("/active-rides");
                    } else {
                       router.push("/active-commutes");
                    }
                  }}
                >
                  <Text style={s.menuItemText}>{role === 'driver' ? 'Active Rides' : 'Active Commutes'}</Text>
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
  driverRideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  driverRideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  driverRideTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  driverRideStatusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  driverRideStatusText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "700",
  },
  driverRideFooter: {
    marginTop: 14,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  driverRideSeats: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
});
