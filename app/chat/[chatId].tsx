import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import { getChatDetails, ChatDetailResponse, sendChatMessage, ChatMessage } from "../../lib/chat";
import { API_BASE_URL } from "../../lib/config";
import { supabase } from "../../lib/supabase";

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13" />
      <Path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </Svg>
  );
}

const AVATAR_COLORS = ["#6366F1","#F59E0B","#10B981","#EF4444","#3B82F6","#8B5CF6","#F97316"];
function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarImage({ uri, initials, size = 40 }: { uri: string | null; initials: string; size?: number }) {
  const [error, setError] = useState(false);
  const bg = getAvatarColor(initials || "U");
  const style = { width: size, height: size, borderRadius: size / 2, backgroundColor: error || !uri ? bg : "#DDD", alignItems: "center" as const, justifyContent: "center" as const, overflow: "hidden" as const };
  if (uri && !error) {
    return <Image source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }} style={style} onError={() => setError(true)} contentFit="cover" />;
  }
  return <View style={style}><Text style={{ fontSize: size * 0.38, fontWeight: "800", color: "#fff" }}>{initials}</Text></View>;
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

// Group messages by date
function groupByDate(messages: ChatMessage[]) {
  const groups: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = new Date(msg.created_at).toDateString();
    if (d !== currentDate) {
      groups.push({ date: d, messages: [msg] });
      currentDate = d;
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

// Flat list item = date header or message
type ListItem = { type: "date"; label: string } | { type: "msg"; msg: ChatMessage; isMine: boolean };

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [chat, setChat] = useState<ChatDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId) return;
    void loadChat();
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel(`messages:chat_id=eq.${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, (payload) => {
        const incoming = payload.new as ChatMessage;
        setChat((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === incoming.id)) return prev;
          const withoutTemps = prev.messages.filter((m) => !m.id.startsWith("temp-"));
          return { ...prev, messages: [...withoutTemps, incoming] };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  async function loadChat() {
    try {
      const data = await getChatDetails(chatId!);
      setChat(data);
    } catch (err) {
      console.warn("Failed to load chat", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!message.trim() || !chatId || !chat || sending) return;
    const textToSend = message.trim();
    setMessage("");
    setSending(true);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, chat_id: chatId, sender_id: "temp_me",
      content: textToSend, is_read: false, created_at: new Date().toISOString(),
    };
    setChat((prev) => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);
    try {
      await sendChatMessage(chatId, textToSend);
    } catch {
      setChat((prev) => prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) } : prev);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <SafeAreaView style={[s.root, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator size="large" color="#0D0D0D" /></SafeAreaView>;
  }

  if (!chat) {
    return (
      <SafeAreaView style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 16, color: "#1A1A1A", marginBottom: 20 }}>Chat not found.</Text>
        <TouchableOpacity style={{ padding: 12, backgroundColor: "#EBEBEB", borderRadius: 8 }} onPress={() => router.back()}>
          <Text style={{ fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const otherName = chat.other_party_name || "Unknown";
  const initials = otherName.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
  const safePath = chat.other_party_avatar_url?.startsWith("/") ? chat.other_party_avatar_url.substring(1) : chat.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  // Build flat list items with date separators
  const groups = groupByDate(chat.messages);
  const items: ListItem[] = [];
  for (const g of groups) {
    items.push({ type: "date", label: formatDateSeparator(g.messages[0].created_at) });
    for (const msg of g.messages) {
      items.push({ type: "msg", msg, isMine: msg.sender_id !== chat.other_party_profile_id });
    }
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <BackIcon />
        </TouchableOpacity>
        <View style={s.headerProfile}>
          <AvatarImage uri={avatarUri} initials={initials} size={38} />
          <View style={s.headerInfo}>
            <Text style={s.headerName} numberOfLines={1}>{otherName}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Chat background */}
        <View style={s.chatBg}>
          <FlatList
            ref={flatListRef}
            data={items}
            keyExtractor={(item, idx) => item.type === "date" ? `date-${idx}` : item.msg.id}
            contentContainerStyle={s.chatContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === "date") {
                return (
                  <View style={s.dateSep}>
                    <View style={s.dateSepLine} />
                    <Text style={s.dateSepText}>{item.label}</Text>
                    <View style={s.dateSepLine} />
                  </View>
                );
              }
              const { msg, isMine } = item;
              return (
                <View style={[s.messageRow, isMine ? s.messageRowMine : s.messageRowTheirs]}>
                  {!isMine && (
                    <View style={s.msgAvatar}>
                      <AvatarImage uri={avatarUri} initials={initials} size={28} />
                    </View>
                  )}
                  <View style={s.bubbleWrap}>
                    <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
                      <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>{msg.content}</Text>
                    </View>
                    <Text style={[s.msgTime, isMine && s.msgTimeMine]}>{formatMessageTime(msg.created_at)}</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Type a message…"
            placeholderTextColor="#AAA"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!message.trim() || sending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <SendIcon />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  flex1: { flex: 1 },

  topBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center" },
  headerProfile: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatarWrap: { position: "relative" },
  headerOnlineDot: { position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#4ADE80", borderWidth: 1.5, borderColor: "#fff" },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  headerStatus: { fontSize: 11, color: "#4ADE80", fontWeight: "600" },

  chatBg: { flex: 1, backgroundColor: "#F0F4F8" },
  chatContainer: { padding: 16, paddingBottom: 12 },

  dateSep: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 16 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: "#DDE3EC" },
  dateSepText: { fontSize: 11, fontWeight: "700", color: "#8A97AB", letterSpacing: 0.3 },

  messageRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-end", gap: 8 },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },

  msgAvatar: { marginBottom: 2, flexShrink: 0 },
  bubbleWrap: { maxWidth: "78%", gap: 3 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: "#0D0D0D", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#fff", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  bubbleTextTheirs: { color: "#1A1A1A" },
  msgTime: { fontSize: 10, color: "#8A97AB", fontWeight: "500", marginLeft: 4 },
  msgTimeMine: { textAlign: "right", marginRight: 4 },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    padding: 12, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: "#EBEBEB",
  },
  input: {
    flex: 1, backgroundColor: "#F5F7FA", borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 10,
    fontSize: 15, color: "#1A1A1A", maxHeight: 100, minHeight: 46,
    borderWidth: 1, borderColor: "#E8ECF2",
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: "#0D0D0D",
    alignItems: "center", justifyContent: "center",
  },
  sendBtnOff: { backgroundColor: "#CACACA" },
});
