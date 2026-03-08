import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function About() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.safe}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>About Bibliothek 📚</Text>
        <Text style={styles.subtitle}>Where the stories travel.</Text>

        <View style={styles.card}>
          <Text style={styles.heading}>What is Bibliothek?</Text>
          <Text style={styles.text}>
            Bibliothek is a reader-first marketplace where people can buy and
            sell books with confidence. Listings include real images and honest
            condition notes so buyers don’t have to “hope” the book is fine —
            they can actually see it.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Why it exists</Text>
          <Text style={styles.text}>
            Existing marketplaces focus on commerce. Bibliothek focuses on trust
            + community. Every reader can be both a buyer and a seller.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>What we care about</Text>
          <Text style={styles.text}>• Clear photos and transparency</Text>
          <Text style={styles.text}>• Real condition & feedback</Text>
          <Text style={styles.text}>• Reader-first UX</Text>
          <Text style={styles.text}>• Sustainable reuse of books</Text>
        </View>

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
