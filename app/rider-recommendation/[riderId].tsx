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
import { RiderRecommendation } from "../../lib/recommendations";
import { createMatchRequest, checkMatchRequestExists } from "../../lib/match";

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

export default function RiderRecommendationDetailScreen() {
  const params = useLocalSearchParams();
  const riderId = params.riderId as string;
  const rideId = params.rideId as string;
  const dataString = params.data as string;

  let initialRider: RiderRecommendation | null = null;
  try {
    if (dataString) initialRider = JSON.parse(dataString);
  } catch (e) {}

  const [rider, setRider] = useState<RiderRecommendation | null>(initialRider);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      if (!rider || !rideId) {
        setIsChecking(false);
        return;
      }
      try {
        // For drivers, we check if there's an existing match request with this rider for this ride
        // The checkMatchRequestExists(ride_id, driver_id) is for riders checking a specific ride.
        // We need a way for drivers to check if they've already invited this specific rider.
        // The RiderRecommendation object usually has match_type="requested" if already invited.
        if (rider.match_type === "requested") {
           // If we have a request_id or it's already "requested", we might need to find the chat_id.
           // For now, let's assume if it's "requested", we'll let the user see it.
        }
        
        // Actually, checkMatchRequestExists in lib/match.ts is used by riders.
        // Drivers might need a different check or we can rely on the match_type from the recommendation engine.
        setIsChecking(false);
      } catch (err) {
        setIsChecking(false);
      }
    }
    checkExisting();
  }, [rider?.rider_id, rideId]);

  if (!rider) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const riderName = rider.full_name || "Rider";
  const initials = riderName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const matchPercent = Math.round(rider.match_score * 100);
  
  const safePath = rider.avatar_url?.startsWith('/') ? rider.avatar_url.substring(1) : rider.avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  async function handleInvite() {
    if (!rideId || !rider?.commute_id) {
      Alert.alert("Error", "Missing commute or ride information.");
      return;
    }
    
    setInviting(true);
    try {
      const response = await createMatchRequest({
        ride_id: rideId,
        commute_id: rider.commute_id,
        seats_requested: 1,
      });
      Alert.alert("Invite Sent!", `You have invited ${rider.full_name} to your ride.`);
      setRider(prev => prev ? ({ ...prev, match_type: "requested" }) : null);
      if (response && (response as any).chat_id) {
        setChatId((response as any).chat_id);
      }
    } catch (error: any) {
      Alert.alert("Error sending invite", error?.message || "An unexpected error occurred");
    } finally {
      setInviting(null as any);
    }
  }

  const isPending = rider.match_type === "requested";

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Rider Detail</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.profileCard}>
            <AvatarImage 
              uri={avatarUri} 
              initials={initials} 
              style={s.avatar} 
              textStyle={s.avatarText} 
            />
            <View style={s.profileInfo}>
              <Text style={s.name}>{riderName}</Text>
              <View style={s.subInfo}>
                {rider.gender && <Text style={s.genderText}>{rider.gender} • </Text>}
                <StarSvg />
                <Text style={s.ratingText}>{(rider.rating_avg || 0).toFixed(1)}</Text>
                <Text style={s.ridesText}>({rider.total_rides_taken || 0} rides)</Text>
              </View>
            </View>
            <View style={s.matchBadge}>
              <Text style={s.matchPercent}>{matchPercent}%</Text>
              <Text style={s.matchLabel}>Match</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Requested Route</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Pickup Location</Text>
              <Text style={s.infoValue}>{rider.virtual_pickup_location || "Unknown"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Dropoff Location</Text>
              <Text style={s.infoValue}>{rider.virtual_dropoff_location || "Unknown"}</Text>
            </View>
          </View>

          {rider.match_breakdown && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Match Breakdown</Text>
              <MatchBreakdownItem label="Route Alignment" score={rider.match_breakdown.geo || 0} />
              <MatchBreakdownItem label="Destination Proximity" score={rider.match_breakdown.destination || 0} />
              <MatchBreakdownItem label="Time Alignment" score={rider.match_breakdown.time || 0} />
              <MatchBreakdownItem label="Preferences Match" score={rider.match_breakdown.preferences || 0} />
            </View>
          )}

          {rider.preferences && Object.keys(rider.preferences).length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Preferences</Text>
              <View style={s.prefsContainer}>
                {Object.entries(rider.preferences).map(([key, val]) => {
                  if (typeof val !== 'boolean') return null;
                  return (
                    <View key={key} style={[s.prefBadge, val ? s.prefActive : s.prefInactive]}>
                      <Text style={[s.prefText, val ? s.prefTextActive : s.prefTextInactive]}>
                        {key.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {rider.message && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Message from Rider</Text>
              <Text style={s.messageText}>{rider.message}</Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          {isPending || chatId ? (
            <TouchableOpacity 
              style={s.actionBtn} 
              onPress={() => chatId && router.push(`/chat/${chatId}`)}
            >
              <Text style={s.actionBtnText}>Open Chat</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[s.actionBtn, inviting && s.actionBtnDisabled]} 
              onPress={handleInvite}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.actionBtnText}>Invite to Ride</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 120,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#666" },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  genderText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginLeft: 4,
  },
  ridesText: {
    fontSize: 14,
    color: "#888",
    marginLeft: 4,
  },
  matchBadge: {
    alignItems: "center",
    backgroundColor: "#F0FFF4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  matchPercent: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E7D32",
  },
  matchLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4CAF50",
    textTransform: "uppercase",
    marginTop: 2,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#A0A0A0",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "600",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownLabel: {
    width: 140,
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  breakdownBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 12,
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownScoreText: {
    width: 40,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  prefsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prefBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  prefActive: {
    backgroundColor: "#F0F7FF",
    borderColor: "#D0E8FF",
  },
  prefInactive: {
    backgroundColor: "#F9FAFB",
    borderColor: "#F0F0F0",
    opacity: 0.6,
  },
  prefText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  prefTextActive: { color: "#0066CC" },
  prefTextInactive: { color: "#888" },
  messageText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
  },
  actionBtn: {
    backgroundColor: "#0D0D0D",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    backgroundColor: "#A0A0A0",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
