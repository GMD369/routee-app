import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import {
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
    UserRole,
} from "../../lib/auth";
import {
    listRecommendedRides,
    RideRecommendation,
} from "../../lib/recommendations";
import { listSavedLocations, SavedLocationPairResponse } from "../../lib/rider";

/* ── Icons ──────────────────────────────────────────────────── */
function DummyMap() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 390 320"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Base background */}
      <Rect x={0} y={0} width={390} height={320} fill="#E8EAE6" />

      {/* Grid roads — horizontal */}
      <Rect x={0} y={48} width={390} height={18} fill="#fff" />
      <Rect x={0} y={110} width={390} height={14} fill="#fff" />
      <Rect x={0} y={170} width={390} height={18} fill="#fff" />
      <Rect x={0} y={240} width={390} height={14} fill="#fff" />
      <Rect x={0} y={290} width={390} height={18} fill="#fff" />

      {/* Grid roads — vertical */}
      <Rect x={40} y={0} width={18} height={320} fill="#fff" />
      <Rect x={110} y={0} width={14} height={320} fill="#fff" />
      <Rect x={180} y={0} width={20} height={320} fill="#fff" />
      <Rect x={260} y={0} width={14} height={320} fill="#fff" />
      <Rect x={330} y={0} width={18} height={320} fill="#fff" />

      {/* Road center dashes — horizontal main road */}
      <Rect x={0} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={36} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={72} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={108} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={144} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={200} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={236} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={280} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={316} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={352} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />

      {/* Road center dashes — vertical main road */}
      <Rect x={189} y={0} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={36} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={72} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={108} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={196} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={232} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={268} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={304} width={2} height={28} rx={1} fill="#E0D9C0" />

      {/* City blocks */}
      <Rect x={58} y={0} width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={0} width={44} height={42} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={0} width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={0} width={42} height={42} rx={4} fill="#D0D5CC" />

      <Rect x={0} y={66} width={34} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={58} y={66} width={44} height={38} rx={4} fill="#C8CCCA" />
      <Rect x={128} y={66} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={66} width={44} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={348} y={66} width={42} height={38} rx={4} fill="#D8DDD4" />

      <Rect x={0} y={124} width={34} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={58} y={124} width={44} height={40} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={124} width={44} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={124} width={44} height={40} rx={4} fill="#C8CCCA" />
      <Rect x={348} y={124} width={42} height={40} rx={4} fill="#D8DDD4" />

      <Rect x={0} y={188} width={34} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={58} y={188} width={44} height={46} rx={4} fill="#D0D5CC" />
      <Rect x={128} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={188} width={42} height={46} rx={4} fill="#D0D5CC" />

      <Rect x={0} y={254} width={34} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={58} y={254} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={254} width={44} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={254} width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={254} width={42} height={38} rx={4} fill="#C8CCCA" />

      {/* Green park block */}
      <Rect x={200} y={124} width={52} height={40} rx={6} fill="#B8D4AC" />
      <Rect x={200} y={188} width={52} height={46} rx={6} fill="#ACC8A4" />

      {/* Park trees (tiny circles) */}
      <Circle cx={214} cy={140} r={5} fill="#90B888" />
      <Circle cx={228} cy={136} r={4} fill="#90B888" />
      <Circle cx={240} cy={142} r={5} fill="#90B888" />
      <Circle cx={220} cy={200} r={5} fill="#90B888" />
      <Circle cx={236} cy={196} r={4} fill="#90B888" />
      <Circle cx={246} cy={204} r={5} fill="#90B888" />

      {/* Location pin — center */}
      <Ellipse cx={195} cy={162} rx={10} ry={5} fill="rgba(0,0,0,0.15)" />
      <Path
        d="M195 128 C184 128 175 137 175 148 C175 162 195 178 195 178 C195 178 215 162 215 148 C215 137 206 128 195 128Z"
        fill="#0D0D0D"
      />
      <Circle cx={195} cy={148} r={6} fill="#fff" />

      {/* Pulse rings around pin */}
      <Circle
        cx={195}
        cy={162}
        r={18}
        fill="none"
        stroke="rgba(13,13,13,0.08)"
        strokeWidth={1.5}
      />
      <Circle
        cx={195}
        cy={162}
        r={28}
        fill="none"
        stroke="rgba(13,13,13,0.05)"
        strokeWidth={1.5}
      />
    </Svg>
  );
}

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

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function locationLabel(
  value?: string | { name?: string; address?: string | null } | null,
) {
  if (!value) return "Unknown location";
  if (typeof value === "string") return value;
  return value.address ?? value.name ?? "Unknown location";
}

