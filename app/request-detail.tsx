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
import { API_BASE_URL } from "../lib/config";
import { IncomingRequest, acceptMatchRequest, rejectMatchRequest } from "../lib/match";
import { getDriverPreferences, DriverPreferences } from "../lib/driver";

function BackSvg() {
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
  const dataString = params.data as string;

  let initialRequest: IncomingRequest | null = null;
  try {
    if (dataString) initialRequest = JSON.parse(dataString);
  } catch (e) {}

  const [request, setRequest] = useState<IncomingRequest | null>(initialRequest);
  const [driverPrefs, setDriverPrefs] = useState<DriverPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadPrefs() {
      if (!request?.driver_id || request.my_role !== 'rider') return;
      setLoadingPrefs(true);
      try {
        const prefs = await getDriverPreferences(request.driver_id);
        setDriverPrefs(prefs);
      } catch (err) {
        console.warn("Failed to load driver preferences", err);
      } finally {
        setLoadingPrefs(false);
      }
    }
    loadPrefs();
  }, [request?.driver_id, request?.my_role]);

  if (!request) {
    return (
      <SafeAreaView style={s.root}>
        <ActivityIndicator color="#0D0D0D" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const partyName = request.other_party_name || "User";
  const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const safePath = request.other_party_avatar_url?.startsWith('/') ? request.other_party_avatar_url.substring(1) : request.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  const isIncoming = request.initiator !== request.my_role;

  const handleAccept = async () => {
    if (!request?.id) return;
    setSubmitting(true);
    try {
      await acceptMatchRequest(request.id);
      Alert.alert("Success", "Request accepted successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request?.id) return;
    setSubmitting(true);
    try {
      await rejectMatchRequest(request.id);
      Alert.alert("Success", "Request rejected.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!request?.id) return;
    setSubmitting(true);
    try {
      // Assuming cancelMatchRequest is imported from lib/match.ts
      const { cancelMatchRequest } = await import("../lib/match");
      await cancelMatchRequest(request.id);
      Alert.alert("Success", "Request cancelled.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to cancel request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Request Detail</Text>
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
              <Text style={s.name}>{partyName}</Text>
              <Text style={s.roleText}>{request.my_role === 'driver' ? 'Rider' : 'Driver'}</Text>
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{request.status}</Text>
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Ride Details</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>From</Text>
              <Text style={s.infoValue}>{request.origin_address || "Unknown"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>To</Text>
              <Text style={s.infoValue}>{request.dest_address || "Unknown"}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Departure</Text>
              <Text style={s.infoValue}>{formatDateTime(request.departure_time)}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Price per seat</Text>
              <Text style={s.infoValue}>PKR {request.price_per_seat || 0}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Gender Preference</Text>
              <Text style={[s.infoValue, {textTransform: 'capitalize'}]}>{request.gender_pref || "Any"}</Text>
            </View>
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

          {loadingPrefs && (
            <ActivityIndicator color="#0D0D0D" style={{ marginBottom: 16 }} />
          )}

        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity 
            style={s.chatBtn} 
            onPress={() => request.chat_id && router.push(`/chat/${request.chat_id}`)}
          >
            <Text style={s.chatBtnText}>Open Chat</Text>
          </TouchableOpacity>

          {isIncoming ? (
            <View style={s.actionRow}>
              <TouchableOpacity 
                style={[s.actionBtn, s.rejectBtn, (submitting || request.status !== 'pending') && s.actionBtnDisabled]} 
                onPress={handleReject}
                disabled={submitting || request.status !== 'pending'}
              >
                {submitting ? <ActivityIndicator size="small" color="#F5222D" /> : <Text style={s.rejectBtnText}>Reject</Text>}
              </TouchableOpacity>

              <TouchableOpacity 
                style={[s.actionBtn, s.acceptBtn, (submitting || request.status !== 'pending') && s.actionBtnDisabled]} 
                onPress={handleAccept}
                disabled={submitting || request.status !== 'pending'}
              >
                {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.acceptBtnText}>Accept</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            request.status === 'pending' && (
              <TouchableOpacity 
                style={[s.actionBtn, s.rejectBtn, submitting && s.actionBtnDisabled]} 
                onPress={handleCancel}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator size="small" color="#F5222D" /> : <Text style={s.rejectBtnText}>Cancel Request</Text>}
              </TouchableOpacity>
            )
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
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 160,
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EBEBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#666" },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  roleText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: "#FFF9C4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFF176",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F57F17",
    textTransform: "uppercase",
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
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 10 },
  label: { fontSize: 14, color: "#666", fontWeight: "600" },
  value: { fontSize: 14, color: "#1A1A1A", fontWeight: "600", flex: 1, textAlign: "right" },
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    gap: 12,
  },
  chatBtn: {
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  chatBtnText: {
    color: "#1A1A1A",
    fontSize: 15,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  acceptBtn: {
    backgroundColor: "#0D0D0D",
  },
  rejectBtn: {
    backgroundColor: "#FFF1F0",
    borderWidth: 1,
    borderColor: "#FFA39E",
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  rejectBtnText: {
    color: "#F5222D",
    fontSize: 15,
    fontWeight: "800",
  },
});
