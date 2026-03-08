import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import { supabase } from "@/src/lib/supabaseClient";
import type { Rental, RentalStatus } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function statusLabel(s: RentalStatus): string {
  switch (s) {
    case "active":
      return "Active";
    case "overdue":
      return "Overdue";
    case "completed":
      return "Completed";
    case "blocked":
      return "Blocked";
    default:
      return s;
  }
}

export default function RentalsScreen() {
  const { user } = useAuth();
  const { getRentalsForUser } = useBooks();
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRentals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getRentalsForUser(user.id);
    setRentals(list);
    setLoading(false);
  }, [user?.id, getRentalsForUser]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      supabase.functions.invoke("send-rental-reminders").catch(() => {});
    }, [])
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>My Rentals</Text>
          <Text style={styles.muted}>Please log in to see your rentals.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
        </Pressable>
        <Text style={styles.headerTitle}>My Rentals</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F3D3E" />
        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>No rentals yet.</Text>
          <Text style={styles.mutedSmall}>Rent a book from a listing to see it here.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {rentals.map((r) => (
            <Pressable
              key={r.id}
              style={styles.row}
              onPress={() => router.push({ pathname: "/rental/[id]", params: { id: r.id } })}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.book_title ?? "Book"}</Text>
                <Text style={styles.rowMeta}>
                  Due: {formatDate(r.extended_due_date ?? r.due_date)} · {statusLabel(r.status)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
    backgroundColor: "#fff",
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: "700", color: "#0F3D3E" },
  rowMeta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
});
