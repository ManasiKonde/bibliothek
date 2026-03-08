import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import { isPincodeDeliverable } from "@/src/lib/delivery";
import {
  createRazorpayOrderForRental,
  priceToPaise,
  verifyRazorpayRentalAndComplete,
} from "@/src/lib/payment";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RentCheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const { books, getViolationStatus, fetchBooks } = useBooks();
  const book = books.find((b) => b.id === id);

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getViolationStatus(user.id).then((v) => {
      if (v?.blocked) setBlocked(true);
      else if (v?.restricted_until && new Date(v.restricted_until) > new Date()) setBlocked(true);
      else setBlocked(false);
    });
  }, [user?.id, getViolationStatus]);

  if (!book) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.title}>Rent book</Text>
        <Text style={styles.text}>Book not found</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (book.listing_type !== "rent") {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.title}>Not a rental</Text>
        <Text style={styles.text}>This listing is for sale, not rent.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const rentalFee = Number(book.price);
  const deposit = book.security_deposit ?? 0;
  const total = rentalFee + deposit;
  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + (book.rental_days ?? 0));
    return d.toISOString().slice(0, 10);
  })();

  const pincodeTrimmed = pincode.trim().replace(/\s/g, "");
  const pincodeValid = pincodeTrimmed.length === 6;
  const isDeliverable = pincodeValid ? isPincodeDeliverable(pincodeTrimmed) : null;
  const hasAddress =
    addressLine.trim() !== "" &&
    city.trim() !== "" &&
    pincodeValid &&
    phone.trim() !== "";
  const canPay = hasAddress && isDeliverable === true && agreed && !submitting && !!user && !blocked;

  const deliveryPayload =
    hasAddress && isDeliverable
      ? {
          address_line: addressLine.trim(),
          city: city.trim(),
          pincode: pincodeTrimmed,
          phone: phone.trim() || undefined,
          lat,
          lng,
        }
      : undefined;

  const handleUseLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location",
          "Permission denied. Enter your address and pincode manually."
        );
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      Alert.alert(
        "Location saved",
        "Your location is saved. Please enter your full address and pincode below. We deliver only to select areas."
      );
    } catch (e) {
      Alert.alert(
        "Location error",
        e instanceof Error ? e.message : "Could not get location. Enter address manually."
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Login required", "Please log in to rent.");
      return;
    }
    if (blocked) {
      Alert.alert("Cannot rent", "Your account is restricted. Contact support.");
      return;
    }
    if (!agreed) {
      Alert.alert("Agree to terms", "Please check the box to agree to the rental terms.");
      return;
    }
    if (!deliveryPayload) {
      Alert.alert(
        "Address required",
        "Please enter a complete delivery address and ensure we deliver to your pincode."
      );
      return;
    }

    setSubmitting(true);
    const feePaise = priceToPaise(rentalFee);
    const depositPaise = priceToPaise(deposit);
    const receipt = `rental_${book.id}_${Date.now()}`;

    const orderRes = await createRazorpayOrderForRental(feePaise, depositPaise, book, receipt);
    if (!orderRes.ok) {
      setSubmitting(false);
      Alert.alert("Error", orderRes.error ?? "Could not create payment.");
      return;
    }

    let RazorpayCheckout: { open: (opts: unknown) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string }> } | null = null;
    try {
      RazorpayCheckout = require("react-native-razorpay").default;
    } catch {
      RazorpayCheckout = null;
    }

    if (!RazorpayCheckout) {
      setSubmitting(false);
      Alert.alert("Payment unavailable", "Razorpay is not available in this build. Use a dev build for payments.");
      return;
    }

    const { orderId, keyId, amount, currency } = orderRes.data;
    RazorpayCheckout.open({
      order_id: orderId,
      key: keyId,
      amount: String(amount),
      currency,
      name: "Bibliothek",
      description: `Rent: ${book.title} (fee + deposit)`,
    })
      .then(async (data: { razorpay_payment_id: string; razorpay_order_id: string }) => {
        const verifyRes = await verifyRazorpayRentalAndComplete(
          {
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_order_id: data.razorpay_order_id,
          },
          book,
          { id: user.id, name: user.name ?? null },
          deliveryPayload
        );
        setSubmitting(false);
        if (!verifyRes.ok) {
          Alert.alert("Payment failed", verifyRes.error ?? "Could not complete rental.");
          return;
        }
        await fetchBooks();
        const deliveryMsg = `We will deliver to ${deliveryPayload.address_line}, ${deliveryPayload.city} - ${deliveryPayload.pincode}. Our delivery partner will contact you at ${deliveryPayload.phone ?? "your number"} if needed.`;
        Alert.alert(
          "Rental confirmed",
          `Rental fee: Rs ${rentalFee}. Security deposit: Rs ${deposit} (refundable on return). Due date: ${dueDate}. ${deliveryMsg} View in My Rentals.`
        );
        router.replace("/rentals");
      })
      .catch((err: { code?: number; description?: string }) => {
        setSubmitting(false);
        if (err?.code === 2) return;
        Alert.alert("Payment failed", err?.description ?? "Payment was cancelled or failed.");
      });
  };

  const cover = book.images?.[0];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Rent this book</Text>

        <View style={styles.card}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : null}
          <View style={styles.info}>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.muted}>Rental period: {book.rental_days} days</Text>
            <Text style={styles.termsLabel}>Usage rules</Text>
            <Text style={styles.termsText}>{book.usage_rules ?? "—"}</Text>
            <Text style={styles.termsLabel}>Penalties</Text>
            <Text style={styles.termsText}>
              Damage: Rs {book.damage_penalty ?? 0}. Late return: Rs {book.late_penalty_per_day ?? 0} per day.
            </Text>
          </View>
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalRow}>Rental fee: Rs {rentalFee}</Text>
          <Text style={styles.totalRow}>Security deposit (refundable): Rs {deposit}</Text>
          <Text style={styles.totalFinal}>Total at checkout: Rs {total}</Text>
        </View>

        <Text style={styles.sectionTitle}>Delivery address</Text>
        <View style={styles.addressCard}>
          <Pressable
            style={styles.locationBtn}
            onPress={handleUseLocation}
            disabled={locationLoading}
          >
            <Text style={styles.locationBtnText}>
              {locationLoading ? "Getting location..." : "Use my location"}
            </Text>
          </Pressable>
          {lat != null && lng != null ? (
            <Text style={styles.muted}>Location saved. Enter address and pincode below.</Text>
          ) : null}

          <Text style={styles.label}>Address (building, street, area)</Text>
          <TextInput
            style={styles.input}
            value={addressLine}
            onChangeText={setAddressLine}
            placeholder="e.g. 123, Main Road, Block A"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="City"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>State (optional)</Text>
          <TextInput
            style={styles.input}
            value={state}
            onChangeText={setState}
            placeholder="State"
            placeholderTextColor="#999"
          />
          <Text style={styles.label}>Pincode (6 digits)</Text>
          <TextInput
            style={styles.input}
            value={pincode}
            onChangeText={setPincode}
            placeholder="e.g. 110001"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
          />
          {pincodeValid && isDeliverable === false ? (
            <Text style={styles.notDeliverable}>
              We are not delivering at this location yet. Please check serviceable areas or use a different pincode.
            </Text>
          ) : null}
          {pincodeValid && isDeliverable === true ? (
            <Text style={styles.deliverable}>We deliver to this pincode.</Text>
          ) : null}

          <Text style={styles.label}>Phone (for delivery contact)</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <Pressable
          style={[styles.checkboxRow, agreed && styles.checkboxRowChecked]}
          onPress={() => setAgreed((a) => !a)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]} />
          <Text style={styles.checkboxLabel}>
            I agree to the rental terms, usage rules, and penalty clauses. I will return the book by the due date in acceptable condition.
          </Text>
        </Pressable>

        {blocked ? (
          <Text style={styles.blockedText}>Your account cannot place new rentals at this time.</Text>
        ) : (
          <Pressable
            style={[styles.primaryBtn, (!canPay || submitting) && styles.btnDisabled]}
            disabled={!canPay || submitting}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? "Confirming..." : `Pay Rs ${total} (rental + deposit)`}
            </Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F1E8" },
  scroll: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#F5F1E8",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "900", color: "#0F3D3E", marginBottom: 14 },
  text: { color: "#444", marginBottom: 18 },

  card: { backgroundColor: "white", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  cover: { width: "100%", height: 200, resizeMode: "cover" },
  info: { padding: 14 },
  bookTitle: { fontSize: 18, fontWeight: "900", color: "#0F3D3E", marginBottom: 6 },
  muted: { color: "#666", marginBottom: 8 },
  termsLabel: { fontSize: 14, fontWeight: "700", color: "#0F3D3E", marginTop: 8 },
  termsText: { fontSize: 14, color: "#333", marginTop: 4 },

  totals: { backgroundColor: "#E8F0EF", padding: 14, borderRadius: 12, marginBottom: 16 },
  totalRow: { fontSize: 14, color: "#333", marginBottom: 4 },
  totalFinal: { fontSize: 16, fontWeight: "800", color: "#0F3D3E", marginTop: 6 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F3D3E",
    marginTop: 8,
    marginBottom: 8,
  },
  addressCard: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F3D3E",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
  },
  locationBtn: {
    backgroundColor: "#2E5E4E",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  locationBtnText: { color: "white", fontWeight: "800", fontSize: 14 },
  notDeliverable: {
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "700",
    marginTop: 6,
  },
  deliverable: {
    fontSize: 13,
    color: "#0F3D3E",
    fontWeight: "700",
    marginTop: 6,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  checkboxRowChecked: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#0F3D3E",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#0F3D3E" },
  checkboxLabel: { flex: 1, fontSize: 14, color: "#333" },

  blockedText: { color: "#dc2626", fontWeight: "700", marginBottom: 16 },
  primaryBtn: {
    backgroundColor: "#0F3D3E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: "#2E5E4E",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "white", fontWeight: "900" },
});
