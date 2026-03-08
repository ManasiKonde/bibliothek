import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { books } from "../data/books";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bibliothek</Text>
      <Text style={styles.subtitle}>Where the stories travel.</Text>

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text>{item.condition}</Text>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          </View>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push("/sell")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F5F1E8",
  },

  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0F3D3E",
  },

  subtitle: {
    marginBottom: 20,
    color: "#2E5E4E",
  },

  card: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    elevation: 3,
  },

  image: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },

  info: {
    paddingVertical: 4,
  },

  bookTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },

  price: {
    marginTop: 5,
    fontWeight: "600",
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0F3D3E",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    zIndex: 10,
  },

  fabText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: -2,
  },
});
