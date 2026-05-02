import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { IncomingRequest } from "../lib/match";
import { API_BASE_URL } from "../lib/config";
import { useEffect, useState } from "react";
import { getDriverPreferences, DriverPreferences } from "../lib/driver";

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

export default function RequestDetailScreen() {
  const params = useLocalSearchParams();
  const dataString = typeof params.data === 'string' ? params.data : (Array.isArray(params.data) ? params.data[0] : null);
  
  let req: IncomingRequest | null = null;
  try {
    if (dataString) req = JSON.parse(dataString);
  } catch (e) {}

  const [driverPrefs, setDriverPrefs] = useState<DriverPreferences | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      if (!req || !req.driver_id) return;
      try {
        const prefs = await getDriverPreferences(req.driver_id);
        setDriverPrefs(prefs);
      } catch (err) {
        console.warn("Failed to load driver preferences", err);
      }
    }
    loadPreferences();
  }, [req?.driver_id]);
  
  if (!dataString || !req) {
    return (
      <SafeAreaView style={s.root}>
        <Text style={s.errorText}>No request data found.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const partyName = req.other_party_name ?? "Unknown User";
  const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  
  const safePath = req.other_party_avatar_url?.startsWith('/') ? req.other_party_avatar_url.substring(1) : req.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Details</Text>
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
            <Text style={s.driverName}>{partyName}</Text>
            <Text style={s.driverRole}>Role: {req.my_role === 'driver' ? 'Rider' : 'Driver'}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Route Summary</Text>
          <View style={s.row}>
            <Text style={s.label}>From:</Text>
            <Text style={s.value}>{req.origin_address ?? "Not specified"}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>To:</Text>
            <Text style={s.value}>{req.dest_address ?? "Not specified"}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.label}>Departure:</Text>
            <Text style={s.value}>{formatDateTime(req.departure_time)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ride Info</Text>
          <View style={s.row}>
            <Text style={s.label}>Price per seat:</Text>
            <Text style={s.value}>PKR {req.price_per_seat || "0"}</Text>
          </View>
          {req.gender_pref && (
            <View style={s.row}>
              <Text style={s.label}>Gender Pref:</Text>
              <Text style={[s.value, { textTransform: 'capitalize' }]}>{req.gender_pref}</Text>
            </View>
          )}
        </View>

        {driverPrefs && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Driver Preferences</Text>
            <View style={s.row}>
              <Text style={s.label}>Music:</Text>
              <Text style={s.value}>{driverPrefs.music ? "Playing" : "No Music"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Smoking:</Text>
              <Text style={s.value}>{driverPrefs.smoking ? "Permitted" : "Prohibited"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Pets:</Text>
              <Text style={s.value}>{driverPrefs.pets ? "Allowed" : "Not Allowed"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Air Conditioning:</Text>
              <Text style={s.value}>{driverPrefs.ac ? "Available" : "Unavailable"}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Conversation:</Text>
              <Text style={s.value}>{driverPrefs.talking ? "Open to conversation" : "Quiet ride preferred"}</Text>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={s.footer}>
        {req.status === 'pending' && (
          <View style={s.statusContainer}>
            <Text style={s.pendingText}>The other side has not accepted or rejected yet</Text>
            <TouchableOpacity 
               style={s.primaryBtn} 
               onPress={() => {
                 if (req?.chat_id) router.push(`/chat/${req.chat_id}`);
                 else Alert.alert("Notice", "Chat ID is missing.");
               }}
            >
              <Text style={s.primaryBtnText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {req.status === 'accepted' && (
          <View style={s.statusContainer}>
            <Text style={s.acceptedText}>Chat Confirmed</Text>
            <TouchableOpacity 
               style={s.primaryBtn} 
               onPress={() => {
                 if (req?.chat_id) router.push(`/chat/${req.chat_id}`);
                 else Alert.alert("Notice", "Chat ID is missing.");
               }}
            >
              <Text style={s.primaryBtnText}>Open Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {(req.status === 'rejected' || req.status === 'cancelled') && (
          <View style={s.rejectedContainer}>
            <Text style={s.rejectedText}>Close chat</Text>
          </View>
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
  driverRole: { fontSize: 13, color: "#666", marginTop: 4, fontWeight: "600" },
  section: { backgroundColor: "#fff", padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#EBEBEB" },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 10 },
  label: { fontSize: 14, color: "#666", fontWeight: "600" },
  value: { fontSize: 14, color: "#1A1A1A", fontWeight: "600", flex: 1, textAlign: "right" },
  
  footer: { padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#EBEBEB" },
  statusContainer: { alignItems: "center", gap: 14 },
  primaryBtn: { backgroundColor: "#0D0D0D", paddingVertical: 16, borderRadius: 16, alignItems: "center", width: "100%" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  
  pendingText: { fontSize: 14, color: "#666", fontWeight: "600", textAlign: "center" },
  acceptedText: { fontSize: 15, color: "#2E7D32", fontWeight: "700", textAlign: "center" },
  
  rejectedContainer: { backgroundColor: "#FFECEC", padding: 16, borderRadius: 12, alignItems: "center" },
  rejectedText: { fontSize: 15, color: "#D32F2F", fontWeight: "700" },
  
  errorText: { fontSize: 16, color: "#1A1A1A", textAlign: "center", marginTop: 100 },
  backBtn: { alignSelf: "center", marginTop: 20, padding: 10, backgroundColor: "#EBEBEB", borderRadius: 8 },
  backText: { fontWeight: "600" },
});
