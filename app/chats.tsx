import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { listChats, ChatSummary } from "../lib/chat";
import { API_BASE_URL } from "../lib/config";

function BackSvg() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function formatTimeOrDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const AVATAR_COLORS = ["#6366F1","#F59E0B","#10B981","#EF4444","#3B82F6","#8B5CF6","#F97316","#06B6D4"];

function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarImage({ uri, initials, size = 56 }: { uri: string | null; initials: string; size?: number }) {
  const [error, setError] = useState(false);
  const bg = getAvatarColor(initials || "U");
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: error || !uri ? bg : "#DDD", alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };

  if (uri && !error) {
    return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />;
  }
  return (
    <View style={style}>
      <Text style={{ fontSize: size * 0.36, fontWeight: "800", color: "#fff" }}>{initials}</Text>
    </View>
  );
}

function EmptyChats() {
  return (
    <View style={e.container}>
      <View style={e.iconWrap}><Text style={e.icon}>💬</Text></View>
      <Text style={e.title}>No Conversations Yet</Text>
      <Text style={e.sub}>When you're matched with a driver or rider, you'll be able to chat with them here.</Text>
    </View>
  );
}

const e = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 60 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#F0F4FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  icon: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A1A", textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
});

export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void loadChats(); }, []);

  async function loadChats() {
    setLoading(true);
    try {
      const data = await listChats();
      setChats(data);
    } catch (error) {
      console.warn("Failed to fetch chats", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <BackSvg />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Messages</Text>
          <View style={{ width: 44 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#0D0D0D" />
          </View>
        ) : chats.length === 0 ? (
          <EmptyChats />
        ) : (
          <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
            <Text style={s.listLabel}>{chats.length} conversation{chats.length !== 1 ? "s" : ""}</Text>
            {chats.map((chat, idx) => {
              const partyName = chat.other_party_name ?? "User";
              const initials = partyName.split(" ").slice(0, 2).map(w => w[0] ?? "").join("").toUpperCase();
              const safePath = chat.other_party_avatar_url?.startsWith('/') ? chat.other_party_avatar_url.substring(1) : chat.other_party_avatar_url;
              const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;
              const lastMsgText = chat.last_message?.content ?? "Tap to open chat";
              const timestamp = chat.last_message?.created_at || chat.created_at;
              const hasUnread = false; // extend if API provides unread count

              return (
                <TouchableOpacity
                  key={chat.id ?? idx}
                  style={s.chatItem}
                  onPress={() => router.push(`/chat/${chat.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={s.avatarWrap}>
                    <AvatarImage uri={avatarUri} initials={initials} size={56} />
                    <View style={s.onlineDot} />
                  </View>
                  <View style={s.chatInfo}>
                    <View style={s.chatRow}>
                      <Text style={[s.chatName, hasUnread && s.chatNameUnread]} numberOfLines={1}>{partyName}</Text>
                      <Text style={s.chatTime}>{formatTimeOrDate(timestamp)}</Text>
                    </View>
                    <View style={s.chatRow}>
                      <Text style={[s.lastMsg, hasUnread && s.lastMsgUnread]} numberOfLines={1}>{lastMsgText}</Text>
                      {hasUnread && <View style={s.unreadDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A", letterSpacing: -0.3 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: "#F8F8F8",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EBEBEB",
  },

  listContent: { paddingBottom: 100 },
  listLabel: { fontSize: 12, fontWeight: "600", color: "#A0A0A0", paddingHorizontal: 20, paddingVertical: 12, textTransform: "uppercase", letterSpacing: 0.8 },

  chatItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  avatarWrap: { position: "relative", marginRight: 14 },
  onlineDot: {
    position: "absolute", bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#4ADE80", borderWidth: 2, borderColor: "#fff",
  },
  chatInfo: { flex: 1, gap: 5 },
  chatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A", flex: 1, marginRight: 8 },
  chatNameUnread: { fontWeight: "800" },
  chatTime: { fontSize: 11, color: "#AAAAAA", fontWeight: "500" },
  lastMsg: { fontSize: 13, color: "#999", flex: 1, marginRight: 8 },
  lastMsgUnread: { color: "#1A1A1A", fontWeight: "600" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" },
});
