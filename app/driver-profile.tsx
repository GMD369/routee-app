import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import {
    clearSession,
    getApiErrorMessage,
    getPrimaryRole,
    loadSession,
} from "../lib/auth";
import { API_BASE_URL } from "../lib/config";
import {
    DriverPreferences,
    DriverProfile,
    getMyDriverProfile,
    updateMyDriverProfile,
    uploadDriverAvatar,
} from "../lib/driver";

function AvatarIcon() {
  return (
    <Svg width={38} height={38} viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </Svg>
  );
}

function EditIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

export default function DriverProfileScreen() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [bio, setBio] = useState("");
  const [preferences, setPreferences] = useState<DriverPreferences>({
    music: false,
    smoking: false,
    pets: false,
    ac: true,
    talking: true,
  });

  const initialize = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
    try {
      const existingSession = await loadSession();
      if (!existingSession) {
        setIsLoggedIn(false);
        setIsDriver(false);
        setProfile(null);
        return;
      }

      setIsLoggedIn(true);
      const role = getPrimaryRole(existingSession);
      const hasDriverRole = role === "driver";
      setIsDriver(hasDriverRole);

      if (hasDriverRole) {
        const driverProfile = await getMyDriverProfile();
        setProfile((prev) => {
          if (prev?.avatar_url !== driverProfile.avatar_url) {
            setAvatarLoadFailed(false);
          }
          return driverProfile;
        });
        setBio(driverProfile.bio || "");
        setPreferences(
          driverProfile.preferences || {
            music: false,
            smoking: false,
            pets: false,
            ac: true,
            talking: true,
          },
        );
      }
    } catch (error) {
      Alert.alert("Profile error", getApiErrorMessage(error));
    } finally {
      setSessionChecked(true);
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void initialize(!sessionChecked);
    }, [initialize, sessionChecked]),
  );

  function resolveAvatarUri(avatarUrl?: string | null): string | undefined {
    if (!avatarUrl) return undefined;
    const cleanBase = API_BASE_URL.replace(/\/$/, "");
    if (avatarUrl.startsWith(cleanBase)) return avatarUrl;
    if (avatarUrl.startsWith("http")) {
      const match = avatarUrl.match(
        /\/object\/(?:public|authenticated)\/[^/]+\/(.+)$/,
      );
      if (match) return `${cleanBase}/storage/files/${match[1]}`;
      return avatarUrl;
    }
    const cleanPath = avatarUrl.startsWith("/") ? avatarUrl.slice(1) : avatarUrl;
    return `${cleanBase}/storage/files/${cleanPath}`;
  }

  async function pickAvatar() {
    if (uploadingAvatar) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert("Selection failed", "Could not read the selected image.");
        return;
      }
      setUploadingAvatar(true);
      const uploaded = await uploadDriverAvatar({
        uri: asset.uri,
        name: asset.name || "avatar.jpg",
        type: asset.mimeType || "image/jpeg",
      });
      setAvatarLoadFailed(false);
      setProfile((current) =>
        current
          ? { ...current, avatar_url: uploaded.avatar_url ?? current.avatar_url }
          : current,
      );
    } catch (error) {
      Alert.alert("Upload failed", getApiErrorMessage(error));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const summary = useMemo(() => {
    if (!profile) return null;
    return {
      rating: profile.rating_avg.toFixed(2),
      count: String(profile.rating_count),
      rides: String(profile.total_rides_given),
      status: prettyStatus(profile.verification_status),
    };
  }, [profile]);

  const isVerified = profile?.verification_status === "verified";

  async function onLogout() {
    try {
      await clearSession();
      setIsLoggedIn(false);
      setProfile(null);
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  }

  function setPreferenceFlag<K extends keyof DriverPreferences>(
    key: K,
    value: DriverPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function onSaveDriverProfile() {
    const trimmedBio = bio.trim();

    if (trimmedBio.length > 500) {
      Alert.alert("Invalid bio", "Bio must be 500 characters or less.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMyDriverProfile({
        preferences,
        bio: trimmedBio || undefined,
      });

      setProfile((current) => ({
        ...updated,
        profiles: updated.profiles || current?.profiles,
      }));
      setBio(updated.bio || "");
      setPreferences(updated.preferences || preferences);
    } catch (error) {
      Alert.alert("Update failed", getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (!sessionChecked || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f172a" />
        <Text className="mt-3 text-sm text-slate-500">Loading profile...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">
          Driver Profile
        </Text>
        <Text className="mt-2 text-sm text-slate-500">
          Login to view your driver profile.
        </Text>

        <Pressable
          onPress={() => router.push("/login")}
          className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-slate-700">
            Login
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!isDriver) {
    return (
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="px-6 pb-28 pt-16"
      >
        <Text className="text-3xl font-black text-slate-900">
          Driver Profile
        </Text>
        <Text className="mt-2 text-sm leading-6 text-slate-500">
          This screen is available for driver accounts only.
        </Text>

        <Pressable
          onPress={() => router.replace("/profile")}
          className="mt-7 rounded-2xl border border-slate-200 bg-white px-5 py-4"
        >
          <Text className="text-center text-lg font-semibold text-sky-600">
            Open Rider Profile
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  const avatarUrl = profile?.avatar_url ?? profile?.profiles?.avatar_url;

  return (
    <View style={ds.root}>
      {/* ── Dark header with avatar ── */}
      <View style={ds.header}>
        <SafeAreaView edges={["top"]}>
          <View style={ds.headerTopRow}>
            <Text style={ds.headerTitle}>Driver Profile</Text>
            <TouchableOpacity style={ds.editBtn} onPress={() => void pickAvatar()}>
              <EditIcon />
            </TouchableOpacity>
          </View>

          <View style={ds.avatarRow}>
            <View style={ds.avatarWrap}>
              <TouchableOpacity
                style={ds.avatar}
                onPress={() => void pickAvatar()}
                activeOpacity={0.85}
              >
                {avatarUrl && !avatarLoadFailed ? (
                  <Image
                    key={avatarUrl}
                    source={{ uri: resolveAvatarUri(avatarUrl) }}
                    style={ds.avatarImage}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <AvatarIcon />
                )}
                {uploadingAvatar ? (
                  <View style={ds.avatarOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : null}
              </TouchableOpacity>
              <View style={[ds.statusDot, isVerified ? ds.statusDotGreen : ds.statusDotAmber]} />
            </View>

            <View style={ds.profileInfo}>
              <Text style={ds.profileName}>
                {profile?.profiles?.full_name || "Driver Account"}
              </Text>
              <Text style={ds.profileSub}>
                {profile?.profiles?.email || "Musafee Driver"}
              </Text>
              <View style={ds.badgesRow}>
                <View style={ds.ratingBadge}>
                  <Text style={ds.ratingBadgeText}>
                    ⭐ {summary?.rating ?? "0.00"}
                  </Text>
                </View>
                <View style={[ds.verifiedBadge, isVerified && ds.verifiedBadgeGreen]}>
                  <Text style={[ds.verifiedBadgeText, isVerified && ds.verifiedBadgeTextGreen]}>
                    {isVerified ? "Verified ✓" : summary?.status ?? "Pending"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="px-6 pb-28 pt-5"
    >

      <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">Identity</Text>
        <InfoRow
          label="Full Name"
          value={profile?.profiles?.full_name || "-"}
        />
        <InfoRow label="Email" value={profile?.profiles?.email || "-"} />
        <InfoRow label="Phone" value={profile?.profiles?.phone || "-"} />
        <InfoRow label="CNIC" value={profile?.cnic_number || "Not submitted"} />
        <InfoRow
          label="License"
          value={profile?.license_number || "Not submitted"}
        />
      </View>

      <View className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <Text className="text-sm font-semibold text-sky-700">Verification</Text>
        <Text className="mt-2 text-2xl font-black text-slate-900">
          {summary?.status || "Unknown"}
        </Text>
      </View>

      {!isVerified ? (
        <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-semibold text-amber-700">
            Verification Required
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            Please verify your account to continue as an active driver.
          </Text>
          <Pressable
            onPress={() => router.push("/driver-verification")}
            className="mt-3 items-center rounded-xl bg-slate-900 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">
              Please Verify
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Text className="text-sm font-semibold text-emerald-700">
            Verification Complete
          </Text>
          <Text className="mt-2 text-sm leading-5 text-slate-600">
            Your account is verified. No further action is needed.
          </Text>
        </View>
      )}

      <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">
          Driver Stats
        </Text>
        <View className="mt-3 flex-row justify-between">
          <Stat label="Rating" value={summary?.rating || "0.00"} />
          <Stat label="Ratings" value={summary?.count || "0"} />
          <Stat label="Rides" value={summary?.rides || "0"} />
        </View>
      </View>

      <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-sm font-semibold text-slate-900">
          Driver Preferences
        </Text>

        <View className="mt-3 gap-3">
          <PreferenceRow
            label="Music"
            value={preferences.music}
            onValueChange={(value) => setPreferenceFlag("music", value)}
          />
          <PreferenceRow
            label="Smoking"
            value={preferences.smoking}
            onValueChange={(value) => setPreferenceFlag("smoking", value)}
          />
          <PreferenceRow
            label="Pets"
            value={preferences.pets}
            onValueChange={(value) => setPreferenceFlag("pets", value)}
          />
          <PreferenceRow
            label="AC"
            value={preferences.ac}
            onValueChange={(value) => setPreferenceFlag("ac", value)}
          />
          <PreferenceRow
            label="Talking"
            value={preferences.talking}
            onValueChange={(value) => setPreferenceFlag("talking", value)}
          />
        </View>

        <Text className="mb-2 mt-4 text-sm font-medium text-slate-700">
          Bio
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          textAlignVertical="top"
          placeholder="Tell riders about your driving style"
          placeholderTextColor="#94a3b8"
          className="min-h-28 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900"
        />
        <Text className="mt-2 text-right text-xs text-slate-500">
          {bio.length}/500
        </Text>

        <Pressable
          onPress={() => void onSaveDriverProfile()}
          disabled={saving}
          className="mt-4 items-center rounded-xl bg-slate-900 px-4 py-3"
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Save Driver Profile
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={() => void onLogout()}
        className="mt-8 items-center rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4"
      >
        <Text className="text-base font-semibold text-rose-600">Logout</Text>
      </Pressable>
    </ScrollView>
    </View>
  );
}

const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { backgroundColor: "#0D0D0D", paddingHorizontal: 22, paddingBottom: 24 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    marginBottom: 22,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  editBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#2a2a2a",
    borderWidth: 2.5, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center", justifyContent: "center",
  },
  statusDot: {
    position: "absolute", bottom: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  statusDotGreen: { backgroundColor: "#4ADE80" },
  statusDotAmber: { backgroundColor: "#FCD34D" },
  profileInfo: { flex: 1 },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: -0.5, marginBottom: 3 },
  profileSub: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  ratingBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  verifiedBadge: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  verifiedBadgeGreen: { backgroundColor: "rgba(74,222,128,0.15)" },
  verifiedBadgeText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "600" },
  verifiedBadgeTextGreen: { color: "#4ADE80" },
});

function prettyStatus(value?: string) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View className="mt-3 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="max-w-[65%] text-right text-sm font-semibold text-slate-800">
        {value}
      </Text>
    </View>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <View className="items-start">
      <Text className="text-xl font-black text-slate-900">{value}</Text>
      <Text className="mt-1 text-xs text-slate-500">{label}</Text>
    </View>
  );
}

type PreferenceRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function PreferenceRow({ label, value, onValueChange }: PreferenceRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <Text className="mr-3 flex-1 text-sm font-medium text-slate-700">
        {label}
      </Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
