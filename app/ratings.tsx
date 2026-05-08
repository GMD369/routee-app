import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import {
  getPendingRatings,
  getReceivedRatings,
  getGivenRatings,
  submitRating,
  PendingRatingItem,
  ReceivedRatingItem,
  GivenRatingItem,
} from "../lib/ratings";
import { API_BASE_URL } from "../lib/config";

/* ── Icons ────────────────────────────────────────────────────── */

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  );
}

function StarIcon({ filled, size = 22, color = "#F59E0B" }: { filled: boolean; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? color : "none"}
        stroke={filled ? "none" : "#D1D5DB"}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */

function getInitialsColor(name: string) {
  const colors = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6", "#F97316"];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return colors[Math.abs(hash) % colors.length];
}

function AvatarCircle({ uri, name, size = 44 }: { uri: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);
  const initials = name.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
  const bg = getInitialsColor(name);

  if (uri && !error) {
    return (
      <Image
        source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.35, fontWeight: "800" }}>{initials}</Text>
    </View>
  );
}

function StarRow({ score, onPress }: { score: number; onPress?: (n: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onPress?.(n)} disabled={!onPress} activeOpacity={0.7}>
          <StarIcon filled={n <= score} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  const path = url.startsWith("/") ? url.substring(1) : url;
  return `${API_BASE_URL}/storage/files/${encodeURI(path)}`;
}

/* ── Tab types ────────────────────────────────────────────────── */

type Tab = "pending" | "received" | "given";

/* ── Pending card ─────────────────────────────────────────────── */

function PendingCard({
  item,
  onSubmitted,
}: {
  item: PendingRatingItem;
  onSubmitted: () => void;
}) {
  const [score, setScore] = useState(item.existing_score ?? 0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const name = item.other_party_name ?? "Unknown";
  const avatarUri = resolveAvatar(item.other_party_avatar_url);

  async function handleSubmit() {
    if (score === 0) return;
    setSubmitting(true);
    try {
      await submitRating({ match_request_id: item.match_request_id, score, comment: comment.trim() || null });
      setDone(true);
      onSubmitted();
    } catch {
      /* silent — user can retry */
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <View style={[p.card, { alignItems: "center", paddingVertical: 28 }]}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>✅</Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#16A34A" }}>Rating submitted!</Text>
      </View>
    );
  }

  return (
    <View style={p.card}>
      <View style={p.cardTop}>
        <AvatarCircle uri={avatarUri} name={name} />
        <View style={{ flex: 1 }}>
          <Text style={p.name}>{name}</Text>
          {item.days_since_accepted != null && (
            <Text style={p.meta}>{item.days_since_accepted} day{item.days_since_accepted !== 1 ? "s" : ""} ago</Text>
          )}
        </View>
      </View>

      {(item.origin_address || item.dest_address) && (
        <View style={p.routeRow}>
          <View style={{ alignItems: "center", paddingTop: 3, gap: 3 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: "#16A34A", backgroundColor: "#fff" }} />
            <View style={{ width: 1.5, height: 18, backgroundColor: "#D1D5DB" }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626" }} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={p.addr} numberOfLines={1}>{item.origin_address ?? "—"}</Text>
            <Text style={p.addr} numberOfLines={1}>{item.dest_address ?? "—"}</Text>
          </View>
        </View>
      )}

      <View style={p.divider} />

      <Text style={p.rateLabel}>Rate your experience</Text>
      <StarRow score={score} onPress={setScore} />

      <TextInput
        style={p.commentInput}
        placeholder="Add a comment (optional)"
        placeholderTextColor="#A0A0A0"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[p.submitBtn, score === 0 && p.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={score === 0 || submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={p.submitText}>Submit Rating</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const p = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  name: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  routeRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  addr: { fontSize: 13, color: "#444", fontWeight: "500", lineHeight: 18 },
  divider: { height: 1, backgroundColor: "#F2F2F2", marginBottom: 14 },
  rateLabel: { fontSize: 13, fontWeight: "600", color: "#444", marginBottom: 10 },
  commentInput: {
    marginTop: 14, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1A1A1A",
    backgroundColor: "#FAFAFA", minHeight: 80,
  },
  submitBtn: {
    marginTop: 14, backgroundColor: "#0D0D0D", borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#C4C4C4" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

/* ── Received card ─────────────────────────────────────────────── */

function ReceivedCard({ item }: { item: ReceivedRatingItem }) {
  const name = item.rater_name ?? "Anonymous";
  const avatarUri = resolveAvatar(item.rater_avatar_url);

  return (
    <View style={r.card}>
      <View style={r.top}>
        <AvatarCircle uri={avatarUri} name={name} />
        <View style={{ flex: 1 }}>
          <Text style={r.name}>{name}</Text>
          {item.created_at && (
            <Text style={r.meta}>
              {new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          )}
        </View>
        <StarRow score={item.score} />
      </View>
      {item.comment ? <Text style={r.comment}>"{item.comment}"</Text> : null}
    </View>
  );
}

const r = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  comment: { fontSize: 14, color: "#555", fontStyle: "italic", lineHeight: 20, paddingTop: 4 },
});

/* ── Given card ───────────────────────────────────────────────── */

function GivenCard({ item }: { item: GivenRatingItem }) {
  const name = item.ratee_name ?? "Unknown";
  const avatarUri = resolveAvatar(item.ratee_avatar_url);

  return (
    <View style={g.card}>
      <View style={g.top}>
        <AvatarCircle uri={avatarUri} name={name} />
        <View style={{ flex: 1 }}>
          <Text style={g.name}>{name}</Text>
          {item.created_at && (
            <Text style={g.meta}>
              {new Date(item.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </Text>
          )}
        </View>
        <StarRow score={item.score} />
      </View>
      {item.comment ? <Text style={g.comment}>"{item.comment}"</Text> : null}
    </View>
  );
}

const g = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: "#EBEBEB",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
  comment: { fontSize: 14, color: "#555", fontStyle: "italic", lineHeight: 20, paddingTop: 4 },
});

/* ── Empty ────────────────────────────────────────────────────── */

function EmptyState({ tab }: { tab: Tab }) {
  const msg =
    tab === "pending"
      ? { emoji: "⭐", title: "No pending ratings", sub: "You're all caught up. Rate your past rides here." }
      : tab === "received"
      ? { emoji: "🌟", title: "No ratings yet", sub: "Ratings from drivers and riders you've traveled with will appear here." }
      : { emoji: "✍️", title: "No ratings given", sub: "Ratings you've left for others will appear here." };

  return (
    <View style={em.wrap}>
      <Text style={em.emoji}>{msg.emoji}</Text>
      <Text style={em.title}>{msg.title}</Text>
      <Text style={em.sub}>{msg.sub}</Text>
    </View>
  );
}

const em = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emoji: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", marginBottom: 8, textAlign: "center" },
  sub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
});

/* ── Main Screen ──────────────────────────────────────────────── */

export default function RatingsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<PendingRatingItem[]>([]);
  const [received, setReceived] = useState<ReceivedRatingItem[]>([]);
  const [given, setGiven] = useState<GivenRatingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pend, recv, giv] = await Promise.all([
        getPendingRatings(),
        getReceivedRatings(),
        getGivenRatings(),
      ]);
      setPending(pend);
      setReceived(recv);
      setGiven(giv);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function refreshPending() {
    getPendingRatings().then(setPending).catch(() => {});
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "received", label: "Received", count: received.length },
    { key: "given", label: "Given", count: given.length },
  ];

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={s.title}>Ratings</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            {tab.count != null && tab.count > 0 && (
              <View style={[s.tabBadge, activeTab === tab.key && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeText, activeTab === tab.key && s.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#0D0D0D" size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {activeTab === "pending" && (
            pending.length === 0
              ? <EmptyState tab="pending" />
              : pending.map(item => (
                <PendingCard key={item.match_request_id} item={item} onSubmitted={refreshPending} />
              ))
          )}
          {activeTab === "received" && (
            received.length === 0
              ? <EmptyState tab="received" />
              : received.map(item => (
                <ReceivedCard key={item.id} item={item} />
              ))
          )}
          {activeTab === "given" && (
            given.length === 0
              ? <EmptyState tab="given" />
              : given.map(item => (
                <GivenCard key={item.id} item={item} />
              ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#EBEBEB",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.3 },

  tabRow: {
    flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 16, marginTop: 4,
  },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#EBEBEB",
  },
  tabActive: { backgroundColor: "#0D0D0D", borderColor: "#0D0D0D" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#888" },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: "#F0F0F0", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  tabBadgeText: { fontSize: 11, fontWeight: "800", color: "#555" },
  tabBadgeTextActive: { color: "#fff" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
});
