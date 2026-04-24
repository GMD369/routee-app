import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { setPendingLocationResult } from "../lib/locationPickerStore";

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

const FALLBACK_LAT = 24.8607;
const FALLBACK_LNG = 67.0011;

type MapMessage =
  | { type: "location"; lat: number; lng: number; address: string }
  | { type: "moving" }
  | { type: "user_location"; lat: number; lng: number };

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

/* ── Icons ──────────────────────────────────────────────────── */

function BackArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M19 12H5" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

function PinIcon({ color = "#fff" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx={12} cy={10} r={3} />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={8} />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

/* ── Map HTML ───────────────────────────────────────────────── */

function buildMapHtml(initLat: number, initLng: number, hasCustomLocation: boolean, apiKey: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { position: absolute; inset: 0; }
    #pin {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -100%);
      z-index: 10;
      pointer-events: none;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.30));
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="pin">
    <svg width="34" height="46" viewBox="0 0 34 46" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61 0 0 7.61 0 17c0 12.75 17 29 17 29s17-16.25 17-29C34 7.61 26.39 0 17 0z" fill="#0D0D0D"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  </div>
  <script>
    var map, geocoder;
    var isMoving = false;
    var geocodeTimer = null;
    var initLat = ${initLat};
    var initLng = ${initLng};
    var hasCustomLocation = ${hasCustomLocation ? "true" : "false"};

    function post(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    function reverseGeocode(lat, lng) {
      geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
        var address = (status === 'OK' && results && results[0])
          ? results[0].formatted_address : '';
        post({ type: 'location', lat: lat, lng: lng, address: address });
      });
    }

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: initLat, lng: initLng },
        zoom: 15,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        clickableIcons: false,
      });
      geocoder = new google.maps.Geocoder();

      map.addListener('dragstart', function() {
        isMoving = true;
        post({ type: 'moving' });
      });

      map.addListener('idle', function() {
        if (!isMoving) return;
        isMoving = false;
        var c = map.getCenter();
        if (geocodeTimer) clearTimeout(geocodeTimer);
        geocodeTimer = setTimeout(function() {
          reverseGeocode(c.lat(), c.lng());
        }, 400);
      });

      if (!hasCustomLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            map.panTo({ lat: lat, lng: lng });
            post({ type: 'user_location', lat: lat, lng: lng });
            reverseGeocode(lat, lng);
          },
          function() { reverseGeocode(initLat, initLng); },
          { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
        );
      } else {
        reverseGeocode(initLat, initLng);
      }
    }
  </script>
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>
  `.trim();
}

/* ── Screen ─────────────────────────────────────────────────── */

export default function MapPickerScreen() {
  const { type, initialLat, initialLng, initialAddress, locationName } =
    useLocalSearchParams<{
      type: string;
      initialLat?: string;
      initialLng?: string;
      initialAddress?: string;
      locationName?: string;
    }>();

  const hasCustomLocation = Boolean(initialLat && initialLng);
  const initLat = hasCustomLocation ? Number(initialLat) : FALLBACK_LAT;
  const initLng = hasCustomLocation ? Number(initialLng) : FALLBACK_LNG;

  const locationType = type ?? "home";
  const label =
    locationType === "home" ? "Home"
    : locationType === "work" ? "Work"
    : locationName || "Location";

  const [coords, setCoords] = useState({ lat: initLat, lng: initLng });
  const [address, setAddress] = useState(initialAddress ?? "");
  const [isMoving, setIsMoving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapHtml = useRef(buildMapHtml(initLat, initLng, hasCustomLocation, MAPS_KEY)).current;

  // Bottom sheet snap positions
  const SNAP_COLLAPSED = Platform.OS === "ios" ? 162 : 150;
  const SNAP_EXPANDED  = Platform.OS === "ios" ? 430 : 410;

  const sheetHeight = useRef(new Animated.Value(SNAP_EXPANDED)).current;
  const snapRef = useRef(SNAP_EXPANDED);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderMove: (_, gs) => {
        const next = snapRef.current - gs.dy;
        sheetHeight.setValue(Math.max(SNAP_COLLAPSED, Math.min(SNAP_EXPANDED, next)));
      },
      onPanResponderRelease: (_, gs) => {
        const next = snapRef.current - gs.dy;
        const mid = (SNAP_COLLAPSED + SNAP_EXPANDED) / 2;
        const snapTo = next < mid ? SNAP_COLLAPSED : SNAP_EXPANDED;
        snapRef.current = snapTo;
        Animated.spring(sheetHeight, {
          toValue: snapTo,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  function toggleSheet() {
    const snapTo = snapRef.current === SNAP_EXPANDED ? SNAP_COLLAPSED : SNAP_EXPANDED;
    snapRef.current = snapTo;
    Animated.spring(sheetHeight, {
      toValue: snapTo,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as MapMessage;
      if (data.type === "moving") {
        setIsMoving(true);
      } else if (data.type === "location") {
        setCoords({ lat: data.lat, lng: data.lng });
        setAddress(data.address);
        setIsMoving(false);
      } else if (data.type === "user_location") {
        setCoords({ lat: data.lat, lng: data.lng });
      }
    } catch {
      // ignore malformed messages
    }
  }

  function onQueryChange(text: string) {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim() || text.length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(() => void fetchSuggestions(text), 350);
  }

  async function fetchSuggestions(input: string) {
    setSearching(true);
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
        `?input=${encodeURIComponent(input)}` +
        `&key=${MAPS_KEY}` +
        `&components=country:pk` +
        `&language=en` +
        `&types=geocode`;
      const res = await fetch(url);
      const json = (await res.json()) as { predictions: Prediction[] };
      setSuggestions(json.predictions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  async function onSelectSuggestion(prediction: Prediction) {
    setSuggestions([]);
    setQuery("");
    Keyboard.dismiss();
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${prediction.place_id}` +
        `&fields=geometry,formatted_address` +
        `&key=${MAPS_KEY}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        result: {
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
        };
      };
      const { lat, lng } = json.result.geometry.location;
      const addr = json.result.formatted_address;
      webViewRef.current?.injectJavaScript(`
        map.panTo({ lat: ${lat}, lng: ${lng} });
        map.setZoom(16);
        true;
      `);
      setCoords({ lat, lng });
      setAddress(addr);
    } catch {
      // keep current location
    }
  }

  function onConfirm() {
    setPendingLocationResult({
      type: locationType,
      name: locationName,
      address,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    router.back();
  }

  const canConfirm = Boolean(address) && !isMoving;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Map */}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={StyleSheet.absoluteFillObject}
        onMessage={onMessage}
        onLoad={() => setMapReady(true)}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        geolocationEnabled
      />

      {/* Loading overlay */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0D0D0D" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <BackArrow />
        </Pressable>

        <View style={styles.searchCard}>
          <Text style={styles.searchCardLabel}>SET {label.toUpperCase()}</Text>
          <View style={styles.searchRow}>
            <SearchIcon />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              placeholder={address || `Search ${label.toLowerCase()} location`}
              placeholderTextColor="#C2C2C2"
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searching && <ActivityIndicator size="small" color="#0D0D0D" style={{ marginLeft: 4 }} />}
          </View>
        </View>
      </View>

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => void onSelectSuggestion(item)} style={styles.suggestionRow}>
                <View style={styles.suggestionPinBox}>
                  <PinIcon color="#9E9E9E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Draggable bottom sheet */}
      <Animated.View style={[styles.bottomPanel, { height: sheetHeight }]}>
        {/* Drag handle — pan + tap to toggle */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleSheet}
          style={styles.handleArea}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* Address card — always visible when collapsed */}
        <View style={styles.addressCard}>
          <View style={styles.addressIconBox}>
            <PinIcon />
          </View>
          <View style={styles.addressBody}>
            {isMoving ? (
              <View style={styles.geocodingRow}>
                <ActivityIndicator size="small" color="#0D0D0D" />
                <Text style={styles.geocodingText}>Finding address…</Text>
              </View>
            ) : (
              <Text style={styles.addressMain} numberOfLines={1}>
                {address || "Move the map to select a location"}
              </Text>
            )}
            <Text style={styles.addressCoords}>
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          </View>
          <View style={styles.changeBadge}>
            <Text style={styles.changeBadgeText}>Drag</Text>
          </View>
        </View>

        {/* Nearby (decorative) — hidden when collapsed */}
        <Text style={styles.nearbyLabel}>NEARBY</Text>
        <View style={styles.nearbyList}>
          {[
            { name: "Nearby Places", tag: "Location" },
            { name: "Move pin to explore", tag: "Tip" },
            { name: "Search by name above", tag: "Search" },
          ].map((place, i) => (
            <View key={i} style={[styles.nearbyRow, i < 2 && styles.nearbyRowBorder]}>
              <View style={styles.nearbyIconBox}>
                <PinIcon color="#9E9E9E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nearbyName}>{place.name}</Text>
              </View>
              <View style={styles.nearbyTag}>
                <Text style={styles.nearbyTagText}>{place.tag}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Confirm button */}
        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        >
          <Text style={[styles.confirmBtnText, !canConfirm && styles.confirmBtnTextDisabled]}>
            Confirm {label} Location
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const TOP_OFFSET = Platform.OS === "ios" ? 60 : 40;

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#757575" },

  // Top bar
  topBar: {
    position: "absolute",
    top: TOP_OFFSET,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    zIndex: 200,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#EBEBEB",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginTop: 4,
  },
  searchCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
    borderWidth: 1.5, borderColor: "#EBEBEB",
  },
  searchCardLabel: {
    fontSize: 10, fontWeight: "700", color: "#9E9E9E",
    letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: {
    flex: 1, fontSize: 14, fontWeight: "600", color: "#0D0D0D", padding: 0,
  },

  // Suggestions
  suggestionsList: {
    position: "absolute",
    top: TOP_OFFSET + 80,
    left: 16, right: 16,
    backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 1.5, borderColor: "#EBEBEB",
    zIndex: 300, maxHeight: 280, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  suggestionRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  suggestionPinBox: { marginRight: 10, marginTop: 1 },
  separator: { height: 1, backgroundColor: "#F5F5F5", marginLeft: 42 },
  suggestionMain: { fontSize: 14, fontWeight: "600", color: "#0D0D0D" },
  suggestionSub: { fontSize: 12, color: "#9E9E9E", marginTop: 2 },

  // Bottom panel
  bottomPanel: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 16,
  },
  handleArea: {
    alignItems: "center", paddingVertical: 14,
  },
  handleBar: {
    width: 36, height: 4, backgroundColor: "#E0E0E0", borderRadius: 2,
  },

  // Address card
  addressCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#F8F8F8", borderRadius: 16, padding: 14, marginBottom: 16,
  },
  addressIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#0D0D0D",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  addressBody: { flex: 1 },
  geocodingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  geocodingText: { fontSize: 13, color: "#757575" },
  addressMain: { fontSize: 14, fontWeight: "700", color: "#0D0D0D", marginBottom: 2 },
  addressCoords: { fontSize: 11, color: "#9E9E9E" },
  changeBadge: {
    backgroundColor: "#EBEBEB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  changeBadgeText: { fontSize: 11, fontWeight: "600", color: "#424242" },

  // Nearby
  nearbyLabel: {
    fontSize: 12, fontWeight: "700", color: "#9E9E9E",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10,
  },
  nearbyList: { marginBottom: 20 },
  nearbyRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
  },
  nearbyRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  nearbyIconBox: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: "#F5F5F5",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  nearbyName: { fontSize: 13, fontWeight: "600", color: "#0D0D0D" },
  nearbyTag: {
    backgroundColor: "#F0F0F0", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  nearbyTagText: { fontSize: 11, fontWeight: "500", color: "#757575" },

  // Confirm button
  confirmBtn: {
    width: "100%", paddingVertical: 16, borderRadius: 16,
    backgroundColor: "#0D0D0D", alignItems: "center",
  },
  confirmBtnDisabled: { backgroundColor: "#E8E8E8" },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  confirmBtnTextDisabled: { color: "#9E9E9E" },
});
