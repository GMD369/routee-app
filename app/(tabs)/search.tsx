import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { getApiErrorMessage } from "../../lib/auth";
import { getPlaceDetails, getPlacePredictions, PlacePrediction } from "../../lib/geocoding";
import { consumePendingLocationResult } from "../../lib/locationPickerStore";
import { RideSearchResult, searchRides } from "../../lib/ride";
import { API_BASE_URL } from "../../lib/config";
import { Image } from "expo-image";

/* ── Icons ──────────────────────────────────────────────────── */

function MapPinIcon() {
  return (
    <Svg width={36} height={36} viewBox="0 0 36 36">
      <Rect x={2} y={2} width={32} height={32} rx={8} fill="#E8F0FE" />
      <Line x1={4} y1={18} x2={32} y2={18} stroke="#BFCFE9" strokeWidth={3} strokeLinecap="round" />
      <Line x1={18} y1={4} x2={18} y2={32} stroke="#BFCFE9" strokeWidth={3} strokeLinecap="round" />
      <Path d="M18 8 C15.2 8 13 10.2 13 13 C13 16.5 18 22 18 22 C18 22 23 16.5 23 13 C23 10.2 20.8 8 18 8 Z" fill="#4F6FC2" />
      <Circle cx={18} cy={13} r={2.2} fill="#fff" />
    </Svg>
  );
}

/* ── Avatar ─────────────────────────────────────────────────── */

const AVATAR_COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6", "#F97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarImage({ uri, initials, size = 48 }: { uri: string | null; initials: string; size?: number }) {
  const [error, setError] = useState(false);
  const bg = getAvatarColor(initials || "D");
  const style = {
    width: size, height: size, borderRadius: size * 0.28,
    backgroundColor: error || !uri ? bg : "#DDD",
    alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const,
  };
  if (uri && !error) {
    return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />;
  }
  return <View style={style}><Text style={{ fontSize: size * 0.36, fontWeight: "800", color: "#fff" }}>{initials}</Text></View>;
}

/* ── Address field state ─────────────────────────────────────── */

type PointState = {
  address: string;
  lat: number | null;
  lng: number | null;
  predictions: PlacePrediction[];
  loading: boolean;
};

const emptyPoint = (): PointState => ({ address: "", lat: null, lng: null, predictions: [], loading: false });

/* ── Result card ─────────────────────────────────────────────── */

