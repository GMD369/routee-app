import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { getChatDetails, ChatDetailResponse, sendChatMessage, ChatMessage } from "../../lib/chat";
import { API_BASE_URL } from "../../lib/config";
import { supabase } from "../../lib/supabase";

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13" />
      <Path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </Svg>
  );
}

function AvatarImage({ uri, initials, style, textStyle }: { uri: string | null; initials: string; style: any; textStyle: any }) {
  const [error, setError] = useState(false);

  if (uri && !error) {
    return (
      <Image
        source={{ uri, headers: { "ngrok-skip-browser-warning": "1" } }}
        style={style}
        onError={() => setError(true)}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={style}>
      <Text style={textStyle}>{initials}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [chat, setChat] = useState<ChatDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load initial history
  useEffect(() => {
    if (!chatId) return;
    loadChat();
  }, [chatId]);

  // Realtime subscription — fires on every INSERT into messages for this chat
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`messages:chat_id=eq.${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;
          setChat((prev) => {
            if (!prev) return prev;
            // Deduplicate: skip if already in list
            if (prev.messages.some((m) => m.id === incoming.id)) return prev;
            // Replace any optimistic temp messages, then append the confirmed one
            const withoutTemps = prev.messages.filter(
              (m) => !m.id.startsWith("temp-")
            );
            return { ...prev, messages: [...withoutTemps, incoming] };
          });
        }
      )
      .subscribe((status, err) => {
        console.log("[realtime] status:", status, err ?? "");
      });

    return () => {
      supabase.removeChannel(channel);
    };
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

    // Optimistic message — replaced by realtime confirmed insert
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      chat_id: chatId,
      sender_id: "temp_me",
      content: textToSend,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setChat((prev) => {
      if (!prev) return prev;
      return { ...prev, messages: [...prev.messages, optimistic] };
    });

    try {
      await sendChatMessage(chatId, textToSend);
      // Realtime subscription delivers the confirmed message and clears the temp
    } catch (err) {
      console.warn("Failed to send message", err);
      // Remove the optimistic message on failure
      setChat((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.filter((m) => m.id !== optimistic.id),
        };
      });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <ActivityIndicator size="large" color="#0D0D0D" />
      </SafeAreaView>
    );
  }

  if (!chat) {
    return (
      <SafeAreaView style={[s.root, s.centered]}>
        <Text style={s.errorText}>Chat not found.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const otherName = chat.other_party_name || "Unknown";
  const initials = otherName.split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();

  const safePath = chat.other_party_avatar_url?.startsWith("/")
    ? chat.other_party_avatar_url.substring(1)
    : chat.other_party_avatar_url;
  const avatarUri = safePath ? `${API_BASE_URL}/storage/files/${encodeURI(safePath)}` : null;

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id !== chat.other_party_profile_id;
    return (
      <View style={[s.messageRow, isMine ? s.messageRowMine : s.messageRowTheirs]}>
        <View style={[s.messageBubble, isMine ? s.messageBubbleMine : s.messageBubbleTheirs]}>
          <Text style={[s.messageText, isMine ? s.messageTextMine : s.messageTextTheirs]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <BackIcon />
        </TouchableOpacity>

        <View style={s.headerProfile}>
          <AvatarImage
            uri={avatarUri}
            initials={initials}
            style={s.headerAvatar}
            textStyle={s.headerAvatarText}
          />
          <Text style={s.headerTitle} numberOfLines={1}>{otherName}</Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={s.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={s.chatContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            placeholder="Message..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!message.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <SendIcon />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F2" },
  flex1: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#E0E0E0",
  },
  iconBtn: { padding: 4 },
  headerProfile: { flexDirection: "row", alignItems: "center", flex: 1, marginLeft: 12 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerAvatarText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", flex: 1 },

  chatContainer: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: "row", marginBottom: 12, width: "100%" },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowTheirs: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "80%", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageBubbleMine: { backgroundColor: "#0D0D0D", borderBottomRightRadius: 4 },
  messageBubbleTheirs: { backgroundColor: "#fff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#EBEBEB" },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextMine: { color: "#fff" },
  messageTextTheirs: { color: "#1A1A1A" },

  inputContainer: {
    flexDirection: "row", alignItems: "flex-end", padding: 12,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#E0E0E0",
  },
  input: {
    flex: 1, backgroundColor: "#F2F2F2", borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    fontSize: 15, color: "#1A1A1A", maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#0D0D0D",
    alignItems: "center", justifyContent: "center", marginLeft: 12,
  },
  sendBtnDisabled: { backgroundColor: "#A0A0A0" },

  errorText: { fontSize: 16, color: "#1A1A1A", marginBottom: 20 },
  backBtn: { padding: 12, backgroundColor: "#EBEBEB", borderRadius: 8 },
  backText: { fontWeight: "600" },
});
