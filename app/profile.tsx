import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { clearSession, getApiErrorMessage, loadSession } from "../lib/auth";
import {
  getMyRiderProfile,
  RiderPreferences,
  RiderProfile,
  updateRiderPreferences,
} from "../lib/rider";

/* ── Icons ──────────────────────────────────────────────────── */

function EditIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

function AvatarIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function ChevronIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#C2C2C2" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  );
}

function BackArrow() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M19 12H5" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

/* ── Custom toggle ──────────────────────────────────────────── */

function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={[s.toggle, value && s.toggleOn]} activeOpacity={0.8}>
      <View style={[s.toggleThumb, value && s.toggleThumbOn]} />
    </TouchableOpacity>
  );
}

/* ── Preference rows config ─────────────────────────────────── */

const PREF_ROWS: { key: keyof RiderPreferences; icon: string; label: string; sub: string }[] = [
  { key: "music_ok", icon: "🎵", label: "Music in Car", sub: "Allowed during rides" },
  { key: "quiet_ride", icon: "💬", label: "Quiet Ride", sub: "Minimal conversation" },
  { key: "female_only", icon: "🔒", label: "Female-only Matching", sub: "Match with female drivers" },
  { key: "uni_student", icon: "🎓", label: "University Student", sub: "Student commute priority" },
  { key: "corporate_employee", icon: "💼", label: "Corporate Employee", sub: "Priority matching" },
];

/* ── Screen ─────────────────────────────────────────────────── */

