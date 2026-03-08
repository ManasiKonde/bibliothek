import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FAQS = [
  {
    q: "How do I sell a book?",
    a: "Go to the Sell tab, upload clear images (cover + corners + spine), fill title/price/condition, and submit.",
  },
  {
    q: "How many images can I upload?",
    a: "Up to 5 images per listing right now (we’ll increase later when we move to cloud storage).",
  },
  {
    q: "How does condition work?",
    a: "You choose the condition label (Like New / Good / Used / Annotated etc.) and buyers can verify via images + reviews.",
  },
  {
    q: "Can buyers return books?",
    a: "Yes. Request a return within 7 days (My Orders, then Request return). The seller can approve or reject. Refunds and return shipping are between you and the seller.",
  },
  {
    q: "Will renting be added?",
    a: "Yes — Rent is planned as a future feature with duration, rules, and return tracking.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.safe}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>FAQs ❓</Text>
        <Text style={styles.subtitle}>Quick answers, no drama.</Text>

        {FAQS.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <View key={idx} style={styles.card}>
              <Pressable
                onPress={() => setOpenIndex(open ? null : idx)}
                style={styles.row}
              >
                <Text style={styles.q}>{item.q}</Text>
                <Text style={styles.icon}>{open ? "−" : "+"}</Text>
              </Pressable>

              {open ? <Text style={styles.a}>{item.a}</Text> : null}
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: "900", color: "#0F3D3E" },
  subtitle: { marginTop: 6, marginBottom: 14, color: "#2E5E4E" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  q: { flex: 1, fontWeight: "900", color: "#0F3D3E", fontSize: 15 },
  icon: { fontSize: 20, fontWeight: "900", color: "#0F3D3E" },
  a: { marginTop: 10, color: "#444", lineHeight: 20 },
});
