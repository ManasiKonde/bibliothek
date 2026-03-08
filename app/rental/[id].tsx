import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Rental, RentalStatus } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createRazorpayOrderAmount, priceToPaise } from "@/src/lib/payment";
import { supabase } from "@/src/lib/supabaseClient";

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
    case "active": return "Active";
    case "overdue": return "Overdue";
    case "completed": return "Completed";
    case "blocked": return "Blocked";
    default: return s;
  }
}

export default function RentalDetailScreen() {
  const { user } = useAuth();
  const {
    getRentalsForUser,
    getRentalTransactions,
    requestRentalExtension,
    markRentalReturned,
    recordRentalViolation,
  } = useBooks();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<{ type: string; amount_paise: number; notes: string | null; created_at: string }[]>([]);
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !id) {
      setRental(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getRentalsForUser(user.id);
    const r = list.find((x) => x.id === id) ?? null;
    setRental(r);
    if (r) {
      const tx = await getRentalTransactions(r.id);
      setTransactions(tx);
    }
    setLoading(false);
  }, [user?.id, id, getRentalsForUser, getRentalTransactions]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.title}>Rental</Text>
          <Text style={styles.muted}>Please log in.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !rental) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
          </Pressable>
          <Text style={styles.headerTitle}>Rental</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>{loading ? "Loading..." : "Rental not found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isBuyer = rental.buyer_id === user.id;
  const dueDate = rental.extended_due_date ?? rental.due_date;
  const canExtend = isBuyer && rental.status === "active" && !rental.extension_used;
  const EXTENSION_DAYS = 7;
  const EXTENSION_FEE = 50;

  const handleExtend = () => {
    if (EXTENSION_FEE > 0) {
      createRazorpayOrderAmount(priceToPaise(EXTENSION_FEE), `ext_${rental.id}_${Date.now()}`).then((orderRes) => {
        if (!orderRes.ok) {
          Alert.alert("Error", orderRes.error ?? "Could not start payment.");
          return;
        }
        let RazorpayCheckout: { open: (opts: unknown) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string }> } | null = null;
        try {
          RazorpayCheckout = require("react-native-razorpay").default;
        } catch {
          RazorpayCheckout = null;
        }
        if (!RazorpayCheckout) {
          Alert.alert("Payment unavailable", "Razorpay not available in this build.");
          return;
        }
        const { orderId, keyId, amount, currency } = orderRes.data;
        RazorpayCheckout.open({
          order_id: orderId,
          key: keyId,
          amount: String(amount),
          currency,
          name: "Bibliothek",
          description: `Extension ${EXTENSION_DAYS} days`,
        })
          .then(async (data: { razorpay_payment_id: string }) => {
            const ok = await requestRentalExtension(
              rental.id,
              EXTENSION_DAYS,
              EXTENSION_FEE,
              data.razorpay_payment_id
            );
            if (ok) {
              load();
              Alert.alert("Extended", `Rental extended by ${EXTENSION_DAYS} days. Fee: Rs ${EXTENSION_FEE}.`);
            } else {
              Alert.alert("Error", "Could not extend or extension already used.");
            }
          })
          .catch((err: { code?: number }) => {
            if (err?.code !== 2) Alert.alert("Payment failed", "Payment was cancelled or failed.");
          });
      });
    } else {
      requestRentalExtension(rental.id, EXTENSION_DAYS, 0).then((ok) => {
        if (ok) {
          load();
          Alert.alert("Extended", `Rental extended by ${EXTENSION_DAYS} days.`);
        } else {
          Alert.alert("Error", "Could not extend or extension already used.");
        }
      });
    }
  };

  const pickReturnImages = async (): Promise<string[]> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return [];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || !user) return [];
    const uploaded: string[] = [];
    for (const asset of result.assets.slice(0, 5)) {
      try {
        const base64 = await readAsStringAsync(asset.uri, { encoding: "base64" });
        const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const ext = asset.uri.split(".").pop()?.split("?")[0] ?? "jpg";
        const path = `${user.id}/return_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("book-images").upload(path, binary, {
          contentType: ext === "png" ? "image/png" : "image/jpeg",
        });
        if (!error) {
          const { data } = supabase.storage.from("book-images").getPublicUrl(path);
          uploaded.push(data.publicUrl);
        }
      } catch {
        /* skip */
      }
    }
    return uploaded;
  };

  const handleMarkReturned = () => {
    Alert.alert(
      "Mark as returned",
      "Add return condition photos (optional)?",
      [
        { text: "Skip", style: "cancel", onPress: () => confirmMarkReturned([]) },
        {
          text: "Add photos",
          onPress: async () => {
            setUploading(true);
            const urls = await pickReturnImages();
            setUploading(false);
            confirmMarkReturned(urls);
          },
        },
      ]
    );
  };

  const confirmMarkReturned = (returnImageUrls: string[]) => {
    const returnDate = new Date().toISOString();
    const due = new Date(rental.extended_due_date ?? rental.due_date);
    const returned = new Date(returnDate);
    const daysLate = Math.max(0, Math.ceil((returned.getTime() - due.getTime()) / (24 * 60 * 60 * 1000)));
    const lateFee = daysLate * rental.late_penalty_per_day;

    if (daysLate > 0) {
      recordRentalViolation(rental.buyer_id, "warning").catch(() => {});
    }

    if (lateFee > 0) {
      Alert.alert(
        "Late return",
        `Returned ${daysLate} day(s) late. Late fee: Rs ${lateFee} will be deducted from deposit.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () =>
              doMarkReturned(returnDate, returnImageUrls, {
                lateFeeCharged: lateFee,
                damageFeeCharged: 0,
              }),
          },
        ]
      );
    } else {
      Alert.alert(
        "Deduct damage?",
        "Deduct damage penalty (Rs " + rental.damage_penalty + ") from deposit?",
        [
          { text: "No damage", onPress: () => doMarkReturned(returnDate, returnImageUrls, { lateFeeCharged: 0, damageFeeCharged: 0 }) },
          {
            text: "Yes, deduct Rs " + rental.damage_penalty,
            onPress: () =>
              doMarkReturned(returnDate, returnImageUrls, {
                lateFeeCharged: 0,
                damageFeeCharged: rental.damage_penalty,
              }),
          },
        ]
      );
    }
  };

  const doMarkReturned = async (
    returnDate: string,
    returnImageUrls: string[],
    options: { lateFeeCharged: number; damageFeeCharged: number }
  ) => {
    const ok = await markRentalReturned(rental.id, returnDate, returnImageUrls.length ? returnImageUrls : undefined, {
      lateFee: options.lateFeeCharged,
      damageFee: options.damageFeeCharged,
    });
    if (ok) {
      load();
      Alert.alert("Returned", "Rental complete. Deposit (minus any deductions) will be refunded.");
    } else {
      Alert.alert("Error", "Could not update.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{rental.book_title ?? "Rental"}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Status</Text>
          <Text style={styles.statusText}>{statusLabel(rental.status)}</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Dates</Text>
          <Text style={styles.row}>Start: {rental.start_date ? formatDate(rental.start_date) : "—"}</Text>
          <Text style={styles.row}>Due: {formatDate(dueDate)}</Text>
          {rental.return_date ? (
            <Text style={styles.row}>Returned: {formatDate(rental.return_date)}</Text>
          ) : null}
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Terms</Text>
          <Text style={styles.termsText}>{rental.usage_rules}</Text>
          <Text style={styles.row}>Damage penalty: Rs {rental.damage_penalty}</Text>
          <Text style={styles.row}>Late penalty: Rs {rental.late_penalty_per_day} per day</Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Amounts</Text>
          <Text style={styles.row}>Rental fee: Rs {rental.rental_fee}</Text>
          {rental.extension_fee != null && rental.extension_fee > 0 ? (
            <Text style={styles.row}>Extension fee: Rs {rental.extension_fee}</Text>
          ) : null}
          <Text style={styles.row}>Security deposit: Rs {rental.security_deposit} {rental.deposit_refunded_at ? "(refunded)" : ""}</Text>
          {rental.late_fee_charged > 0 ? (
            <Text style={styles.row}>Late fee deducted: Rs {rental.late_fee_charged}</Text>
          ) : null}
          {rental.damage_fee_charged > 0 ? (
            <Text style={styles.row}>Damage fee deducted: Rs {rental.damage_fee_charged}</Text>
          ) : null}
        </View>

        {transactions.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Payment history</Text>
            {transactions.map((tx, i) => (
              <View key={i} style={styles.txRow}>
                <Text style={styles.txType}>{tx.type.replace(/_/g, " ")}</Text>
                <Text style={styles.txAmount}>{tx.amount_paise >= 0 ? "+" : ""}Rs {(tx.amount_paise / 100).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {canExtend ? (
          <Pressable style={styles.primaryBtn} onPress={handleExtend}>
            <Text style={styles.primaryBtnText}>
              Extend rental (once){EXTENSION_FEE > 0 ? ` – Rs ${EXTENSION_FEE}` : ""}
            </Text>
          </Pressable>
        ) : null}

        {!isBuyer && (rental.status === "active" || rental.status === "overdue") && !rental.return_date ? (
          <>
            <Pressable
              style={[styles.primaryBtn, uploading && styles.btnDisabled]}
              disabled={uploading}
              onPress={handleMarkReturned}
            >
              <Text style={styles.primaryBtnText}>{uploading ? "Uploading..." : "Mark as returned"}</Text>
            </Pressable>
            <Pressable
              style={styles.reportBtn}
              onPress={() => {
                Alert.alert(
                  "Report violation",
                  "Record a warning for this renter (e.g. late return, damage)?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Report",
                      onPress: () => {
                        recordRentalViolation(rental.buyer_id, "warning").then((ok) => {
                          if (ok) Alert.alert("Reported", "Warning recorded.");
                          else Alert.alert("Error", "Could not record.");
                        });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.reportBtnText}>Report violation</Text>
            </Pressable>
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "900", color: "#0F3D3E", marginBottom: 8 },
  muted: { color: "#666", textAlign: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#0F3D3E", textAlign: "center" },

  scroll: { padding: 16, paddingBottom: 40 },
  block: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  blockTitle: { fontSize: 14, fontWeight: "800", color: "#0F3D3E", marginBottom: 8 },
  statusText: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 4 },
  row: { fontSize: 14, color: "#333", marginBottom: 4 },
  termsText: { fontSize: 14, color: "#333", marginBottom: 8 },

  primaryBtn: {
    backgroundColor: "#0F3D3E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  reportBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  reportBtnText: { fontSize: 14, fontWeight: "700", color: "#dc2626" },
  txRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  txType: { fontSize: 14, color: "#333", textTransform: "capitalize" },
  txAmount: { fontSize: 14, fontWeight: "700", color: "#0F3D3E" },
});