function formatTime(value: string) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function RideCard({ ride }: { ride: RideSearchResult }) {
  const driverName = ride.driver_full_name ?? "Driver";
  const initials = driverName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const safePath = ride.driver_avatar_url?.startsWith("/") ? ride.driver_avatar_url.substring(1) : ride.driver_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
  const rating = ride.driver_rating_avg ? `⭐ ${ride.driver_rating_avg.toFixed(1)}` : "New";

  return (
    <TouchableOpacity
      style={rc.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: `/recommendation/${ride.id}` as any, params: { data: JSON.stringify(ride), pairId: "" } })}
    >
      {/* Driver row */}
      <View style={rc.driverRow}>
        <AvatarImage uri={avatarUri} initials={initials} size={46} />
        <View style={rc.driverInfo}>
          <Text style={rc.driverName}>{driverName}</Text>
          <Text style={rc.driverRating}>{rating}</Text>
        </View>
        <View style={rc.pricePill}>
          <Text style={rc.priceText}>PKR {ride.price_per_seat}</Text>
          <Text style={rc.priceSub}>/seat</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={rc.divider} />

      {/* Route */}
      <View style={rc.routeBox}>
        <View style={rc.routeRow}>
          <View style={rc.dotGreen} />
          <Text style={rc.routeAddr} numberOfLines={1}>{ride.origin_address}</Text>
        </View>
        <View style={rc.connector}><View style={rc.connLine} /></View>
        <View style={rc.routeRow}>
          <View style={rc.dotRed} />
          <Text style={rc.routeAddr} numberOfLines={1}>{ride.dest_address}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={rc.footer}>
        <Text style={rc.footerTime}>🕐 {formatTime(ride.departure_time)}</Text>
        <View style={rc.pillsRow}>
          <View style={rc.seatPill}>
            <Text style={rc.seatText}>💺 {ride.available_seats}/{ride.total_seats}</Text>
          </View>
          {ride.gender_pref !== "any" && (
            <View style={rc.genderPill}>
              <Text style={rc.genderText}>{ride.gender_pref === "male" ? "♂ Male" : "♀ Female"}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    marginBottom: 12,
  },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  driverRating: { fontSize: 12, color: "#888", marginTop: 2, fontWeight: "500" },
  pricePill: { alignItems: "flex-end" },
  priceText: { fontSize: 15, fontWeight: "800", color: "#0D0D0D" },
  priceSub: { fontSize: 10, color: "#888", fontWeight: "500" },
  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
  routeBox: { gap: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  connector: { paddingLeft: 3, paddingVertical: 2 },
  connLine: { width: 1.5, height: 12, backgroundColor: "#D0D0D0", marginLeft: 3 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A", flexShrink: 0 },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", flexShrink: 0 },
  routeAddr: { flex: 1, fontSize: 13, color: "#1A1A1A", fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  footerTime: { fontSize: 12, color: "#888", fontWeight: "500" },
  pillsRow: { flexDirection: "row", gap: 6 },
  seatPill: { backgroundColor: "#F5F5F5", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#EBEBEB" },
  seatText: { fontSize: 11, fontWeight: "600", color: "#444" },
  genderPill: { backgroundColor: "#EFF6FF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#BFDBFE" },
  genderText: { fontSize: 11, fontWeight: "600", color: "#2563EB" },
});

/* ── Main screen ─────────────────────────────────────────────── */

type GenderFilter = "any" | "male" | "female";

export default function SearchScreen() {
  const [origin, setOrigin] = useState<PointState>(emptyPoint());
  const [dest, setDest] = useState<PointState>(emptyPoint());
  const [departureTime, setDepartureTime] = useState<Date>(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); return d;
  });
  const [hasTime, setHasTime] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [gender, setGender] = useState<GenderFilter>("any");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RideSearchResult[] | null>(null);
  const originTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* consume map-picker result */
  useFocusEffect(useCallback(() => {
    const r = consumePendingLocationResult();
    if (!r) return;
    const point: Partial<PointState> = { address: r.address, lat: r.latitude, lng: r.longitude, predictions: [], loading: false };
    if (r.type === "search-origin") setOrigin(p => ({ ...p, ...point }));
    else if (r.type === "search-dest") setDest(p => ({ ...p, ...point }));
  }, []));

  function onAddressChange(which: "origin" | "dest", text: string) {
    const setter = which === "origin" ? setOrigin : setDest;
    const timer = which === "origin" ? originTimer : destTimer;
    setter(p => ({ ...p, address: text, lat: null, lng: null, predictions: [], loading: text.trim().length >= 2 }));
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) return;
    timer.current = setTimeout(async () => {
      const preds = await getPlacePredictions(text);
      setter(p => ({ ...p, predictions: preds, loading: false }));
    }, 350);
  }

  async function onSelectPrediction(which: "origin" | "dest", pred: PlacePrediction) {
    const setter = which === "origin" ? setOrigin : setDest;
    setter(p => ({ ...p, loading: true, predictions: [] }));
    const details = await getPlaceDetails(pred.place_id);
    if (details) {
      setter({ address: details.address, lat: details.latitude, lng: details.longitude, predictions: [], loading: false });
    } else {
      setter(p => ({ ...p, loading: false }));
    }
  }

  function openMap(which: "origin" | "dest") {
    router.push({ pathname: "/map-picker", params: { type: `search-${which}`, locationName: which === "origin" ? "Pickup" : "Destination" } });
  }

  async function handleSearch() {
    if (!origin.lat || !origin.lng) { Alert.alert("Missing", "Please set a pickup location."); return; }
    if (!dest.lat || !dest.lng) { Alert.alert("Missing", "Please set a destination."); return; }
    if (!hasTime) { Alert.alert("Missing", "Please set a departure time."); return; }

    setSearching(true);
    setResults(null);
    try {
      const time = `${departureTime.getHours().toString().padStart(2, "0")}:${departureTime.getMinutes().toString().padStart(2, "0")}:00`;
      const data = await searchRides({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        dest_lat: dest.lat,
        dest_lng: dest.lng,
        departure_time: time,
        gender: gender !== "any" ? gender : undefined,
      });
      setResults(data);
    } catch (error) {
      Alert.alert("Search failed", getApiErrorMessage(error));
    } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Search Rides</Text>
          <Text style={s.subtitle}>Find a ride along your route</Text>
        </View>

        {/* Form card */}
        <View style={s.formCard}>
          {/* Origin */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>From</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="Enter pickup address"
                placeholderTextColor="#ABABAB"
                value={origin.address}
                onChangeText={t => onAddressChange("origin", t)}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.mapBtn} onPress={() => openMap("origin")}>
                <MapPinIcon />
              </TouchableOpacity>
            </View>
            {origin.loading && (
              <View style={s.suggestRow}><ActivityIndicator size="small" color="#888" /><Text style={s.suggestHint}>Searching…</Text></View>
            )}
            {origin.predictions.length > 0 && (
              <View style={s.suggestionBox}>
                {origin.predictions.map(p => (
                  <TouchableOpacity key={p.place_id} style={s.suggestionItem} onPress={() => void onSelectPrediction("origin", p)}>
                    <Text style={s.suggMain} numberOfLines={1}>{p.main_text}</Text>
                    {p.secondary_text ? <Text style={s.suggSub} numberOfLines={1}>{p.secondary_text}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Connector */}
          <View style={s.routeConnector}>
            <View style={s.dotGreen} />
            <View style={s.connLine} />
            <View style={s.dotRed} />
          </View>

          {/* Destination */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>To</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="Enter destination address"
                placeholderTextColor="#ABABAB"
                value={dest.address}
                onChangeText={t => onAddressChange("dest", t)}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.mapBtn} onPress={() => openMap("dest")}>
                <MapPinIcon />
              </TouchableOpacity>
            </View>
            {dest.loading && (
              <View style={s.suggestRow}><ActivityIndicator size="small" color="#888" /><Text style={s.suggestHint}>Searching…</Text></View>
            )}
            {dest.predictions.length > 0 && (
              <View style={s.suggestionBox}>
                {dest.predictions.map(p => (
                  <TouchableOpacity key={p.place_id} style={s.suggestionItem} onPress={() => void onSelectPrediction("dest", p)}>
                    <Text style={s.suggMain} numberOfLines={1}>{p.main_text}</Text>
                    {p.secondary_text ? <Text style={s.suggSub} numberOfLines={1}>{p.secondary_text}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.fieldDivider} />

          {/* Departure time */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Departure Time</Text>
            <View style={s.timeRow}>
              <TouchableOpacity style={s.timeBtn} onPress={() => setShowTimePicker(true)}>
                <Text style={[s.timeBtnText, !hasTime && s.timeBtnPlaceholder]}>
                  {hasTime
                    ? departureTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Select time"}
                </Text>
              </TouchableOpacity>
              {hasTime && (
                <TouchableOpacity style={s.clearBtn} onPress={() => setHasTime(false)}>
                  <Text style={s.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={departureTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (d) { setDepartureTime(d); setHasTime(true); }
                }}
              />
            )}
          </View>

          <View style={s.fieldDivider} />

          {/* Gender filter */}
          <View style={s.fieldBlock}>
            <Text style={s.fieldLabel}>Gender Preference</Text>
            <View style={s.genderRow}>
              {(["any", "male", "female"] as GenderFilter[]).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, gender === g && s.genderBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[s.genderBtnText, gender === g && s.genderBtnTextActive]}>
                    {g === "any" ? "Any" : g === "male" ? "♂ Male" : "♀ Female"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search button */}
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.searchBtnText}>Search Rides</Text>}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {searching && (
          <View style={s.loadingCard}>
            <ActivityIndicator color="#0D0D0D" />
            <Text style={s.loadingText}>Searching nearby rides…</Text>
          </View>
        )}

        {results !== null && !searching && (
          <View style={s.resultsSection}>
            <Text style={s.resultsLabel}>
              {results.length === 0 ? "No rides found" : `${results.length} ride${results.length !== 1 ? "s" : ""} found`}
            </Text>
            {results.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={s.emptyTitle}>No rides match your route</Text>
                <Text style={s.emptySub}>Try adjusting your departure time or widening the pickup area.</Text>
              </View>
            ) : (
              results.map(ride => <RideCard key={ride.id} ride={ride} />)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },

  header: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#1A1A1A", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#888", marginTop: 3 },

  formCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3,
    marginBottom: 24,
  },

  fieldBlock: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8 },
  fieldDivider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 16 },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1, backgroundColor: "#F8F9FA", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1A1A1A", fontWeight: "500", borderWidth: 1, borderColor: "#EBEBEB",
  },
  mapBtn: { flexShrink: 0 },

  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 },
  suggestHint: { fontSize: 12, color: "#888" },
  suggestionBox: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#EBEBEB", overflow: "hidden" },
  suggestionItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  suggMain: { fontSize: 13, fontWeight: "600", color: "#1A1A1A" },
  suggSub: { fontSize: 11, color: "#888", marginTop: 2 },

  routeConnector: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 6, gap: 6 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" },
  connLine: { flex: 1, height: 1.5, backgroundColor: "#D0D0D0" },
  dotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeBtn: {
    flex: 1, backgroundColor: "#F8F9FA", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "#EBEBEB",
  },
  timeBtnText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A" },
  timeBtnPlaceholder: { color: "#ABABAB", fontWeight: "400" },
  clearBtn: { backgroundColor: "#FFF1F0", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#FCA5A5" },
  clearBtnText: { fontSize: 13, fontWeight: "700", color: "#DC2626" },

  genderRow: { flexDirection: "row", gap: 8 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#F5F5F5", alignItems: "center", borderWidth: 1, borderColor: "#EBEBEB" },
  genderBtnActive: { backgroundColor: "#0D0D0D", borderColor: "#0D0D0D" },
  genderBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },
  genderBtnTextActive: { color: "#fff" },

  searchBtn: { backgroundColor: "#0D0D0D", borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  searchBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  loadingCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#EBEBEB", marginBottom: 16 },
  loadingText: { fontSize: 14, color: "#888" },

  resultsSection: { gap: 0 },
  resultsLabel: { fontSize: 12, fontWeight: "700", color: "#A0A0A0", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 },

  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "#EBEBEB" },
  emptyEmoji: { fontSize: 40, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A", marginBottom: 8 },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
});
