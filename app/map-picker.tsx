import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import { setPendingLocationResult } from "../lib/locationPickerStore";

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

// Karachi — only used if geolocation fails and no initial coords provided
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

// ---------------------------------------------------------------------------
// HTML rendered inside the WebView — map only, no search widget
// ---------------------------------------------------------------------------
function buildMapHtml(
  initLat: number,
  initLng: number,
  hasCustomLocation: boolean,
  apiKey: string,
): string {
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
      <path d="M17 0C7.61 0 0 7.61 0 17c0 12.75 17 29 17 29s17-16.25 17-29C34 7.61 26.39 0 17 0z" fill="#0284c7"/>
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

      // Tell RN the map is moving so it shows "Finding address…"
      map.addListener('dragstart', function() {
        isMoving = true;
        post({ type: 'moving' });
      });

      // When map settles after drag, reverse geocode the center pin
      map.addListener('idle', function() {
        if (!isMoving) return;
        isMoving = false;
        var c = map.getCenter();
        if (geocodeTimer) clearTimeout(geocodeTimer);
        geocodeTimer = setTimeout(function() {
          reverseGeocode(c.lat(), c.lng());
        }, 400);
      });

      // If no saved location was passed in, find the user's real device position
      if (!hasCustomLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            var lat = pos.coords.latitude;
            var lng = pos.coords.longitude;
            map.panTo({ lat: lat, lng: lng });
            // Tell RN about the GPS fix so it can update coords display
            post({ type: 'user_location', lat: lat, lng: lng });
            // Geocode the GPS position to get an address
            reverseGeocode(lat, lng);
          },
          function() {
            // Permission denied or timeout — geocode the fallback center
            reverseGeocode(initLat, initLng);
          },
          { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
        );
      } else {
        // Already have custom coords — geocode them immediately
        reverseGeocode(initLat, initLng);
      }
    }
  </script>
  <!-- No "libraries=places" needed — geocoder is part of core Maps JS -->
  <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer></script>
</body>
</html>
  `.trim();
}

// ---------------------------------------------------------------------------
// Screen component
// ---------------------------------------------------------------------------
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
    locationType === "home"
      ? "Home"
      : locationType === "work"
        ? "Work"
        : locationName || "Location";

  const [coords, setCoords] = useState({ lat: initLat, lng: initLng });
  const [address, setAddress] = useState(initialAddress ?? "");
  const [isMoving, setIsMoving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build HTML once per mount — coords won't change after open
  const mapHtml = useRef(
    buildMapHtml(initLat, initLng, hasCustomLocation, MAPS_KEY),
  ).current;

  // ── WebView → RN messages ────────────────────────────────────────────────
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

  // ── Search: Places Autocomplete API called from RN (not WebView) ─────────
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

  // ── Place selected: fetch coords via Place Details, then pan the map ─────
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

      // Pan the WebView map to the chosen coordinates
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

  // ── Confirm ──────────────────────────────────────────────────────────────
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

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* ── Map ── */}
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

      {/* Loading overlay while tiles paint */}
      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading map…</Text>
        </View>
      )}

      {/* ── Top bar: back + native search input ── */}
      <View style={styles.topBar}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </Pressable>

        {/* Search input — native TextInput, not inside WebView */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={16}
            color="#94a3b8"
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder={`Search ${label.toLowerCase()} location`}
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching && (
            <ActivityIndicator
              size="small"
              color="#0284c7"
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      </View>

      {/* ── Autocomplete suggestions dropdown ── */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsList}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void onSelectSuggestion(item)}
                style={styles.suggestionRow}
              >
                <Ionicons
                  name="location-outline"
                  size={16}
                  color="#94a3b8"
                  style={{ marginTop: 2, marginRight: 10, flexShrink: 0 }}
                />
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

      {/* ── Bottom panel: address preview + confirm ── */}
      <View style={styles.bottomPanel}>
        <View style={styles.addressRow}>
          <Ionicons
            name="location-outline"
            size={20}
            color="#0284c7"
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            {isMoving ? (
              <View style={styles.geocodingRow}>
                <ActivityIndicator size="small" color="#0284c7" />
                <Text style={styles.geocodingText}>Finding address…</Text>
              </View>
            ) : (
              <Text style={styles.addressText} numberOfLines={2}>
                {address || "Move the map to select a location"}
              </Text>
            )}
            <Text style={styles.coordsText}>
              {label} · {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          style={[
            styles.confirmButton,
            { backgroundColor: canConfirm ? "#0f172a" : "#e2e8f0" },
          ]}
        >
          <Text
            style={[
              styles.confirmText,
              { color: canConfirm ? "#ffffff" : "#94a3b8" },
            ]}
          >
            Confirm {label} Location
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const TOP_OFFSET = Platform.OS === "ios" ? 60 : 40;

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  topBar: {
    position: "absolute",
    top: TOP_OFFSET,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 200,
  },
  backButton: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    padding: 0,
  },
  suggestionsList: {
    position: "absolute",
    top: TOP_OFFSET + 56,
    left: 16,
    right: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    zIndex: 300,
    maxHeight: 280,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 40,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  suggestionSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  geocodingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  geocodingText: {
    fontSize: 13,
    color: "#64748b",
  },
  addressText: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
  coordsText: {
    marginTop: 4,
    fontSize: 11,
    color: "#94a3b8",
  },
  confirmButton: {
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
