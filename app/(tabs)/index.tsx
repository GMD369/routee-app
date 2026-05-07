import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect, Line } from "react-native-svg";
import React from "react";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import {
    getIncomingRequests,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ── Icons ─────────────────────────────────────────────────── */

function MenuSvg() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12h18M3 6h18M3 18h18" />
    </Svg>
  );
}

function UserSvg() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </Svg>
  );
}

function CloseSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
      <Path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

function ChevronRight({ color = "#999" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon 👋";
  return "Good evening 👋";
}

function getInitialsColor(name: string) {
  const colors = ["#6366F1","#F59E0B","#10B981","#EF4444","#3B82F6","#8B5CF6","#F97316"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function AvatarImage({ uri, initials, size = 48, radius = 12 }: { uri: string | null; initials: string; size?: number; radius?: number }) {
  const [error, setError] = useState(false);
  const bg = getInitialsColor(initials);
  const style = { width: size, height: size, borderRadius: radius, backgroundColor: error || !uri ? bg : "#DDD", alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };

  if (uri && !error) {
    return (
      <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />
    );
  }
  return (
    <View style={style}>
      <Text style={{ fontSize: size * 0.33, fontWeight: "800", color: "#fff" }}>{initials}</Text>
    </View>
  );
}

/* ── Map illustration component ─────────────────────────────── */

function MapThumb() {
  return (
    <View style={mapS.wrap}>
      <Svg width="100%" height="100%" viewBox="0 0 120 80">
        <Rect width={120} height={80} fill="#E8F4F8" />
        <Line x1={0} y1={40} x2={120} y2={40} stroke="#C8DDE8" strokeWidth={8} />
        <Line x1={60} y1={0} x2={60} y2={80} stroke="#C8DDE8" strokeWidth={5} />
        <Line x1={0} y1={60} x2={120} y2={60} stroke="#D5E8F0" strokeWidth={4} />
        <Line x1={30} y1={0} x2={30} y2={80} stroke="#D5E8F0" strokeWidth={3} />
        <Line x1={90} y1={0} x2={90} y2={80} stroke="#D5E8F0" strokeWidth={3} />
        <Circle cx={45} cy={35} r={6} fill="#4CAF50" opacity={0.9} />
        <Path d="M45 29 C42 29 39 32 39 35 C39 40 45 47 45 47 C45 47 51 40 51 35 C51 32 48 29 45 29Z" fill="#16A34A" />
        <Circle cx={45} cy={35} r={2.5} fill="#fff" />
        <Circle cx={78} cy={50} r={6} fill="#EF4444" opacity={0.9} />
        <Path d="M78 44 C75 44 72 47 72 50 C72 55 78 62 78 62 C78 62 84 55 84 50 C84 47 81 44 78 44Z" fill="#DC2626" />
        <Circle cx={78} cy={50} r={2.5} fill="#fff" />
        <Path d="M45 35 Q62 20 78 50" stroke="#0D0D0D" strokeWidth={1.5} strokeDasharray="3,2" fill="none" opacity={0.4} />
      </Svg>
    </View>
  );
}

const mapS = StyleSheet.create({
  wrap: { width: 90, height: 60, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#D5E8F0" },
});

/* ── Empty States ─────────────────────────────────────────────── */

function RiderEmptyState() {
  return (
    <View style={es.container}>
      <View style={es.iconWrap}><Text style={es.iconEmoji}>🗺️</Text></View>
      <Text style={es.title}>No Saved Routes Yet</Text>
      <Text style={es.subtitle}>Save your regular routes to discover matched rides from verified drivers near you.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/(tabs)/location")}>
        <Text style={es.ctaText}>Add Your First Route</Text>
      </TouchableOpacity>
      <View style={es.stepsWrap}>
        {[
          { n: "1", title: "Save a route", desc: "Add your home → work or any regular commute" },
          { n: "2", title: "Get matched", desc: "See verified drivers going your way" },
          { n: "3", title: "Request & ride", desc: "Send a request, share the cost" },
        ].map(step => (
          <View key={step.n} style={es.step}>
            <View style={es.stepBadge}><Text style={es.stepNum}>{step.n}</Text></View>
            <View style={es.stepBody}>
              <Text style={es.stepTitle}>{step.title}</Text>
              <Text style={es.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function DriverEmptyState() {
  return (
    <View style={es.container}>
      <View style={es.iconWrap}><Text style={es.iconEmoji}>🚗</Text></View>
      <Text style={es.title}>No Active Rides Posted</Text>
      <Text style={es.subtitle}>Post your first ride to find riders going your way and start earning.</Text>
      <TouchableOpacity style={es.cta} onPress={() => router.push("/(tabs)/rides")}>
        <Text style={es.ctaText}>Post a Ride</Text>
      </TouchableOpacity>
      <View style={es.stepsWrap}>
        {[
          { n: "1", title: "Post a ride", desc: "Share your route, time, and price per seat" },
          { n: "2", title: "Get rider matches", desc: "See recommended riders going your way" },
          { n: "3", title: "Accept & earn", desc: "Accept requests and share your commute" },
        ].map(step => (
          <View key={step.n} style={es.step}>
            <View style={es.stepBadge}><Text style={es.stepNum}>{step.n}</Text></View>
            <View style={es.stepBody}>
              <Text style={es.stepTitle}>{step.title}</Text>
              <Text style={es.stepDesc}>{step.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const es = StyleSheet.create({
  container: { alignItems: "center", paddingTop: 20, paddingBottom: 40 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F4FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  iconEmoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22, paddingHorizontal: 20, marginBottom: 24 },
  cta: { backgroundColor: "#0D0D0D", borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, marginBottom: 32 },
  ctaText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  stepsWrap: { width: "100%", gap: 0 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  stepBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepNum: { color: "#fff", fontSize: 13, fontWeight: "800" },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A1A", marginBottom: 2 },
  stepDesc: { fontSize: 13, color: "#888", lineHeight: 18 },
});

/* ── Sidebar Menu Item ────────────────────────────────────────── */

function SideMenuItem({ emoji, label, onPress, badge }: { emoji: string; label: string; onPress: () => void; badge?: number }) {
  return (
    <TouchableOpacity style={sm.item} onPress={onPress} activeOpacity={0.7}>
      <View style={sm.iconBox}><Text style={sm.emoji}>{emoji}</Text></View>
      <Text style={sm.label}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={sm.badge}><Text style={sm.badgeText}>{badge > 99 ? "99+" : badge}</Text></View>
      )}
      <ChevronRight />
    </TouchableOpacity>
  );
}

const sm = StyleSheet.create({
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 18 },
  label: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  badge: { backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});

/* ── Route Card ──────────────────────────────────────────────── */

function RouteTimeline({ origin, dest }: { origin: string; dest: string }) {
  return (
    <View style={rc.wrap}>
      <View style={rc.timeline}>
        <View style={rc.dotGreen} />
        <View style={rc.line} />
        <View style={rc.dotRed} />
      </View>
      <View style={rc.texts}>
        <Text style={rc.addr} numberOfLines={2}>{origin}</Text>
        <Text style={rc.addr} numberOfLines={2}>{dest}</Text>
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 12 },
  timeline: { alignItems: "center", paddingTop: 3 },
  dotGreen: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: "#16A34A", backgroundColor: "#fff" },
  line: { width: 2, height: 26, backgroundColor: "#E0E0E0", marginVertical: 3 },
  dotRed: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#DC2626" },
  texts: { flex: 1, gap: 12 },
  addr: { fontSize: 13, color: "#1A1A1A", fontWeight: "600", lineHeight: 18 },
});

/* ── Main Screen ─────────────────────────────────────────────── */

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [pairsSummary, setPairsSummary] = useState<SavedLocationPairSummary[]>([]);
  const [pairRecommendations, setPairRecommendations] = useState<Record<string, RideRecommendation[]>>({});
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState<Record<string, boolean>>({});
  const [driverRides, setDriverRides] = useState<RideResponse[]>([]);
  const [loadingDriverRides, setLoadingDriverRides] = useState(false);
  const [riderRecommendations, setRiderRecommendations] = useState<Record<string, RiderRecommendation[]>>({});
  const [loadingRiders, setLoadingRiders] = useState<Record<string, boolean>>({});
  const [incomingCount, setIncomingCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isSidebarOpen ? 0 : -SCREEN_WIDTH,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  }, [isSidebarOpen]);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      // Fetch incoming request count
      try {
        const reqs = await getIncomingRequests("pending");
        setIncomingCount(reqs.length);
      } catch { /* silent */ }

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

  useFocusEffect(useCallback(() => { void hydrateHome(); }, [hydrateHome]));

  useEffect(() => {
    let cancelled = false;
    if (pairsSummary.length === 0) return;
    async function fetchAllRecs() {
      setLoadingPairs(pairsSummary.reduce((acc, p) => ({ ...acc, [p.pair_id]: true }), {}));
      for (const pair of pairsSummary) {
        if (cancelled) break;
        try {
          const rides = await listRecommendedRides(pair.pair_id, 10);
          if (!cancelled) setPairRecommendations(prev => ({ ...prev, [pair.pair_id]: rides }));
        } catch {
          if (!cancelled) setPairRecommendations(prev => ({ ...prev, [pair.pair_id]: [] }));
        } finally {
          if (!cancelled) setLoadingPairs(prev => ({ ...prev, [pair.pair_id]: false }));
        }
      }
    }
    void fetchAllRecs();
    return () => { cancelled = true; };
  }, [pairsSummary]);

  useEffect(() => {
    let cancelled = false;
    if (driverRides.length === 0) return;
    async function fetchAllRiders() {
      setLoadingRiders(driverRides.reduce((acc, r) => ({ ...acc, [r.id]: true }), {}));
      for (const ride of driverRides) {
        if (cancelled) break;
        try {
          const riders = await listRecommendedRiders(ride.id, 10);
          if (!cancelled) setRiderRecommendations(prev => ({ ...prev, [ride.id]: riders }));
        } catch {
          if (!cancelled) setRiderRecommendations(prev => ({ ...prev, [ride.id]: [] }));
        } finally {
          if (!cancelled) setLoadingRiders(prev => ({ ...prev, [ride.id]: false }));
        }
      }
    }
    void fetchAllRiders();
    return () => { cancelled = true; };
  }, [driverRides]);

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

  const closeSidebar = () => setIsSidebarOpen(false);
  const openSidebar = () => setIsSidebarOpen(true);

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Top bar */}
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <TouchableOpacity style={s.menuBtn} onPress={openSidebar}>
              <MenuSvg />
            </TouchableOpacity>
            <View>
              <Text style={s.greeting}>{getGreeting()}</Text>
              <Text style={s.appName}>Musafee</Text>
            </View>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => router.push(profileRoute)}>
            <UserSvg />
          </TouchableOpacity>
        </View>

        {/* Role pill */}
        <View style={s.rolePillWrap}>
          <View style={[s.rolePill, isDriver && s.rolePillDriver]}>
            <Text style={[s.rolePillText, isDriver && s.rolePillTextDriver]}>{isDriver ? "🚗  Driver View" : "🧑‍💼  Rider View"}</Text>
          </View>
        </View>

        {/* Driver View */}
        {isDriver && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionLabel}>RECOMMENDED RIDERS</Text>
            <Text style={s.mainHeading}>Riders for your active routes</Text>

            {loadingDriverRides ? (
              <View style={s.loadingCard}><ActivityIndicator color="#0D0D0D" /><Text style={s.loadingText}>Finding riders…</Text></View>
            ) : driverRides.length === 0 ? (
              <DriverEmptyState />
            ) : (
              driverRides.map((ride, idx) => {
                const riders = riderRecommendations[ride.id] || [];
                const isLoadingRiders = loadingRiders[ride.id];

                return (
                  <View key={ride.id ?? idx} style={s.pairSection}>
                    {/* Route header */}
                    <View style={s.pairHeader}>
                      <View style={s.pairRouteRow}>
                        <View style={s.pairDotGreen} />
                        <Text style={s.pairOrigin} numberOfLines={1}>{ride.origin_address || "Origin"}</Text>
                      </View>
                      <View style={s.pairLine} />
                      <View style={s.pairRouteRow}>
                        <View style={s.pairDotRed} />
                        <Text style={s.pairDest} numberOfLines={1}>{ride.dest_address || "Destination"}</Text>
                      </View>
                    </View>

                    {isLoadingRiders ? (
                      <ActivityIndicator color="#0D0D0D" style={{ marginVertical: 10 }} />
                    ) : riders.length === 0 ? (
                      <View style={s.noResultCard}><Text style={s.noResultText}>No matched riders for this route yet.</Text></View>
                    ) : (
                      riders.map((rider, rIdx) => {
                        const riderName = rider.full_name ?? "Rider";
                        const initials = riderName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
                        const safePath = rider.avatar_url?.startsWith('/') ? rider.avatar_url.substring(1) : rider.avatar_url;
                        const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
                        const matchPercent = Math.round((rider.match_score || 0) * 100);
                        const pickup = rider.virtual_pickup_location ?? "Unknown";
                        const dropoff = rider.virtual_dropoff_location ?? "Unknown";

                        return (
                          <TouchableOpacity
                            key={rider.rider_id ?? rIdx}
                            style={s.card}
                            onPress={() => router.push({ pathname: `/rider-recommendation/${rider.rider_id}` as any, params: { rideId: ride.id, data: JSON.stringify(rider) } })}
                            activeOpacity={0.85}
                          >
                            <View style={s.cardTop}>
                              <AvatarImage uri={avatarUri} initials={initials} size={50} radius={14} />
                              <View style={s.cardPersonInfo}>
                                <Text style={s.cardName}>{riderName}</Text>
                                <Text style={s.cardMeta}>Passenger · Verified</Text>
                              </View>
                              <View style={[s.matchBadge, matchPercent >= 80 ? s.matchHigh : matchPercent >= 50 ? s.matchMid : s.matchLow]}>
                                <Text style={s.matchText}>{matchPercent}% match</Text>
                              </View>
                            </View>
                            <View style={s.cardDivider} />
                            <RouteTimeline origin={pickup} dest={dropoff} />
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

        {/* Rider View */}
        {!isDriver && (
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionLabel}>RECOMMENDED RIDES</Text>
            <Text style={s.mainHeading}>Rides for your saved routes</Text>

            {loadingSummary ? (
              <View style={s.loadingCard}><ActivityIndicator color="#0D0D0D" /><Text style={s.loadingText}>Finding rides…</Text></View>
            ) : pairsSummary.length === 0 ? (
              <RiderEmptyState />
            ) : (
              pairsSummary.map(pair => {
                const isLoading = loadingPairs[pair.pair_id];
                const rides = pairRecommendations[pair.pair_id] || [];

                return (
                  <View key={pair.pair_id} style={s.pairSection}>
                    {/* Route header */}
                    <View style={s.pairHeader}>
                      <View style={s.pairRouteRow}>
                        <View style={s.pairDotGreen} />
                        <Text style={s.pairOrigin} numberOfLines={1}>{pair.start_address || "Origin"}</Text>
                      </View>
                      <View style={s.pairLine} />
                      <View style={s.pairRouteRow}>
                        <View style={s.pairDotRed} />
                        <Text style={s.pairDest} numberOfLines={1}>{pair.end_address || "Destination"}</Text>
                      </View>
                    </View>

                    {isLoading ? (
                      <ActivityIndicator color="#0D0D0D" style={{ marginVertical: 10 }} />
                    ) : rides.length === 0 ? (
                      <View style={s.noResultCard}><Text style={s.noResultText}>No rides found for this route yet. Check back soon.</Text></View>
                    ) : (
                      rides.map((ride, idx) => {
                        const driverName = ride.driver_full_name ?? "Driver";
                        const initials = driverName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
                        const pickup = ride.virtual_pickup_location ?? ride.origin_address;
                        const dropoff = ride.virtual_dropoff_location ?? ride.dest_address;
                        const safePath = ride.driver_avatar_url?.startsWith('/') ? ride.driver_avatar_url.substring(1) : ride.driver_avatar_url;
                        const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
                        const price = (ride as any).price_per_seat;

                        return (
                          <TouchableOpacity
                            key={ride.id ?? idx}
                            style={s.card}
                            onPress={() => router.push({ pathname: `/recommendation/${ride.id}` as any, params: { data: JSON.stringify(ride), pairId: pair.pair_id } })}
                            activeOpacity={0.85}
                          >
                            <View style={s.cardTop}>
                              <AvatarImage uri={avatarUri} initials={initials} size={50} radius={14} />
                              <View style={s.cardPersonInfo}>
                                <Text style={s.cardName}>{driverName}</Text>
                                <Text style={s.cardMeta}>{formatDateTime(ride.departure_time)}</Text>
                              </View>
                              {price != null && (
                                <View style={s.priceBadge}>
                                  <Text style={s.priceText}>PKR {price}</Text>
                                  <Text style={s.priceSub}>/seat</Text>
                                </View>
                              )}
                            </View>
                            <View style={s.cardDivider} />
                            <RouteTimeline origin={pickup} dest={dropoff} />
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

      {/* Sidebar Modal */}
      <Modal visible={isSidebarOpen} transparent animationType="none" onRequestClose={closeSidebar}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={closeSidebar} />
          <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              {/* Sidebar dark header */}
              <View style={s.sidebarHead}>
                <View style={s.sidebarHeadTop}>
                  <View style={s.sidebarLogoWrap}>
                    <Text style={s.sidebarLogoText}>M</Text>
                  </View>
                  <TouchableOpacity onPress={closeSidebar} style={s.sidebarClose}>
                    <CloseSvg />
                  </TouchableOpacity>
                </View>
                <Text style={s.sidebarAppName}>Musafee</Text>
                <Text style={s.sidebarTagline}>Share the road. Split the cost.</Text>
                <View style={[s.sidebarRoleBadge, isDriver && s.sidebarRoleBadgeDriver]}>
                  <Text style={s.sidebarRoleText}>{isDriver ? "🚗  Driver" : "🧑‍💼  Rider"}</Text>
                </View>
              </View>

              {/* Menu sections */}
              <ScrollView style={s.sidebarScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.sidebarGroupLabel}>ACTIVITY</Text>
                <SideMenuItem emoji="📨" label="Incoming Requests" badge={incomingCount} onPress={() => { closeSidebar(); router.push("/incoming-requests"); }} />
                <SideMenuItem emoji="📤" label="Sent Requests" onPress={() => { closeSidebar(); router.push("/sent-requests"); }} />
                <SideMenuItem emoji="💬" label="Chats" onPress={() => { closeSidebar(); router.push("/chats"); }} />
                <SideMenuItem emoji={isDriver ? "🚗" : "🗺️"} label={isDriver ? "Active Rides" : "Active Commutes"} onPress={() => { closeSidebar(); router.push(isDriver ? "/active-rides" : "/active-commutes"); }} />

                <Text style={[s.sidebarGroupLabel, { marginTop: 16 }]}>ACCOUNT</Text>
                <SideMenuItem emoji="👤" label={isDriver ? "Driver Profile" : "Rider Profile"} onPress={() => { closeSidebar(); router.push(profileRoute); }} />
              </ScrollView>

              <View style={s.sidebarFooter}>
                <Text style={s.sidebarFooterText}>Version 1.0.0</Text>
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 12, backgroundColor: "#F8F9FA",
  },
  greeting: { fontSize: 12, color: "rgba(0,0,0,0.4)", fontWeight: "500" },
  appName: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5, marginTop: 2 },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  profileBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },

  rolePillWrap: { paddingHorizontal: 22, paddingBottom: 10 },
  rolePill: { alignSelf: "flex-start", backgroundColor: "#F0F4FF", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#DBEAFE" },
  rolePillDriver: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  rolePillText: { fontSize: 12, fontWeight: "700", color: "#3B82F6" },
  rolePillTextDriver: { color: "#16A34A" },

  scrollContent: { paddingHorizontal: 22, paddingBottom: 120, paddingTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#A0A0A0", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  mainHeading: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", marginBottom: 20, letterSpacing: -0.5 },

  loadingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  loadingText: { fontSize: 14, color: "#888", fontWeight: "500" },

  pairSection: { marginBottom: 28 },
  pairHeader: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  pairRouteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pairDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A", flexShrink: 0 },
  pairDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", flexShrink: 0 },
  pairLine: { width: 2, height: 12, backgroundColor: "#D0D0D0", marginLeft: 3, marginVertical: 3 },
  pairOrigin: { flex: 1, fontSize: 13, fontWeight: "600", color: "#333" },
  pairDest: { flex: 1, fontSize: 13, fontWeight: "600", color: "#333" },

  noResultCard: { backgroundColor: "#FAFAFA", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#EBEBEB", alignItems: "center" },
  noResultText: { fontSize: 13, color: "#999", textAlign: "center", lineHeight: 18 },

  card: {
    marginBottom: 14, borderRadius: 20, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#EBEBEB", padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  cardPersonInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  cardMeta: { fontSize: 12, color: "#888", fontWeight: "500" },
  cardDivider: { height: 1, backgroundColor: "#F2F2F2", marginBottom: 14 },

  matchBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  matchHigh: { backgroundColor: "#F0FDF4" },
  matchMid: { backgroundColor: "#FFFBEB" },
  matchLow: { backgroundColor: "#FFF1F0" },
  matchText: { fontSize: 11, fontWeight: "700", color: "#333" },

  priceBadge: { alignItems: "center", backgroundColor: "#F8F9FA", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#EBEBEB" },
  priceText: { fontSize: 13, fontWeight: "800", color: "#1A1A1A" },
  priceSub: { fontSize: 10, color: "#888", fontWeight: "500" },

  // Modal / Sidebar
  modalOverlay: { flex: 1, flexDirection: "row" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sidebar: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: Math.min(SCREEN_WIDTH * 0.82, 360),
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 20,
  },
  sidebarHead: {
    backgroundColor: "#0D0D0D", padding: 24, paddingTop: 20,
  },
  sidebarHeadTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sidebarLogoWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  sidebarLogoText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sidebarClose: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  sidebarAppName: { color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5, marginBottom: 4 },
  sidebarTagline: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "500", marginBottom: 14 },
  sidebarRoleBadge: { alignSelf: "flex-start", backgroundColor: "rgba(59,130,246,0.2)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(59,130,246,0.3)" },
  sidebarRoleBadgeDriver: { backgroundColor: "rgba(22,163,74,0.2)", borderColor: "rgba(22,163,74,0.3)" },
  sidebarRoleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sidebarScroll: { flex: 1, paddingTop: 8 },
  sidebarGroupLabel: { fontSize: 10, fontWeight: "700", color: "#A0A0A0", letterSpacing: 1.2, textTransform: "uppercase", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sidebarFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "#F0F0F0", alignItems: "center" },
  sidebarFooterText: { fontSize: 12, color: "#CCC", fontWeight: "500" },
});
