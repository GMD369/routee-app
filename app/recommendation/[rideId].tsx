import { router, useLocalSearchParams } from "expo-router";
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { RideRecommendation } from "../../lib/recommendations";
import { API_BASE_URL } from "../../lib/config";
import { createMatchRequest, checkMatchRequestExists } from "../../lib/match";
import { useEffect, useState } from "react";

function BackIcon() {
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

export default function RecommendationDetailScreen() {
  const params = useLocalSearchParams();
  const dataString = typeof params.data === 'string' ? params.data : (Array.isArray(params.data) ? params.data[0] : null);
  const pairId = typeof params.pairId === 'string' ? params.pairId : (Array.isArray(params.pairId) ? params.pairId[0] : null);
  
  let initialRide: RideRecommendation & { chat_id?: string; request_id?: string; match_type?: string } | null = null;
  try {
    if (dataString) initialRide = JSON.parse(dataString);
  } catch (e) {}

  const ride = initialRide;
  
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(ride?.chat_id || null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkExisting() {
      if (!ride || !ride.id || !ride.driver_id) {
        setIsChecking(false);
        return;
      }
      try {
        const res = await checkMatchRequestExists(ride.id, ride.driver_id);
        if (res.exists) {
          setChatId(res.chat_id || "placeholder-chat");
        }
      } catch (err) {
        console.warn("Failed to check match request existence", err);
      } finally {
        setIsChecking(false);
      }
    }
    
    // Only check if we didn't already get chat_id from the initial recommendation object
    if (!chatId) {
      checkExisting();
    } else {
      setIsChecking(false);
    }
  }, [ride?.id, ride?.driver_id]);
  
  if (!dataString || !ride) {
    return (
      <SafeAreaView style={s.root}>
        <Text style={s.errorText}>No recommendation data found.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const driverName = ride.driver_full_name ?? "Unknown Driver";
  const initials = driverName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const matchScore = Math.round((ride.match_score || 0) * 100);
  
  const safePath = ride.driver_avatar_url?.startsWith('/') ? ride.driver_avatar_url.substring(1) : ride.driver_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  const handleRequestJoin = async () => {
    if (!pairId || !ride.id) {
      Alert.alert("Error", "Missing ride or commute information.");
      return;
    }

    setIsSending(true);
    try {
      const response = await createMatchRequest({
        ride_id: ride.id,
        commute_id: pairId,
        seats_requested: 1, // Defaulting to 1
      });
      if (response && response.chat_id) {
        setChatId(response.chat_id);
      } else {
        setChatId("placeholder-chat");
      }
      Alert.alert("Request Sent", "Your request to join this ride has been sent successfully! You can now chat with the driver.");
    } catch (error: any) {
      Alert.alert("Request Failed", error.message || "Could not send the request. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ride Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.driverCard}>
          <AvatarImage 
             uri={avatarUri} 
             initials={initials} 
             style={s.driverAvatar} 
             textStyle={s.driverAvatarText} 
          />
          <View style={s.driverInfo}>
            <Text style={s.driverName}>{driverName}</Text>
            <Text style={s.driverRating}>
              {ride.driver_rating_avg ? `⭐ ${ride.driver_rating_avg.toFixed(1)} (${ride.driver_rating_count})` : "No ratings yet"}
            </Text>
          </View>
          <View style={s.scoreBadge}>
            <Text style={s.scoreText}>{matchScore}% Match</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Route Summary</Text>
          <View style={s.row}>
            <Text style={s.label}>From:</Text>
            <Text style={s.value}>{ride.origin_address}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>To:</Text>
            <Text style={s.value}>{ride.dest_address}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Departure:</Text>
            <Text style={s.value}>{formatDateTime(ride.departure_time)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Your Suggested Route</Text>
          <View style={s.row}>
            <Text style={s.label}>Pickup at:</Text>
            <Text style={s.value}>{ride.virtual_pickup_location || "Not specified"}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Dropoff at:</Text>
            <Text style={s.value}>{ride.virtual_dropoff_location || "Not specified"}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ride Info</Text>
          <View style={s.row}>
            <Text style={s.label}>Price per seat:</Text>
            <Text style={s.value}>PKR {ride.price_per_seat || "0"}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Seats available:</Text>
            <Text style={s.value}>{ride.available_seats} / {ride.total_seats}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Gender Pref:</Text>
            <Text style={[s.value, {textTransform: 'capitalize'}]}>{ride.gender_pref || "Any"}</Text>
          </View>
        </View>

        {ride.match_breakdown && Object.keys(ride.match_breakdown).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Match Breakdown</Text>
            {Object.entries(ride.match_breakdown).map(([key, val]) => (
              <View key={key} style={s.row}>
                <Text style={[s.label, {textTransform: 'capitalize'}]}>{key}:</Text>
                <Text style={s.value}>{Number(val).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      <View style={s.footer}>
        {isChecking ? (
          <TouchableOpacity style={[s.primaryBtn, { opacity: 0.7 }]} disabled>
            <ActivityIndicator color="#fff" />
          </TouchableOpacity>
        ) : chatId ? (
          <TouchableOpacity 
             style={s.primaryBtn} 
             onPress={() => router.push(`/chat/${chatId}`)}
          >
            <Text style={s.primaryBtnText}>Open Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
             style={[s.primaryBtn, isSending && { opacity: 0.7 }]} 
             onPress={handleRequestJoin}
             disabled={isSending}
          >
            {isSending ? (
               <ActivityIndicator color="#fff" />
            ) : (
               <Text style={s.primaryBtnText}>Send request for this ride</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A" },
  content: { padding: 20, paddingBottom: 100 },
  driverCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: "#EBEBEB" },
  driverAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" },
  driverAvatarText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  driverInfo: { flex: 1, marginLeft: 14 },
  driverName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  driverRating: { fontSize: 13, color: "#666", marginTop: 4, fontWeight: "600" },
  scoreBadge: { backgroundColor: "#0D0D0D", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  scoreText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  section: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#EBEBEB" },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 10 },
  label: { fontSize: 14, color: "#666", fontWeight: "600" },
  value: { fontSize: 14, color: "#1A1A1A", fontWeight: "600", flex: 1, textAlign: "right" },
  footer: { padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  primaryBtn: { backgroundColor: "#0D0D0D", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorText: { fontSize: 16, color: "#1A1A1A", textAlign: "center", marginTop: 100 },
  backBtn: { alignSelf: "center", marginTop: 20, padding: 10, backgroundColor: "#EBEBEB", borderRadius: 8 },
  backText: { fontWeight: "600" },
});
