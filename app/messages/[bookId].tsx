import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Message } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getOtherUserId(messages: Message[], currentUserId: string): string {
  for (const m of messages) {
    const other = m.from_user_id === currentUserId ? m.to_user_id : m.from_user_id;
    if (other && other !== currentUserId) return other;
  }
  return "";
}

function getBookTitleFromMessages(messages: Message[]): string {
  const first = messages.find((m) => m.book_title);
  return first?.book_title ?? "Chat";
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const { books, getMessages, markMessagesAsRead, sendMessage } = useBooks();
  const router = useRouter();
  const params = useLocalSearchParams();
  const bookId =
    typeof params.bookId === "string" ? params.bookId : params.bookId?.[0];
  const paramOtherUserId =
    typeof params.otherUserId === "string"
      ? params.otherUserId
      : params.otherUserId?.[0];
  const paramBookTitle =
    typeof params.bookTitle === "string"
      ? params.bookTitle
      : params.bookTitle?.[0];

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");

  const book = books.find((b) => b.id === bookId);
  const otherUserId =
    paramOtherUserId ??
    book?.seller?.id ??
    (user?.id ? getOtherUserId(messages, user.id) : "");
  const otherUserName = book?.seller?.name ?? "User";
  const displayTitle =
    paramBookTitle ?? book?.title ?? getBookTitleFromMessages(messages);
  const bookTitleForSend = paramBookTitle ?? book?.title ?? getBookTitleFromMessages(messages);

  const isMine = useCallback(
    (m: Message) => user?.id != null && m.from_user_id === user.id,
    [user?.id]
  );

  const load = useCallback(async () => {
    if (!bookId || !user?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getMessages(bookId);
    setMessages(list);
    setLoading(false);
    if (bookId && user?.id) markMessagesAsRead(bookId);
  }, [bookId, user?.id, getMessages, markMessagesAsRead]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.muted}>Please log in to chat.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!bookId) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.muted}>Missing conversation.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (messages.length === 0 && !loading && !paramOtherUserId && !book) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.muted}>
            No messages yet. Open this chat from a book or your inbox.
          </Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Chat with {otherUserName}
            </Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <Text style={styles.muted}>Loading messages…</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.muted}>
              No messages yet. Say hi to the seller.
            </Text>
          ) : (
            messages.map((m) => {
              const mine = isMine(m);
              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleRow,
                    mine ? styles.bubbleRowMe : styles.bubbleRowOther,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMe : styles.bubbleOther,
                    ]}
                  >
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMe]}>{m.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor="#888"
            value={text}
            onChangeText={setText}
            multiline
          />
          <Pressable
            style={[
              styles.sendBtn,
              (sending || !text.trim()) && styles.sendBtnDisabled,
            ]}
            disabled={sending || !text.trim()}
            onPress={async () => {
              const msg = text.trim();
              if (!msg || !otherUserId) return;
              setSending(true);
              const ok = await sendMessage(
                bookId,
                otherUserId,
                msg,
                bookTitleForSend
              );
              setSending(false);
              if (ok) {
                setText("");
                load();
              }
            }}
          >
            <Ionicons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 22, fontWeight: "900", color: "#0F3D3E", marginBottom: 8 },
  muted: { color: "#666", textAlign: "center" },
  backBtn: {
    marginTop: 16,
    backgroundColor: "#2E5E4E",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  backBtnText: { color: "white", fontWeight: "800" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
  },
  iconBtn: { padding: 8, minWidth: 40 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F3D3E" },
  headerSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  scroll: { flex: 1 },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: "#0F3D3E",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: "#111827" },
  bubbleTextMe: { color: "#fff" },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e0d8",
    backgroundColor: "#F5F1E8",
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 96,
    minHeight: 40,
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#0F3D3E",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

