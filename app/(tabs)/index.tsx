import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { consumePendingLocationResult } from "../../lib/locationPickerStore";
import {
  deleteSavedLocation,
  getMyRiderProfile,
  SavedLocation,
  saveOrUpdateSavedLocation,
} from "../../lib/rider";

/* ── Icons ──────────────────────────────────────────────────── */

function PinIcon({ color = "#fff" }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx={12} cy={10} r={3} />
    </Svg>
  );
}

function DummyMap() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 320" preserveAspectRatio="xMidYMid slice">
      {/* Base background */}
      <Rect x={0} y={0} width={390} height={320} fill="#E8EAE6" />

      {/* Grid roads — horizontal */}
      <Rect x={0} y={48}  width={390} height={18} fill="#fff" />
      <Rect x={0} y={110} width={390} height={14} fill="#fff" />
      <Rect x={0} y={170} width={390} height={18} fill="#fff" />
      <Rect x={0} y={240} width={390} height={14} fill="#fff" />
      <Rect x={0} y={290} width={390} height={18} fill="#fff" />

      {/* Grid roads — vertical */}
      <Rect x={40}  y={0} width={18} height={320} fill="#fff" />
      <Rect x={110} y={0} width={14} height={320} fill="#fff" />
      <Rect x={180} y={0} width={20} height={320} fill="#fff" />
      <Rect x={260} y={0} width={14} height={320} fill="#fff" />
      <Rect x={330} y={0} width={18} height={320} fill="#fff" />

      {/* Road center dashes — horizontal main road */}
      <Rect x={0}   y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={36}  y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={72}  y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={108} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={144} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={200} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={236} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={280} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={316} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />
      <Rect x={352} y={57} width={28} height={2} rx={1} fill="#E0D9C0" />

      {/* Road center dashes — vertical main road */}
      <Rect x={189} y={0}   width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={36}  width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={72}  width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={108} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={196} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={232} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={268} width={2} height={28} rx={1} fill="#E0D9C0" />
      <Rect x={189} y={304} width={2} height={28} rx={1} fill="#E0D9C0" />

      {/* City blocks */}
      <Rect x={58}  y={0}   width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={0}   width={44} height={42} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={0}   width={44} height={42} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={0}   width={42} height={42} rx={4} fill="#D0D5CC" />

      <Rect x={0}   y={66}  width={34} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={58}  y={66}  width={44} height={38} rx={4} fill="#C8CCCA" />
      <Rect x={128} y={66}  width={44} height={38} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={66}  width={44} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={348} y={66}  width={42} height={38} rx={4} fill="#D8DDD4" />

      <Rect x={0}   y={124} width={34} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={58}  y={124} width={44} height={40} rx={4} fill="#D8DDD4" />
      <Rect x={128} y={124} width={44} height={40} rx={4} fill="#D0D5CC" />
      <Rect x={278} y={124} width={44} height={40} rx={4} fill="#C8CCCA" />
      <Rect x={348} y={124} width={42} height={40} rx={4} fill="#D8DDD4" />

      <Rect x={0}   y={188} width={34} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={58}  y={188} width={44} height={46} rx={4} fill="#D0D5CC" />
      <Rect x={128} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={278} y={188} width={44} height={46} rx={4} fill="#D8DDD4" />
      <Rect x={348} y={188} width={42} height={46} rx={4} fill="#D0D5CC" />

      <Rect x={0}   y={254} width={34} height={38} rx={4} fill="#D0D5CC" />
      <Rect x={58}  y={254} width={44} height={38} rx={4} fill="#D8DDD4" />
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
      <Circle cx={195} cy={162} r={18} fill="none" stroke="rgba(13,13,13,0.08)" strokeWidth={1.5} />
      <Circle cx={195} cy={162} r={28} fill="none" stroke="rgba(13,13,13,0.05)" strokeWidth={1.5} />
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

/* ── Screen ─────────────────────────────────────────────────── */

