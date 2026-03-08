import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Order, OrderStatus } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusLabel(status: OrderStatus): string {
  switch (status) {
    case "completed":
    case "confirmed":
      return "Order confirmed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "return_requested":
      return "Return requested";
    case "return_approved":
      return "Return approved";
    case "return_rejected":
      return "Return rejected";
    default:
      return status;
  }
}

function getTimelineSteps(status: OrderStatus): OrderStatus[] {
  const steps: OrderStatus[] = ["confirmed"];
  if (["shipped", "delivered", "return_requested", "return_approved", "return_rejected"].includes(status))
    steps.push("shipped");
  if (["delivered", "return_requested", "return_approved", "return_rejected"].includes(status))
    steps.push("delivered");
  if (["return_requested", "return_approved", "return_rejected"].includes(status))
    steps.push("return_requested");
  if (status === "return_approved" || status === "return_rejected") steps.push(status);
  if (status === "completed") return ["completed"];
  return steps;
}

export default function OrderDetailScreen() {
  const { user } = useAuth();
  const { books, getOrdersForUser } = useBooks();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const list = await getOrdersForUser(user.id);
    setOrders(list);
  }, [user?.id, getOrdersForUser]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const order = orders.find((o) => o.id === id);
  const book = order ? books.find((b) => b.id === order.book_id) : null;
  const cover = book?.images?.[0];
  const isBuyer = user?.id && order?.buyer_id === user.id;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Order details</Text>
          <Text style={styles.muted}>Please log in to view orders.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
          </Pressable>
          <Text style={styles.headerTitle}>Order details</Text>
          <View style={styles.iconBtn} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0F3D3E" style={styles.loader} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.muted}>Order not found.</Text>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>Go back</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const timelineSteps = getTimelineSteps(order.status);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Order details</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.bookRow}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.cover} />
            ) : (
              <View style={styles.coverFallback}>
                <Text style={styles.coverFallbackText}>No cover</Text>
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{order.book_title}</Text>
              <Text style={styles.muted}>Placed {formatDate(order.created_at)}</Text>
              <Link href={`/book/${order.book_id}`} asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.linkText}>View listing</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.timelineCard}>
          {timelineSteps.map((status, idx) => (
            <View key={status} style={styles.timelineRow}>
              <View style={[styles.timelineDot, idx < timelineSteps.length - 1 && styles.timelineDotLine]} />
              <Text style={styles.timelineLabel}>{statusLabel(status)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{isBuyer ? "Seller" : "Buyer"}</Text>
        <View style={styles.card}>
          <Text style={styles.partyName}>{isBuyer ? "You bought from" : "Sold to"}</Text>
          <Text style={styles.partyValue}>{isBuyer ? (book?.seller?.name ?? "Seller") : order.buyer_name}</Text>
        </View>

        {(order.delivery_address ?? order.delivery_pincode) ? (
          <>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <View style={styles.card}>
              <Text style={styles.partyName}>Delivery address</Text>
              <Text style={styles.partyValue}>
                {[order.delivery_address, order.delivery_city, order.delivery_pincode].filter(Boolean).join(", ")}
              </Text>
              {order.delivery_phone ? (
                <Text style={styles.muted}>Contact: {order.delivery_phone}</Text>
              ) : null}
              <Text style={styles.deliveryMessage}>
                We will deliver to this address. Our delivery partner will contact you if needed.
              </Text>
            </View>
          </>
        ) : null}

        {order.return_reason ? (
          <>
            <Text style={styles.sectionTitle}>Return reason</Text>
            <View style={styles.card}>
              <Text style={styles.returnReasonText}>{order.return_reason}</Text>
            </View>
          </>
        ) : null}

        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back to My Orders</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
  },
  iconBtn: { padding: 8, minWidth: 40 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F3D3E", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  container: { padding: 20 },
  loader: { marginTop: 24 },
  title: { fontSize: 22, fontWeight: "900", color: "#0F3D3E", marginBottom: 8 },
  muted: { color: "#666", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F3D3E",
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  bookRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  cover: { width: 72, height: 72, borderRadius: 10 },
  coverFallback: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  coverFallbackText: { fontSize: 11, color: "#666", fontWeight: "700" },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 16, fontWeight: "900", color: "#0F3D3E" },
  linkText: { fontSize: 14, fontWeight: "800", color: "#0F3D3E", marginTop: 6, textDecorationLine: "underline" },
  timelineCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  timelineRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2E5E4E",
    marginRight: 12,
  },
  timelineDotLine: { marginBottom: -8 },
  timelineLabel: { fontSize: 14, fontWeight: "700", color: "#0F3D3E" },
  partyName: { fontSize: 12, color: "#666", marginBottom: 4 },
  partyValue: { fontSize: 16, fontWeight: "800", color: "#0F3D3E" },
  deliveryMessage: { fontSize: 13, color: "#666", marginTop: 8, fontStyle: "italic" },
  returnReasonText: { fontSize: 14, color: "#444", lineHeight: 20 },
  backBtn: {
    marginTop: 24,
    backgroundColor: "#2E5E4E",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  backBtnText: { color: "white", fontWeight: "900" },
});