export default function RiderProfileScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [preferences, setPreferences] = useState<RiderPreferences>({
    uni_student: false,
    corporate_employee: false,
    female_only: false,
    music_ok: false,
    quiet_ride: false,
  });

  const stats = useMemo(() => {
    if (!profile) return null;
    return {
      rating: Number(profile.rating_avg || 0).toFixed(2),
      count: profile.rating_count || 0,
      rides: profile.total_rides_taken || 0,
    };
  }, [profile]);

  useEffect(() => { void initialize(); }, []);

  async function initialize() {
    setLoading(true);
    try {
      const existingSession = await loadSession();
      if (!existingSession) {
        setIsLoggedIn(false);
        setProfile(null);
        return;
      }
      setIsLoggedIn(true);
      await fetchProfile();
    } catch (error) {
      Alert.alert("Session error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  }

  async function fetchProfile() {
    const riderProfile = await getMyRiderProfile();
    setProfile(riderProfile);
    setPreferences(riderProfile.preferences);
  }

  function setPreferenceFlag<K extends keyof RiderPreferences>(key: K, value: RiderPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function onSavePreferences() {
    setSavingPrefs(true);
    try {
      const updatedProfile = await updateRiderPreferences(preferences);
      setProfile(updatedProfile);
      Alert.alert("Saved", "Your rider preferences were updated.");
    } catch (error) {
      Alert.alert("Save failed", getApiErrorMessage(error));
    } finally {
      setSavingPrefs(false);
    }
  }

  async function onLogout() {
    await clearSession();
    setIsLoggedIn(false);
    setProfile(null);
    router.replace("/login");
  }

  /* ── Loading ──────────────────────────────────────────────── */

  if (!sessionChecked || loading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator color="#0D0D0D" size="large" />
        <Text style={s.loadingScreenText}>Loading profile…</Text>
      </View>
    );
  }

  /* ── Not logged in ──────────────────────────────────────────── */

  if (!isLoggedIn) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <SafeAreaView edges={["top"]}>
            <View style={s.headerTopRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
                <BackArrow />
              </TouchableOpacity>
              <Text style={s.headerTitle}>My Profile</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </View>
        <ScrollView style={s.body} contentContainerStyle={s.bodyContent}>
          <View style={s.card}>
            <Text style={s.cardHeading}>Welcome to Musafee</Text>
            <Text style={s.cardSubtitle}>Login to view and update your rider profile.</Text>
            <TouchableOpacity style={[s.actionBtn, { marginTop: 20 }]} onPress={() => router.push("/login")}>
              <Text style={s.actionBtnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.outlineBtn, { marginTop: 12 }]} onPress={() => router.push("/signup")}>
              <Text style={s.outlineBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  /* ── Logged in ──────────────────────────────────────────────── */

  return (
    <View style={s.root}>
      {/* Dark header */}
      <View style={s.header}>
        <SafeAreaView edges={["top"]}>
          {/* Title row */}
          <View style={s.headerTopRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <BackArrow />
            </TouchableOpacity>
            <Text style={s.headerTitle}>My Profile</Text>
            <TouchableOpacity style={s.editBtn}>
              <EditIcon />
            </TouchableOpacity>
          </View>

          {/* Avatar row */}
          <View style={s.avatarRow}>
            <View style={s.avatarWrap}>
              <View style={s.avatar}>
                <AvatarIcon />
              </View>
              <View style={s.onlineDot} />
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>Rider Account</Text>
              <Text style={s.profileSub}>Musafee Member</Text>
              <View style={s.badgesRow}>
                {stats && (
                  <View style={s.ratingBadge}>
                    <Text style={s.ratingBadgeText}>⭐ {stats.rating}</Text>
                  </View>
                )}
                <View style={s.verifiedBadge}>
                  <Text style={s.verifiedBadgeText}>Verified ✓</Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Scrollable body */}
      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* Stats card */}
        {stats && (
          <View style={s.card}>
            <Text style={s.cardLabel}>RIDE STATS</Text>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statVal}>{stats.rides}</Text>
                <Text style={s.statLbl}>Total Rides</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statVal}>{stats.rating}</Text>
                <Text style={s.statLbl}>Avg Rating</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statVal}>{stats.count}</Text>
                <Text style={s.statLbl}>Ratings</Text>
              </View>
            </View>
          </View>
        )}

        {/* Ride Preferences card */}
        <View style={s.card}>
          <Text style={s.cardLabel}>RIDE PREFERENCES</Text>
          {PREF_ROWS.map((row, i) => (
            <View key={row.key} style={[s.prefRow, i > 0 && s.prefRowBorder]}>
              <Text style={s.prefIcon}>{row.icon}</Text>
              <View style={s.prefBody}>
                <Text style={s.prefLabel}>{row.label}</Text>
                <Text style={s.prefSub}>{row.sub}</Text>
              </View>
              <Toggle
                value={preferences[row.key]}
                onToggle={() => setPreferenceFlag(row.key, !preferences[row.key])}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[s.actionBtn, { marginTop: 16 }]}
            onPress={() => void onSavePreferences()}
            disabled={savingPrefs}
          >
            {savingPrefs
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.actionBtnText}>Save Preferences</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Settings card */}
        <View style={s.card}>
          {[
            { icon: "🔔", label: "Notifications", chevron: true, onPress: () => {} },
            { icon: "🔒", label: "Privacy & Security", chevron: true, onPress: () => {} },
            { icon: "❓", label: "Help & Support", chevron: true, onPress: () => {} },
            { icon: "🚪", label: "Sign Out", red: true, onPress: () => void onLogout() },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.settingsRow, i > 0 && s.settingsRowBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={s.settingsIcon}>{item.icon}</Text>
              <Text style={[s.settingsLabel, item.red && s.settingsLabelRed]}>{item.label}</Text>
              {item.chevron && <ChevronIcon />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },

  // Loading
  loadingScreen: {
    flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
  },
  loadingScreenText: { marginTop: 12, fontSize: 14, color: "#9E9E9E" },

  // Header
  header: { backgroundColor: "#0D0D0D", paddingHorizontal: 22, paddingBottom: 24 },
  headerTopRow: {
    flexDirection: "row", alignItems: "center", paddingTop: 16, marginBottom: 22,
  },
  headerTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  editBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },

  // Avatar
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#2a2a2a", borderWidth: 2.5, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  onlineDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#4ADE80", borderWidth: 2, borderColor: "#0D0D0D",
  },
  profileInfo: { flex: 1 },
  profileName: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginBottom: 3 },
  profileSub: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  ratingBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  verifiedBadge: {
    backgroundColor: "rgba(74,222,128,0.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  verifiedBadgeText: { color: "#4ADE80", fontSize: 12, fontWeight: "600" },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 12 },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardLabel: {
    fontSize: 10, fontWeight: "700", color: "#9E9E9E",
    letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
  },
  cardHeading: { fontSize: 20, fontWeight: "800", color: "#0D0D0D", letterSpacing: -0.5, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: "#9E9E9E", lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "800", color: "#0D0D0D", letterSpacing: -0.5 },
  statLbl: { fontSize: 11, color: "#9E9E9E", marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: "#F0F0F0" },

  // Preferences
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  prefRowBorder: { borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  prefIcon: { fontSize: 18, width: 28, textAlign: "center" },
  prefBody: { flex: 1 },
  prefLabel: { fontSize: 13, fontWeight: "600", color: "#0D0D0D" },
  prefSub: { fontSize: 11, color: "#9E9E9E", marginTop: 2 },

  // Toggle
  toggle: {
    width: 40, height: 22, borderRadius: 11, backgroundColor: "#E0E0E0",
    justifyContent: "center", paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: "#0D0D0D" },
  toggleThumb: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff",
    alignSelf: "flex-start",
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  // Settings
  settingsRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13,
  },
  settingsRowBorder: { borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  settingsIcon: { fontSize: 18, width: 26, textAlign: "center" },
  settingsLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: "#0D0D0D" },
  settingsLabelRed: { color: "#EF4444" },

  // Buttons
  actionBtn: {
    backgroundColor: "#0D0D0D", borderRadius: 16,
    paddingVertical: 15, alignItems: "center",
  },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  outlineBtn: {
    borderWidth: 1.5, borderColor: "#E8E8E8", borderRadius: 16,
    paddingVertical: 15, alignItems: "center",
  },
  outlineBtnText: { fontSize: 14, fontWeight: "600", color: "#424242" },
});
