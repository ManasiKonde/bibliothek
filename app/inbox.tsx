import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Conversation } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function InboxScreen() {
  const { user } = useAuth();
  const { getConversations } = useBooks();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getConversations();
    setConversations(list);
    setLoading(false);
  }, [user?.id, getConversations]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Inbox</Text>
          <Text style={styles.muted}>Please log in to see messages.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
        </Pressable>
        <Text style={styles.headerTitle}>Inbox</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F3D3E" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No conversations yet.</Text>
          <Text style={styles.mutedSmall}>
            Message a seller from a book page to start.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {conversations.map((c) => (
            <Pressable
              key={`${c.bookId}-${c.otherUserId}`}
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/messages/[bookId]",
                  params: {
                    bookId: c.bookId,
                    otherUserId: c.otherUserId,
                    bookTitle: c.bookTitle,
                  },
                })
              }
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {c.bookTitle}
                </Text>
                <Text style={styles.rowPreview} numberOfLines={1}>
                  {c.lastMessageText || "No messages yet"}
                </Text>
              </View>
              <Text style={styles.rowTime}>{formatTime(c.lastMessageAt)}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  mutedSmall: { color: "#888", fontSize: 12, marginTop: 4, textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F3D3E",
    textAlign: "center",
  },

  list: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
    backgroundColor: "#fff",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: "700", color: "#0F3D3E" },
  rowPreview: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  rowTime: { fontSize: 12, color: "#9ca3af", marginLeft: 8 },
});
