import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Terms() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
        </Pressable>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Terms & Conditions</Text>
        <Text style={styles.subtitle}>Last updated: February 2025</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>1. Using Bibliothek</Text>
          <Text style={styles.text}>
            By using the Bibliothek app you agree to these terms. Bibliothek is a
            marketplace where users can list, buy, and sell books. You are
            responsible for the accuracy of your listings and for completing
            transactions in good faith.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>2. Listings and condition</Text>
          <Text style={styles.text}>
            Sellers must describe book condition honestly and provide clear
            photos. Buyers should review listings before purchasing. Disputes
            about condition may be eligible for returns under our Return Policy
            below.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>3. Return Policy</Text>
          <Text style={styles.text}>
            You may request a return within 7 days of delivery if the book
            condition does not match the listing (e.g. damage not described,
            wrong edition, or missing pages noted in the listing). To request a
            return, go to Profile, open "My Orders", and tap "Request return" on
            the order. The seller may approve or reject the request. If
            approved, you and the seller are responsible for arranging the
            return (shipping, etc.). Bibliothek does not handle refunds or
            payments; resolve any refund directly with the seller.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>4. Your account</Text>
          <Text style={styles.text}>
            You must provide accurate account information. You are responsible
            for keeping your password secure. Do not share your account or use
            Bibliothek for fraud or abuse.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>5. Changes</Text>
          <Text style={styles.text}>
            We may update these terms from time to time. Continued use of the
            app after changes means you accept the updated terms.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e0d8",
  },
  iconBtn: { padding: 8, minWidth: 40 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0F3D3E" },
  scroll: { flex: 1 },
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "900", color: "#0F3D3E" },
  subtitle: { marginTop: 6, marginBottom: 14, color: "#2E5E4E" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
  },
  heading: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 8,
  },
  text: { color: "#444", lineHeight: 20, marginBottom: 6 },
});