export default function HomeTabScreen() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  const refreshSavedLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const profile = await getMyRiderProfile();
      setSavedLocations(profile.saved_locations || []);
    } catch (error) {
      Alert.alert("Locations error", getApiErrorMessage(error));
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const hydrateHome = useCallback(async () => {
    try {
      const session = await loadSession();
      const currentRole = getPrimaryRole(session);
      setRole(currentRole);
      if (currentRole === "rider") {
        await refreshSavedLocations();
      }
    } catch (error) {
      Alert.alert("Home error", getApiErrorMessage(error));
    }
  }, [refreshSavedLocations]);

  const createSavedLocation = useCallback(
    async (result: { name?: string; address: string; latitude: number; longitude: number }) => {
      try {
        const profile = await getMyRiderProfile();
        const fallbackName = `Location ${profile.saved_locations.length + 1}`;
        await saveOrUpdateSavedLocation(profile, {
          name: result.name?.trim() || fallbackName,
          address: result.address || undefined,
          latitude: result.latitude,
          longitude: result.longitude,
          is_default: false,
        });
        await refreshSavedLocations();
      } catch (error) {
        Alert.alert("Add location failed", getApiErrorMessage(error));
      }
    },
    [refreshSavedLocations],
  );

  useEffect(() => { void hydrateHome(); }, [hydrateHome]);

  useFocusEffect(
    useCallback(() => {
      const result = consumePendingLocationResult();
      if (!result || result.type !== "saved") return;
      void createSavedLocation(result);
    }, [createSavedLocation]),
  );

  function onAddLocation() {
    setNewLocationName("");
    setShowAddLocationModal(true);
  }

  function onConfirmAddLocation(useCustomName: boolean) {
    const trimmedName = newLocationName.trim();
    setShowAddLocationModal(false);
    router.push({
      pathname: "/map-picker",
      params: {
        type: "saved",
        locationName: useCustomName && trimmedName ? trimmedName : "",
      },
    });
  }

  function onLocationPress(location: SavedLocation) {
    Alert.alert(location.name, location.address || "No address", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void onDeleteLocation(location.id),
      },
    ]);
  }

  async function onDeleteLocation(locationId: string) {
    try {
      await deleteSavedLocation(locationId);
      await refreshSavedLocations();
    } catch (error) {
      Alert.alert("Delete failed", getApiErrorMessage(error));
    }
  }

  const isDriver = role === "driver";
  const profileRoute = isDriver ? "/driver-profile" : "/profile";

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
            <TouchableOpacity style={s.profileBtn} onPress={() => router.push(profileRoute)}>
              <UserSvg />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom sheet */}
      <View style={s.sheet}>
        <View style={s.sheetHandle} />

        {isDriver ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.driverContent}>
            <Text style={s.driverTitle}>Driver Dashboard</Text>
            <Text style={s.driverSub}>Your rides and earnings will appear here soon.</Text>
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.push(profileRoute)}>
              <Text style={s.primaryBtnText}>View Driver Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Quick chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsInner}>
              {savedLocations.length > 0
                ? savedLocations.slice(0, 4).map((loc) => (
                    <TouchableOpacity key={loc.id} style={s.chip} onPress={() => onLocationPress(loc)}>
                      <Text style={s.chipText}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))
                : (
                  <>
                    <TouchableOpacity style={s.chip} onPress={onAddLocation}><Text style={s.chipText}>🏠 Home</Text></TouchableOpacity>
                    <TouchableOpacity style={s.chip} onPress={onAddLocation}><Text style={s.chipText}>💼 Work</Text></TouchableOpacity>
                    <TouchableOpacity style={s.chip} onPress={onAddLocation}><Text style={s.chipText}>🛍️ Mall</Text></TouchableOpacity>
                    <TouchableOpacity style={s.chip} onPress={onAddLocation}><Text style={s.chipText}>🏥 Hospital</Text></TouchableOpacity>
                  </>
                )
              }
            </ScrollView>

            {/* Confirm button */}
            <TouchableOpacity style={s.primaryBtn} onPress={onAddLocation}>
              <PinIcon />
              <Text style={s.primaryBtnText}>Confirm Pickup Location</Text>
            </TouchableOpacity>

            {/* Saved locations list */}
            {loadingLocations && (
              <View style={s.loadingRow}>
                <ActivityIndicator color="#0D0D0D" size="small" />
                <Text style={s.loadingText}>Loading locations…</Text>
              </View>
            )}

            {savedLocations.length > 0 && (
              <View style={s.savedSection}>
                <View style={s.savedHeader}>
                  <Text style={s.savedTitle}>Saved Locations</Text>
                  <TouchableOpacity style={s.addBtn} onPress={onAddLocation}>
                    <Text style={s.addBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
                {savedLocations.map((loc, i) => (
                  <TouchableOpacity
                    key={loc.id}
                    style={[s.savedItem, i < savedLocations.length - 1 && s.savedItemBorder]}
                    onPress={() => onLocationPress(loc)}
                  >
                    <View style={s.savedItemIcon}>
                      <PinIcon />
                    </View>
                    <View style={s.savedItemBody}>
                      <Text style={s.savedItemName}>{loc.name}</Text>
                      <Text style={s.savedItemAddr} numberOfLines={1}>{loc.address || "No address"}</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>

      {/* Add Location Modal */}
      <Modal
        visible={showAddLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddLocationModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Location</Text>
            <Text style={s.modalSub}>Enter a name or skip to use automatic naming.</Text>
            <TextInput
              value={newLocationName}
              onChangeText={setNewLocationName}
              placeholder="e.g. Gym, Grandma House"
              placeholderTextColor="#C2C2C2"
              style={s.modalInput}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowAddLocationModal(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSkip} onPress={() => onConfirmAddLocation(false)}>
                <Text style={s.modalSkipText}>Skip Name</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalContinue} onPress={() => onConfirmAddLocation(true)}>
                <Text style={s.modalContinueText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 16,
  },
  greeting: { fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: "500" },
  appName: { fontSize: 22, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.5, marginTop: 2 },
  profileBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },

  // Sheet
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 14,
    maxHeight: "72%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 16,
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: "#E0E0E0",
    borderRadius: 2, alignSelf: "center", marginBottom: 22,
  },

  // Chips
  chipsScroll: { marginBottom: 16 },
  chipsInner: { gap: 8, paddingRight: 4 },
  chip: {
    backgroundColor: "#F5F5F5", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#424242" },

  // Primary button
  primaryBtn: {
    backgroundColor: "#0D0D0D", borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, gap: 8, marginBottom: 20,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Loading
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: "#9E9E9E" },

  // Saved locations
  savedSection: { marginBottom: 8 },
  savedHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12,
  },
  savedTitle: { fontSize: 13, fontWeight: "700", color: "#0D0D0D" },
  addBtn: { backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 12, fontWeight: "600", color: "#424242" },
  savedItem: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
  },
  savedItemBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  savedItemIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#0D0D0D",
    alignItems: "center", justifyContent: "center",
  },
  savedItemBody: { flex: 1 },
  savedItemName: { fontSize: 13, fontWeight: "600", color: "#0D0D0D" },
  savedItemAddr: { fontSize: 11, color: "#9E9E9E", marginTop: 2 },
  chevron: { fontSize: 20, color: "#C2C2C2" },

  // Driver content
  driverContent: { paddingBottom: 24 },
  driverTitle: { fontSize: 20, fontWeight: "800", color: "#0D0D0D", letterSpacing: -0.5, marginBottom: 8 },
  driverSub: { fontSize: 14, color: "#9E9E9E", marginBottom: 20, lineHeight: 22 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: { width: "100%", backgroundColor: "#fff", borderRadius: 20, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0D0D0D", marginBottom: 6 },
  modalSub: { fontSize: 13, color: "#9E9E9E", marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 14,
    backgroundColor: "#FAFAFA", paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: "#0D0D0D", marginBottom: 16,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E8E8E8", backgroundColor: "#F8F8F8",
  },
  modalCancelText: { fontSize: 13, fontWeight: "600", color: "#757575" },
  modalSkip: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: "#E8E8E8", backgroundColor: "#fff",
  },
  modalSkipText: { fontSize: 13, fontWeight: "600", color: "#424242" },
  modalContinue: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14,
    backgroundColor: "#0D0D0D",
  },
  modalContinueText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