/* ── Screen ─────────────────────────────────────────────────── */

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [savedPairs, setSavedPairs] = useState<SavedLocationPairResponse[]>([]);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RideRecommendation[]>(
    [],
  );
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);

      if (currentRole !== "rider") {
        setSavedPairs([]);
        setSelectedPairId(null);
        setRecommendations([]);
        return;
      }

      setLoadingPairs(true);
      const pairs = await listSavedLocations();
      setSavedPairs(pairs);
      setSelectedPairId((currentPairId) => {
        if (
          currentPairId &&
          pairs.some((pair) => pair.pair_id === currentPairId)
        ) {
          return currentPairId;
        }

        const defaultPair = pairs.find((pair) => pair.is_default);
        return defaultPair?.pair_id ?? pairs[0]?.pair_id ?? null;
      });
    } catch (error) {
      Alert.alert("Home error", getApiErrorMessage(error));
    } finally {
      setLoadingPairs(false);
    }
  }, []);

  useEffect(() => {
    void hydrateHome();
  }, [hydrateHome]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateRecommendations() {
      if (role !== "rider" || !selectedPairId) {
        setRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const rides = await listRecommendedRides(selectedPairId, 5);
        if (!cancelled) {
          setRecommendations(rides);
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendations([]);
          Alert.alert("Recommendations", getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingRecommendations(false);
        }
      }
    }

    void hydrateRecommendations();

    return () => {
      cancelled = true;
    };
  }, [role, selectedPairId]);

  const isDriver = role === "driver";
  const activePair =
    savedPairs.find((pair) => pair.pair_id === selectedPairId) ?? null;
  const profileRoute = isDriver ? "/driver-profile" : "/profile";
  const pairCountLabel =
    savedPairs.length === 1
      ? "1 saved location"
      : `${savedPairs.length} saved locations`;

  return (
    <View style={s.root}>
      {/* Dummy map background */}
      <View style={s.mapArea}>
        <DummyMap />
        <SafeAreaView style={s.mapOverlay} edges={["top"]}>
          <View style={s.topBar}>
            <View>
              <Text style={s.greeting}>Good morning 👋</Text>
              <Text style={s.appName}>Musafee</Text>
            </View>
            <TouchableOpacity
              style={s.profileBtn}
              onPress={() => router.push(profileRoute)}
            >
              <UserSvg />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {!isDriver ? (
          <View style={s.homeSheet}>
            <View style={s.sheetHeader}>
              <View style={s.sheetHeaderCopy}>
                <Text style={s.sheetEyebrow}>Rider recommendations</Text>
                <Text style={s.sheetTitle}>Trips for your saved locations</Text>
              </View>
              <TouchableOpacity
                style={s.manageBtn}
                onPress={() => router.push("/location")}
              >
                <Text style={s.manageBtnText}>Manage</Text>
              </TouchableOpacity>
            </View>

            <View style={s.pairMetaRow}>
              <Text style={s.pairMetaTitle} numberOfLines={1}>
                {activePair
                  ? `${locationLabel(activePair.start_location)} to ${locationLabel(activePair.end_location)}`
                  : "Choose a saved pair"}
              </Text>
              <Text style={s.pairMetaSubtitle} numberOfLines={2}>
                {activePair
                  ? pairCountLabel
                  : "Add locations in the Location tab to start getting recommendations."}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.pairChips}
            >
              {savedPairs.length === 0 ? (
                <View style={s.emptyChip}>
                  <Text style={s.emptyChipText}>No saved pairs yet</Text>
                </View>
              ) : (
                savedPairs.map((pair) => {
                  const selected = pair.pair_id === selectedPairId;
                  return (
                    <TouchableOpacity
                      key={pair.pair_id}
                      style={[s.pairChip, selected && s.pairChipSelected]}
                      onPress={() => setSelectedPairId(pair.pair_id)}
                    >
                      <Text
                        style={[
                          s.pairChipTitle,
                          selected && s.pairChipTitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {locationLabel(pair.start_location)}
                      </Text>
                      <Text
                        style={[
                          s.pairChipSubtitle,
                          selected && s.pairChipSubtitleSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {locationLabel(pair.end_location)}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {loadingPairs ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#0D0D0D" />
                <Text style={s.loadingText}>Loading saved locations</Text>
              </View>
            ) : null}

            {activePair && loadingRecommendations ? (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#0D0D0D" />
                <Text style={s.loadingText}>Finding matching rides</Text>
              </View>
            ) : null}

            {!loadingPairs && savedPairs.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyStateTitle}>
                  Save a location pair first
                </Text>
                <Text style={s.emptyStateText}>
                  Create a From and To pair in Location, then we will recommend
                  rides here automatically.
                </Text>
                <TouchableOpacity
                  style={s.emptyStateBtn}
                  onPress={() => router.push("/location")}
                >
                  <Text style={s.emptyStateBtnText}>Add saved location</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {activePair && recommendations.length > 0 ? (
              <ScrollView
                style={s.recommendationList}
                showsVerticalScrollIndicator={false}
              >
                {recommendations.map((ride, index) => {
                  const pct = Math.round((ride.match_score ?? 0) * 100);
                  const driverName = ride.driver_full_name ?? "Driver";
                  const initials = driverName
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0] ?? "")
                    .join("")
                    .toUpperCase();
                  const rating = ride.driver_rating_avg;
                  const pickup =
                    ride.virtual_pickup_location ?? ride.origin_address;
                  const dropoff =
                    ride.virtual_dropoff_location ?? ride.dest_address;
                  return (
                    <View
                      key={`${ride.id ?? index}`}
                      style={s.recommendationCard}
                    >
                      {/* Top row: route + match badge */}
                      <View style={s.recommendationTopRow}>
                        <View style={s.recommendationRouteWrap}>
                          <Text
                            style={s.recommendationRoute}
                            numberOfLines={1}
                          >
                            {pickup}
                          </Text>
                          <View style={s.routeArrowRow}>
                            <View style={s.routeDot} />
                            <View style={s.routeLine} />
                            <View style={s.routeArrowHead} />
                          </View>
                          <Text
                            style={s.recommendationRouteDest}
                            numberOfLines={1}
                          >
                            {dropoff}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.matchBadge,
                            pct >= 80
                              ? s.matchBadgeHigh
                              : pct >= 60
                                ? s.matchBadgeMed
                                : s.matchBadgeLow,
                          ]}
                        >
                          <Text
                            style={[
                              s.matchBadgeText,
                              pct >= 80
                                ? s.matchBadgeTextHigh
                                : pct >= 60
                                  ? s.matchBadgeTextMed
                                  : s.matchBadgeTextLow,
                            ]}
                          >
                            {pct}%
                          </Text>
                        </View>
                      </View>

                      {/* Divider */}
                      <View style={s.cardDivider} />

                      {/* Driver row */}
                      <View style={s.driverRow}>
                        <View style={s.driverAvatar}>
                          <Text style={s.driverAvatarText}>{initials}</Text>
                        </View>
                        <View style={s.driverInfo}>
                          <Text style={s.driverName}>{driverName}</Text>
                          {rating != null ? (
                            <Text style={s.driverRating}>
                              ⭐ {rating.toFixed(1)}
                              {ride.driver_rating_count
                                ? ` (${ride.driver_rating_count})`
                                : ""}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={s.departureTime}>
                          {formatDateTime(ride.departure_time)}
                        </Text>
                      </View>

                      {/* Bottom meta: seats + price */}
                      <View style={s.cardMetaRow}>
                        <View style={s.cardMetaChip}>
                          <Text style={s.cardMetaChipText}>
                            {ride.available_seats}{" "}
                            {ride.available_seats === 1 ? "seat" : "seats"}
                          </Text>
                        </View>
                        <View style={s.cardMetaChip}>
                          <Text style={s.cardMetaChipText}>
                            {ride.price_negotiable
                              ? `Rs ${ride.price_per_seat}+ / seat`
                              : `Rs ${ride.price_per_seat} / seat`}
                          </Text>
                        </View>
                        {ride.gender_pref && ride.gender_pref !== "any" ? (
                          <View style={s.cardMetaChip}>
                            <Text style={s.cardMetaChipText}>
                              {ride.gender_pref === "female" ? "♀ only" : "♂ only"}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : null}

            {!loadingPairs &&
            activePair &&
            recommendations.length === 0 &&
            !loadingRecommendations ? (
              <View style={s.emptyState}>
                <Text style={s.emptyStateTitle}>No matches yet</Text>
                <Text style={s.emptyStateText}>
                  We did not find rides for this pair right now. Try another
                  saved location or add more pairs.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E8EAE6" },

  // Map area
  mapArea: { flex: 1, backgroundColor: "#E8EAE6", overflow: "hidden" },
  mapOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: "500" },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    letterSpacing: -0.5,
    marginTop: 2,
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

  homeSheet: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    maxHeight: 400,
    padding: 16,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sheetHeaderCopy: { flex: 1 },
  sheetEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6C6C6C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sheetTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  manageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  manageBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  pairMetaRow: { marginTop: 14 },
  pairMetaTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#151515",
    letterSpacing: -0.2,
  },
  pairMetaSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#6B6B6B",
  },
  pairChips: {
    gap: 10,
    paddingTop: 14,
    paddingBottom: 6,
  },
  emptyChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
  },
  emptyChipText: { fontSize: 12, fontWeight: "600", color: "#717171" },
  pairChip: {
    minWidth: 160,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E7E7E7",
    backgroundColor: "#FFFFFF",
  },
  pairChipSelected: {
    borderColor: "#111111",
    backgroundColor: "#111111",
  },
  pairChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1C1C1C",
  },
  pairChipTitleSelected: { color: "#FFFFFF" },
  pairChipSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: "#6E6E6E",
  },
  pairChipSubtitleSelected: { color: "rgba(255,255,255,0.8)" },
  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 12, color: "#666666", fontWeight: "600" },
  emptyState: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#151515",
  },
  emptyStateText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#686868",
  },
  emptyStateBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  emptyStateBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  recommendationList: {
    marginTop: 14,
    maxHeight: 260,
  },
  recommendationCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  recommendationTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  recommendationRouteWrap: { flex: 1, gap: 4 },
  recommendationRoute: {
    fontSize: 13,
    fontWeight: "700",
    color: "#141414",
  },
  recommendationRouteDest: {
    fontSize: 13,
    fontWeight: "700",
    color: "#141414",
  },
  routeArrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingLeft: 2,
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
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F0F7F1",
  },
  matchBadgeHigh: { backgroundColor: "#DCFCE7" },
  matchBadgeMed: { backgroundColor: "#FEF9C3" },
  matchBadgeLow: { backgroundColor: "#F5F5F5" },
  matchBadgeText: { fontSize: 11, fontWeight: "800", color: "#166534" },
  matchBadgeTextHigh: { color: "#166534" },
  matchBadgeTextMed: { color: "#854D0E" },
  matchBadgeTextLow: { color: "#525252" },
  cardDivider: {
    height: 1,
    backgroundColor: "#F2F2F2",
    marginVertical: 10,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#0D0D0D",
    alignItems: "center",
    justifyContent: "center",
  },
  driverAvatarText: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
  driverInfo: { flex: 1, gap: 2 },
  driverName: { fontSize: 12, fontWeight: "700", color: "#1A1A1A" },
  driverRating: { fontSize: 11, color: "#6B6B6B" },
  departureTime: { fontSize: 11, color: "#6B6B6B", fontWeight: "600" },
  cardMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardMetaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  cardMetaChipText: { fontSize: 11, fontWeight: "600", color: "#3A3A3A" },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D0D0D",
    marginBottom: 6,
  },
  modalSub: { fontSize: 13, color: "#9E9E9E", marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0D0D0D",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "#F8F8F8",
  },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: "#757575" },
  modalSkip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    backgroundColor: "#fff",
  },
  modalSkipText: { fontSize: 13, fontWeight: "600", color: "#424242" },
  modalContinue: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#0D0D0D",
  },
  modalContinueText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
