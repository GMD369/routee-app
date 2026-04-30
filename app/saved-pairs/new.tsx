import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getApiErrorMessage } from "../../lib/auth";
import { consumePendingLocationResult } from "../../lib/locationPickerStore";
import {
    createSavedLocationPair,
    deleteSavedLocationPair,
    listSavedLocations,
    SavedLocationPairResponse,
} from "../../lib/rider";

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

type LocationField = "start" | "end";

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

type PointState = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  suggestions: Prediction[];
  searching: boolean;
};

export default function NewSavedPairScreen() {
  const [start, setStart] = useState<PointState>({
    name: "",
    address: "",
    latitude: null,
    longitude: null,
    suggestions: [],
    searching: false,
  });
  const [end, setEnd] = useState<PointState>({
    name: "",
    address: "",
    latitude: null,
    longitude: null,
    suggestions: [],
    searching: false,
  });
  const [loading, setLoading] = useState(false);
  const [savedPairs, setSavedPairs] = useState<SavedLocationPairResponse[]>([]);
  const [loadingSavedPairs, setLoadingSavedPairs] = useState(false);
  const searchTimers = useRef<
    Record<LocationField, ReturnType<typeof setTimeout> | null>
  >({
    start: null,
    end: null,
  });

  const clearFields = useCallback(() => {
    setStart({
      name: "",
      address: "",
      latitude: null,
      longitude: null,
      suggestions: [],
      searching: false,
    });
    setEnd({
      name: "",
      address: "",
      latitude: null,
      longitude: null,
      suggestions: [],
      searching: false,
    });
  }, []);

  const loadSavedPairs = useCallback(async () => {
    setLoadingSavedPairs(true);
    try {
      const pairs = await listSavedLocations();
      setSavedPairs(pairs);
    } catch (error) {
      Alert.alert("Saved locations", getApiErrorMessage(error));
    } finally {
      setLoadingSavedPairs(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const result = consumePendingLocationResult();
      if (!result) return;
      if (result.type === "start") {
        setStart((current) => ({
          ...current,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          name: result.name || current.name,
          suggestions: [],
          searching: false,
        }));
      } else if (result.type === "end") {
        setEnd((current) => ({
          ...current,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          name: result.name || current.name,
          suggestions: [],
          searching: false,
        }));
      }
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      void loadSavedPairs();
    }, [loadSavedPairs]),
  );

  function pickOnMap(which: LocationField) {
    router.push({
      pathname: "/map-picker",
      params: {
        type: which,
        locationName: which === "start" ? "From" : "To",
      },
    });
  }

  const startComplete = Boolean(
    start.latitude && start.longitude && start.address,
  );
  const endComplete = Boolean(end.latitude && end.longitude && end.address);

  function getPoint(which: LocationField) {
    return which === "start" ? start : end;
  }

  function setPoint(
    which: LocationField,
    updater: (current: PointState) => PointState,
  ) {
    if (which === "start") {
      setStart(updater);
    } else {
      setEnd(updater);
    }
  }

  function onAddressChange(which: LocationField, text: string) {
    setPoint(which, (current) => ({
      ...current,
      address: text,
      latitude: null,
      longitude: null,
      suggestions: [],
      searching: text.trim().length >= 2,
    }));

    const existingTimer = searchTimers.current[which];
    if (existingTimer) clearTimeout(existingTimer);

    if (text.trim().length < 2 || !MAPS_KEY) {
      return;
    }

    searchTimers.current[which] = setTimeout(() => {
      void fetchSuggestions(which, text);
    }, 350);
  }

  async function fetchSuggestions(which: LocationField, input: string) {
    setPoint(which, (current) => ({ ...current, searching: true }));
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(input)}` +
        `&key=${MAPS_KEY}` +
        `&components=country:pk` +
        `&language=en` +
        `&types=geocode`;
      const response = await fetch(url);
      const json = (await response.json()) as { predictions: Prediction[] };

      setPoint(which, (current) => ({
        ...current,
        suggestions: json.predictions ?? [],
        searching: false,
      }));
    } catch {
      setPoint(which, (current) => ({
        ...current,
        suggestions: [],
        searching: false,
      }));
    }
  }

  async function onSelectSuggestion(
    which: LocationField,
    prediction: Prediction,
  ) {
    setPoint(which, (current) => ({
      ...current,
      searching: true,
      suggestions: [],
    }));

    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${prediction.place_id}` +
        `&fields=geometry,formatted_address` +
        `&key=${MAPS_KEY}`;
      const response = await fetch(url);
      const json = (await response.json()) as {
        result: {
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
        };
      };

      const mainText = prediction.structured_formatting.main_text;
      const address = json.result.formatted_address || prediction.description;

      setPoint(which, (current) => ({
        ...current,
        name: mainText,
        address,
        latitude: json.result.geometry.location.lat,
        longitude: json.result.geometry.location.lng,
        searching: false,
      }));
    } catch {
      setPoint(which, (current) => ({ ...current, searching: false }));
    }
  }

  async function onSave() {
    if (!start.latitude || !start.longitude || !start.address) {
      Alert.alert("Missing from location", "Please pick a from location.");
      return;
    }
    if (!end.latitude || !end.longitude || !end.address) {
      Alert.alert("Missing to location", "Please pick a to location.");
      return;
    }

    setLoading(true);
    try {
      await createSavedLocationPair({
        start_location: {
          name: start.name.trim() || "From",
          address: start.address,
          latitude: start.latitude,
          longitude: start.longitude,
        },
        end_location: {
          name: end.name.trim() || "To",
          address: end.address,
          latitude: end.latitude,
          longitude: end.longitude,
        },
        is_default: false,
      });
      Alert.alert("Saved", "Location pair saved.");
      clearFields();
      void loadSavedPairs();
    } catch (error) {
      Alert.alert("Save failed", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function onDeletePair(pairId: string) {
    Alert.alert("Delete saved place", "Remove this saved place?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteSavedLocationPair(pairId);
              await loadSavedPairs();
              Alert.alert("Deleted", "Saved place removed.");
            } catch (error) {
              Alert.alert("Delete failed", getApiErrorMessage(error));
            }
          })();
        },
      },
    ]);
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.kicker}>Saved locations</Text>
      <Text style={s.title}>Please Enter Location here</Text>

      <View style={s.progressRow}>
        <StatusChip label="From" filled={startComplete} />
        <StatusChip label="To" filled={endComplete} />
      </View>

      <View style={s.card}>
        <LocationFieldCard
          title="From"
          value={start.address}
          onChangeText={(text) => onAddressChange("start", text)}
          onMapPress={() => pickOnMap("start")}
          placeholder="Type Address in From"
          point={start}
          onSelectSuggestion={(prediction) =>
            void onSelectSuggestion("start", prediction)
          }
        />
      </View>

      <View style={s.card}>
        <LocationFieldCard
          title="To"
          value={end.address}
          onChangeText={(text) => onAddressChange("end", text)}
          onMapPress={() => pickOnMap("end")}
          placeholder="Type Address in To"
          point={end}
          onSelectSuggestion={(prediction) =>
            void onSelectSuggestion("end", prediction)
          }
        />
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={onSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.saveBtnText}>Save Pair</Text>
        )}
      </TouchableOpacity>

      <View style={s.savedSection}>
        <Text style={s.savedTitle}>Saved Places</Text>
        {loadingSavedPairs ? (
          <View style={s.savedEmptyCard}>
            <ActivityIndicator color="#111111" />
            <Text style={s.savedEmptyText}>Loading saved places...</Text>
          </View>
        ) : savedPairs.length > 0 ? (
          <View style={s.savedList}>
            {savedPairs.map((pair, index) => {
              const startLocation = pair.start_location;
              const endLocation = pair.end_location;

              return (
                <View key={pair.pair_id} style={s.savedItem}>
                  <View style={s.savedItemTopRow}>
                    <View style={s.savedItemIcon}>
                      <Text style={s.savedItemIconText}>⌖</Text>
                    </View>
                    <View style={s.savedItemBody}>
                      <Text style={s.savedItemTitle} numberOfLines={1}>
                        {startLocation?.name || "From"} to{" "}
                        {endLocation?.name || "To"}
                      </Text>
                      <Text style={s.savedItemSub} numberOfLines={1}>
                        {startLocation?.address || "No from address"}
                      </Text>
                      <Text style={s.savedItemSub} numberOfLines={1}>
                        {endLocation?.address || "No to address"}
                      </Text>
                    </View>
                    <View style={s.savedItemBadge}>
                      <Text style={s.savedItemBadgeText}>
                        {pair.is_default ? "Default" : `#${index + 1}`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => void onDeletePair(pair.pair_id)}
                  >
                    <Text style={s.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.savedEmptyCard}>
            <Text style={s.savedEmptyText}>No saved places yet.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MapIcon() {
  return (
    <View style={s.mapIconWrap}>
      <Text style={s.mapIconGlyph}>⌖</Text>
    </View>
  );
}

function LocationFieldCard({
  title,
  value,
  placeholder,
  point,
  onChangeText,
  onMapPress,
  onSelectSuggestion,
}: {
  title: string;
  value: string;
  placeholder: string;
  point: PointState;
  onChangeText: (text: string) => void;
  onMapPress: () => void;
  onSelectSuggestion: (prediction: Prediction) => void;
}) {
  return (
    <View style={s.fieldBlock}>
      <View style={s.fieldHeader}>
        <Text style={s.fieldTitle}>{title}</Text>
        <Pressable onPress={onMapPress} style={s.mapButton} hitSlop={10}>
          <MapIcon />
        </Pressable>
      </View>

      <View style={s.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9C9588"
          style={s.input}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {point.searching ? (
        <View style={s.searchingRow}>
          <ActivityIndicator size="small" color="#111111" />
          <Text style={s.searchingText}>Searching addresses...</Text>
        </View>
      ) : null}

      {point.suggestions.length > 0 ? (
        <View style={s.suggestionsBox}>
          {point.suggestions.map((item) => (
            <Pressable
              key={item.place_id}
              onPress={() => onSelectSuggestion(item)}
              style={s.suggestionItem}
            >
              <View style={s.suggestionIcon}>
                <MapIcon />
              </View>
              <View style={s.suggestionBody}>
                <Text style={s.suggestionMain} numberOfLines={1}>
                  {item.structured_formatting.main_text}
                </Text>
                <Text style={s.suggestionSub} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.tabBtn, active && s.tabBtnActive]}>
      <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatusChip({ label, filled }: { label: string; filled: boolean }) {
  return (
    <View
      style={[s.statusChip, filled ? s.statusChipFilled : s.statusChipEmpty]}
    >
      <Text style={[s.statusChipText, filled && s.statusChipTextFilled]}>
        {label} {filled ? "ready" : "pending"}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F4EF" },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7D63",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 14, lineHeight: 22, color: "#6E6A61" },
  progressRow: { flexDirection: "row", gap: 10 },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  statusChipFilled: { backgroundColor: "#111111", borderColor: "#111111" },
  statusChipEmpty: { backgroundColor: "#FFFFFF", borderColor: "#E5E0D7" },
  statusChipText: { fontSize: 12, fontWeight: "700", color: "#7A7468" },
  statusChipTextFilled: { color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9E3D8",
    padding: 18,
    gap: 10,
  },
  fieldBlock: { gap: 10 },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fieldTitle: { fontSize: 18, fontWeight: "900", color: "#111111" },
  mapButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F0ECE4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E4DDD1",
  },
  mapIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  mapIconGlyph: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: -1,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: "#E9E3D8",
    borderRadius: 18,
    backgroundColor: "#FBFAF7",
    paddingHorizontal: 14,
  },
  input: {
    color: "#111111",
    fontSize: 15,
    paddingVertical: 14,
  },
  searchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  searchingText: { fontSize: 13, color: "#7C776B" },
  suggestionsBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9E3D8",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2EEE6",
  },
  suggestionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F5F2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionBody: { flex: 1 },
  suggestionMain: { fontSize: 14, fontWeight: "800", color: "#111111" },
  suggestionSub: { marginTop: 2, fontSize: 12, color: "#7C776B" },
  savedSection: { gap: 10, paddingTop: 4 },
  savedTitle: { fontSize: 18, fontWeight: "900", color: "#111111" },
  savedList: { gap: 12 },
  savedItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E9E3D8",
    padding: 14,
  },
  savedItemTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  savedItemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  savedItemIconText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  savedItemBody: { flex: 1, gap: 2 },
  savedItemTitle: { fontSize: 14, fontWeight: "900", color: "#111111" },
  savedItemSub: { fontSize: 12, color: "#7C776B" },
  savedItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F5F2EC",
  },
  savedItemBadgeText: { fontSize: 11, fontWeight: "800", color: "#6E6A61" },
  deleteBtn: {
    alignSelf: "flex-end",
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FDECEC",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "800", color: "#C62828" },
  savedEmptyCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9E3D8",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  savedEmptyText: { fontSize: 13, color: "#7C776B" },
  saveBtn: {
    marginTop: 2,
    backgroundColor: "#0D0D0D",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
