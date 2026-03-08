import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Order } from "@/src/types/models";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RETURN_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RETURNABLE_STATUSES: Order["status"][] = [
  "completed",
  "confirmed",
  "shipped",
  "delivered",
];

function canRequestReturn(order: Order): boolean {
  if (!RETURNABLE_STATUSES.includes(order.status)) return false;
  const created = new Date(order.created_at).getTime();
  const now = Date.now();
  return now - created <= RETURN_DAYS * MS_PER_DAY;
}

function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString();
}

function statusLabel(status: Order["status"]): string {
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

const DELIVERY_NOTE =
  "Our delivery person will check the book before they officially return it.";

export default function OrdersScreen() {
  const { user } = useAuth();
  const {
    getOrdersForUser,
    requestReturn,
    setOrderReturnStatus,
    updateOrderStatus,
  } = useBooks();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const list = await getOrdersForUser(user.id);
    setOrders(list);
  }, [user?.id, getOrdersForUser]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const myPurchases = useMemo(
    () => orders.filter((o) => o.buyer_id === user?.id),
    [orders, user?.id]
  );
  const returnRequestsForMe = useMemo(
    () =>
      orders.filter(
        (o) => o.seller_id === user?.id && o.status === "return_requested"
      ),
    [orders, user?.id]
  );
  const mySales = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.seller_id === user?.id &&
          (o.status === "confirmed" || o.status === "shipped")
      ),
    [orders, user?.id]
  );

  const onRequestReturn = useCallback(
    async (orderId: string, reason: string) => {
      setActioningId(orderId);
      const ok = await requestReturn(orderId, reason.trim() || undefined);
      setActioningId(null);
      setReturnOrderId(null);
      setReturnReason("");
      if (ok) {
        await load();
        Alert.alert("Return requested", "Your return request has been submitted. The seller will respond shortly.");
      } else {
        Alert.alert("Error", "Could not submit return request.");
      }
    },
    [requestReturn, load]
  );

  const onMarkShippedOrDelivered = useCallback(
    async (orderId: string, status: "shipped" | "delivered") => {
      setActioningId(orderId);
      const ok = await updateOrderStatus(orderId, status);
      setActioningId(null);
      if (ok) await load();
      else Alert.alert("Error", "Could not update order status.");
    },
    [updateOrderStatus, load]
  );

  const onApproveReject = useCallback(
    async (orderId: string, status: "return_approved" | "return_rejected") => {
      setActioningId(orderId);
      const ok = await setOrderReturnStatus(orderId, status);
      setActioningId(null);
      if (ok) {
        await load();
      } else {
        Alert.alert("Error", "Could not update return status.");
      }
    },
    [setOrderReturnStatus, load]
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.muted}>Please log in to see your orders.</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={styles.title}>My Orders</Text>
        <ActivityIndicator size="large" color="#0F3D3E" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0F3D3E"]}
          />
        }
      >
        <Text style={styles.title}>My Orders</Text>

        {returnRequestsForMe.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Return requests (as seller)</Text>
            {returnRequestsForMe.map((o) => (
              <Pressable
                key={o.id}
                style={styles.card}
                onPress={() => router.push({ pathname: "/order/[id]", params: { id: o.id } })}
              >
                <Text style={styles.bookTitle}>{o.book_title}</Text>
                <Text style={styles.muted}>
                  Buyer: {o.buyer_name} · {formatDate(o.created_at)}
                </Text>
                {o.return_reason ? (
                  <Text style={styles.returnReasonLabel}>Reason: {o.return_reason}</Text>
                ) : null}
                <View style={styles.row}>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      styles.approveBtn,
                      actioningId === o.id && styles.btnDisabled,
                    ]}
                    disabled={!!actioningId}
                    onPress={() => onApproveReject(o.id, "return_approved")}
                  >
                    <Text style={styles.smallBtnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.smallBtn,
                      styles.rejectBtn,
                      actioningId === o.id && styles.btnDisabled,
                    ]}
                    disabled={!!actioningId}
                    onPress={() => onApproveReject(o.id, "return_rejected")}
                  >
                    <Text style={styles.smallBtnText}>Reject</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        {mySales.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>My sales</Text>
            {mySales.map((o) => (
              <Pressable
                key={o.id}
                style={styles.card}
                onPress={() => router.push({ pathname: "/order/[id]", params: { id: o.id } })}
              >
                <Text style={styles.bookTitle}>{o.book_title}</Text>
                <Text style={styles.muted}>
                  Buyer: {o.buyer_name} · {formatDate(o.created_at)} · {statusLabel(o.status)}
                </Text>
                {o.status === "confirmed" ? (
                  <Pressable
                    style={[
                      styles.smallBtn,
                      styles.shipBtn,
                      actioningId === o.id && styles.btnDisabled,
                    ]}
                    disabled={!!actioningId}
                    onPress={() => onMarkShippedOrDelivered(o.id, "shipped")}
                  >
                    <Text style={styles.smallBtnText}>Mark as shipped</Text>
                  </Pressable>
                ) : null}
                {o.status === "shipped" ? (
                  <Pressable
                    style={[
                      styles.smallBtn,
                      styles.shipBtn,
                      actioningId === o.id && styles.btnDisabled,
                    ]}
                    disabled={!!actioningId}
                    onPress={() => onMarkShippedOrDelivered(o.id, "delivered")}
                  >
                    <Text style={styles.smallBtnText}>Mark as delivered</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>My purchases</Text>
        {myPurchases.length === 0 ? (
          <Text style={styles.muted}>No orders yet.</Text>
        ) : (
          myPurchases.map((o) => (
            <Pressable
              key={o.id}
              style={styles.card}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: o.id } })}
            >
              <Text style={styles.bookTitle}>{o.book_title}</Text>
              <Text style={styles.muted}>
                {formatDate(o.created_at)} · {statusLabel(o.status)}
              </Text>
              {canRequestReturn(o) ? (
                <View style={styles.returnSection}>
                  {returnOrderId === o.id ? (
                    <>
                      <Text style={styles.returnReasonLabel}>Why do you want to return?</Text>
                      <TextInput
                        style={styles.returnReasonInput}
                        placeholder="e.g. Condition doesn't match listing"
                        placeholderTextColor="#888"
                        value={returnOrderId === o.id ? returnReason : ""}
                        onChangeText={(t) => {
                          if (returnOrderId === o.id) setReturnReason(t);
                        }}
                        multiline
                        numberOfLines={2}
                      />
                      <View style={styles.row}>
                        <Pressable
                          style={[
                            styles.returnBtn,
                            actioningId === o.id && styles.btnDisabled,
                          ]}
                          disabled={!!actioningId}
                          onPress={() => onRequestReturn(o.id, returnReason)}
                        >
                          <Text style={styles.returnBtnText}>Request return</Text>
                        </Pressable>
                        <Pressable
                          style={styles.cancelReturnBtn}
                          onPress={() => {
                            setReturnOrderId(null);
                            setReturnReason("");
                          }}
                        >
                          <Text style={styles.cancelReturnText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable
                      style={styles.returnBtn}
                      onPress={() => setReturnOrderId(o.id)}
                    >
                      <Text style={styles.returnBtnText}>Request return</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
              {o.status === "return_requested" ? (
                <Text style={styles.statusMessage}>Return requested</Text>
              ) : null}
              {o.status === "return_approved" ? (
                <>
                  <Text style={styles.statusMessage}>Return approved</Text>
                  <Text style={styles.pendingText}>
                    Arrange refund and return with the seller. {DELIVERY_NOTE}
                  </Text>
                </>
              ) : null}
              {o.status === "return_rejected" ? (
                <>
                  <Text style={styles.rejectedText}>Return rejected</Text>
                  <Text style={styles.pendingText}>{DELIVERY_NOTE}</Text>
                </>
              ) : null}
            </Pressable>
          ))
        )}

        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  scroll: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "900", color: "#0F3D3E", marginBottom: 16 },
  loader: { marginTop: 24 },
  muted: { color: "#666", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F3D3E",
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  bookTitle: { fontSize: 16, fontWeight: "900", color: "#0F3D3E" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  approveBtn: { backgroundColor: "#2E5E4E" },
  rejectBtn: { backgroundColor: "#6b7280" },
  smallBtnText: { color: "white", fontWeight: "800", fontSize: 13 },
  returnSection: { marginTop: 10 },
  returnReasonLabel: { fontSize: 13, fontWeight: "700", color: "#0F3D3E", marginTop: 6, marginBottom: 6 },
  returnReasonInput: {
    backgroundColor: "#f5f1e8",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    minHeight: 64,
    textAlignVertical: "top",
    fontSize: 14,
  },
  returnBtn: {
    backgroundColor: "#0F3D3E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
  },
  returnBtnText: { color: "white", fontWeight: "800" },
  cancelReturnBtn: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: "center" },
  cancelReturnText: { color: "#0F3D3E", fontWeight: "800" },
  shipBtn: { backgroundColor: "#2E5E4E", marginTop: 8 },
  statusMessage: { marginTop: 8, fontSize: 14, fontWeight: "800", color: "#0F3D3E" },
  pendingText: { marginTop: 6, fontSize: 13, color: "#666" },
  rejectedText: { marginTop: 8, fontSize: 13, color: "#991b1b", fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  backBtn: {
    marginTop: 24,
    backgroundColor: "#2E5E4E",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  backBtnText: { color: "white", fontWeight: "900" },
});
