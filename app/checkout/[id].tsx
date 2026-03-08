import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import { isPincodeDeliverable } from "@/src/lib/delivery";
import {
  createRazorpayOrder,
  priceToPaise,
  verifyRazorpayPaymentAndComplete,
} from "@/src/lib/payment";
import * as Location from "expo-location";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [locationLoading, setLocationLoading] = useState(false);

  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const { books, createOrder, markAsSold, fetchBooks } = useBooks();
  const book = books.find((b) => b.id === id);

  const pincodeTrimmed = pincode.trim().replace(/\s/g, "");
  const pincodeValid = pincodeTrimmed.length === 6;
  const isDeliverable = pincodeValid ? isPincodeDeliverable(pincodeTrimmed) : null;
  const hasAddress =
    addressLine.trim() !== "" &&
    city.trim() !== "" &&
    pincodeValid &&
    phone.trim() !== "";
  const canPay = hasAddress && isDeliverable === true && !submitting && !!user;

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

  if (!book) {
    return (
      <SafeAreaView style={styles.center} edges={["top"]}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.text}>Book not found</Text>

        <Pressable style={styles.primaryBtn} onPress={() => router.push("/")}>
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const cover = book.images?.[0];
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Checkout</Text>

        <View style={styles.card}>
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : null}

          <View style={styles.info}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {book.title}
            </Text>
            <Text style={styles.muted}>{book.condition}</Text>
            <Text style={styles.price}>Rs {book.price}</Text>

            <View style={styles.line} />

            <Text style={styles.muted}>Sold by: {book.seller?.name}</Text>
            <Text style={styles.muted}>Location: {book.seller?.location}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Delivery address</Text>
        <View style={styles.card}>
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
          style={[styles.primaryBtn, (!canPay || submitting) && styles.btnDisabled]}
          disabled={!canPay || submitting}
          onPress={async () => {
            if (!user) {
              Alert.alert("Login required", "Please log in to confirm purchase.");
              return;
            }
            if (!deliveryPayload) {
              Alert.alert("Address required", "Please enter a complete delivery address and ensure we deliver to your pincode.");
              return;
            }
            setSubmitting(true);

            const placeOrder = async (delivery?: typeof deliveryPayload) => {
              const res = await createOrder(
                book,
                { id: user.id, name: user.name ?? null },
                delivery
              );
              if (!res.ok) {
                Alert.alert("Error", res.error ?? "Could not create order.");
                setSubmitting(false);
                return;
              }
              await markAsSold(book.id);
              await fetchBooks();
              const deliveryMsg = delivery
                ? `We will deliver to ${delivery.address_line}, ${delivery.city} - ${delivery.pincode}. Our delivery partner will contact you at ${delivery.phone ?? "your number"} if needed.`
                : "";
              Alert.alert(
                "Order confirmed",
                `Payment successful. You bought: ${book.title}. ${deliveryMsg}`.trim()
              );
              router.push("/(tabs)");
              setSubmitting(false);
            };

            try {
              const amountPaise = priceToPaise(book.price);
              if (amountPaise < 100) {
                await placeOrder(deliveryPayload);
                return;
              }

              const orderRes = await createRazorpayOrder(
                amountPaise,
                book,
                `book_${book.id}_${Date.now()}`
              );

              if (!orderRes.ok) {
                await placeOrder(deliveryPayload);
                return;
              }

              let RazorpayCheckout: { open: (opts: unknown) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string }> } | null = null;
              try {
                RazorpayCheckout = require("react-native-razorpay").default;
              } catch {
                RazorpayCheckout = null;
              }

              if (!RazorpayCheckout) {
                await placeOrder(deliveryPayload);
                return;
              }

              const { orderId, keyId, amount, currency } = orderRes.data;
              RazorpayCheckout.open({
                order_id: orderId,
                key: keyId,
                amount: String(amount),
                currency,
                name: "Bibliothek",
                description: book.title,
              })
                .then(async (data: { razorpay_payment_id: string; razorpay_order_id: string }) => {
                  const verifyRes = await verifyRazorpayPaymentAndComplete(
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
                    Alert.alert("Payment failed", verifyRes.error ?? "Could not complete order. Please try again.");
                    return;
                  }
                  await fetchBooks();
                  const deliveryMsg = `We will deliver to ${deliveryPayload.address_line}, ${deliveryPayload.city} - ${deliveryPayload.pincode}. Our delivery partner will contact you at ${deliveryPayload.phone ?? "your number"} if needed.`;
                  Alert.alert(
                    "Payment successful",
                    `Order confirmed. You bought: ${book.title}. ${deliveryMsg}`
                  );
                  router.push("/(tabs)");
                })
                .catch((err: { code?: number; description?: string }) => {
                  setSubmitting(false);
                  if (err?.code === 2) {
                    return;
                  }
                  Alert.alert(
                    "Payment failed",
                    err?.description ?? "Payment was cancelled or failed. Place order without payment?",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Place order anyway", onPress: () => placeOrder(deliveryPayload) },
                    ]
                  );
                });
            } catch (e) {
              setSubmitting(false);
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Something went wrong."
              );
            }
          }}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? "Placing order..." : `Pay Rs ${book.price}`}
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          By confirming you agree to our{" "}
          <Link href="/terms" asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </Pressable>
          </Link>
          .
        </Text>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Back</Text>
        </Pressable>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#F5F1E8",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 14,
  },
  text: { color: "#444", marginBottom: 18 },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  cover: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  info: {
    padding: 14,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 6,
  },
  muted: { color: "#666" },
  price: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "900",
    color: "#1e3a8a",
  },
  line: {
    marginVertical: 12,
    height: 1,
    backgroundColor: "#eee",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F3D3E",
    marginTop: 16,
    marginBottom: 8,
  },
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

  primaryBtn: {
    marginTop: 18,
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

  footer: {
    marginTop: 14,
    fontSize: 12,
    color: "#666",
  },
  footerLink: {
    color: "#0F3D3E",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
