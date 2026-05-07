import { useLocalSearchParams, router } from "expo-router";
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
import { API_BASE_URL } from "../../lib/config";
import { listRecommendedRiders, RiderRecommendation } from "../../lib/recommendations";
import { createMatchRequest } from "../../lib/match";

function BackSvg() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function StarSvg() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="#FFC107" stroke="#FFC107" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
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

function MatchBreakdownItem({ label, score }: { label: string; score: number }) {
  const percentage = Math.round(score * 100);
  let color = "#4CAF50";
  if (percentage < 50) color = "#F44336";
  else if (percentage < 80) color = "#FF9800";

  return (
    <View style={s.breakdownItem}>
      <Text style={s.breakdownLabel}>{label}</Text>
      <View style={s.breakdownBarContainer}>
        <View style={[s.breakdownBar, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.breakdownScoreText, { color }]}>{percentage}%</Text>
    </View>
  );
}

export default function RideRecommendationsScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [riders, setRiders] = useState<RiderRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);

  useEffect(() => {
    if (rideId) {
      loadRiders();
    }
  }, [rideId]);

  async function loadRiders() {
    setLoading(true);
    try {
      const data = await listRecommendedRiders(rideId!);
      setRiders(data);
    } catch (error) {
      console.warn("Failed to load recommended riders", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(rider: RiderRecommendation) {
    if (!rideId || !rider.commute_id) {
      Alert.alert("Error", "Missing commute or ride information.");
      return;
    }
    
    setInvitingId(rider.rider_id);
    try {
      await createMatchRequest({
        ride_id: rideId,
        commute_id: rider.commute_id,
        seats_requested: 1, // Driver usually invites for 1 seat at a time or accepts what is
      });
      Alert.alert("Invite Sent!", `You have invited ${rider.full_name} to your ride.`);
      // Update local state so the button changes to "Pending"
      setRiders((prev) => 
        prev.map(r => r.rider_id === rider.rider_id ? { ...r, match_type: "requested" } : r)
      );
    } catch (error: any) {
      Alert.alert("Error sending invite", error?.message || "An unexpected error occurred");
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Recommended Riders</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
          ) : riders.length === 0 ? (
            <Text style={s.emptyStateText}>No riders found matching your route at this time.</Text>
          ) : (
            riders.map((rider, idx) => {
              const riderName = rider.full_name || "Rider";
              const initials = riderName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
              const safePath = rider.avatar_url?.startsWith('/') ? rider.avatar_url.substring(1) : rider.avatar_url;
              const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
              
              const matchPercent = Math.round(rider.match_score * 100);
              const isPending = rider.match_type === "requested";
              const isInviting = invitingId === rider.rider_id;
              const isExpanded = expandedBreakdown === rider.rider_id;
              
              const ratingAvg = rider.rating_avg || 0;

              return (
                <TouchableOpacity 
                   key={rider.rider_id ?? idx} 
                   style={s.riderCard}
                   onPress={() => router.push({
                     pathname: `/rider-recommendation/${rider.rider_id}` as any,
                     params: { rideId: rideId, data: JSON.stringify(rider) }
                   })}
                >
                  <View style={s.riderHeader}>
                    <AvatarImage 
                      uri={avatarUri} 
                      initials={initials} 
                      style={s.riderAvatar} 
                      textStyle={s.riderAvatarText} 
                    />
                    <View style={s.riderInfo}>
                      <Text style={s.riderName}>{riderName}</Text>
                      <View style={s.riderSubInfo}>
                        {rider.gender && <Text style={s.riderGender}>{rider.gender} • </Text>}
                        <StarSvg />
                        <Text style={s.riderRating}>{ratingAvg.toFixed(1)}</Text>
                        <Text style={s.riderRides}>({rider.total_rides_taken || 0} rides)</Text>
                      </View>
                    </View>
                    <View style={s.matchScoreContainer}>
                      <Text style={s.matchScoreText}>{matchPercent}%</Text>
                      <Text style={s.matchScoreLabel}>Match</Text>
                    </View>
                  </View>

                  <View style={s.cardDivider} />

                  <View style={s.routeWrap}>
                    <View style={s.routeTimeline}>
                       <View style={s.dotStart} />
                       <View style={s.verticalLine} />
                       <View style={s.dotEnd} />
                    </View>
                    <View style={s.routeTextContainer}>
                       <View>
                          <Text style={s.routeLabel}>PICKUP NEAR</Text>
                          <Text style={s.routeValue} numberOfLines={1}>{rider.virtual_pickup_location || "Unknown"}</Text>
                       </View>
                       <View>
                          <Text style={s.routeLabel}>DROPOFF NEAR</Text>
                          <Text style={s.routeValue} numberOfLines={1}>{rider.virtual_dropoff_location || "Unknown"}</Text>
                       </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={s.expandBtn} 
                    onPress={() => setExpandedBreakdown(isExpanded ? null : rider.rider_id)}
                  >
                    <Text style={s.expandBtnText}>{isExpanded ? "Hide Match Details" : "View Match Details"}</Text>
                  </TouchableOpacity>

                  {isExpanded && rider.match_breakdown && (
                    <View style={s.breakdownSection}>
                      <MatchBreakdownItem label="Route Alignment" score={rider.match_breakdown.geo} />
                      <MatchBreakdownItem label="Destination Proximity" score={rider.match_breakdown.destination} />
                      <MatchBreakdownItem label="Time Alignment" score={rider.match_breakdown.time} />
                      <MatchBreakdownItem label="Preferences Match" score={rider.match_breakdown.preferences} />
                    </View>
                  )}

                  <View style={s.cardFooter}>
                    <TouchableOpacity 
                      style={[s.actionBtn, isPending && s.actionBtnDisabled]} 
                      onPress={() => handleInvite(rider)}
                      disabled={isPending || isInviting}
                    >
                      {isInviting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={s.actionBtnText}>
                          {isPending ? "Request Pending" : "Invite Rider"}
                        </Text>
                      )}
                    </TouchableOpacity>
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
  riderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  riderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  riderAvatarText: { fontSize: 20, fontWeight: "800", color: "#666" },
  riderInfo: {
    flex: 1,
    marginLeft: 14,
  },
  riderName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  riderSubInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  riderGender: {
    fontSize: 13,
    color: "#666",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  riderRating: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 4,
  },
  riderRides: {
    fontSize: 13,
    color: "#888",
    marginLeft: 4,
  },
  matchScoreContainer: {
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  matchScoreText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },
  matchScoreLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4CAF50",
    textTransform: "uppercase",
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 18,
  },
  routeWrap: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
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
  routeLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  routeValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  expandBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 10,
  },
  expandBtnText: {
    fontSize: 13,
    color: "#2196F3",
    fontWeight: "700",
  },
  breakdownSection: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  breakdownLabel: {
    width: 130,
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },
  breakdownBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 10,
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownScoreText: {
    width: 36,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  cardFooter: {
    marginTop: 6,
  },
  actionBtn: {
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    backgroundColor: "#A0A0A0",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
