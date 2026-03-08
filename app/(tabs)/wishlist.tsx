import { useBooks } from "@/src/context/BookContext";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WishlistScreen() {
  const router = useRouter();
  const { books, wishlist, clearWishlist } = useBooks();

  const savedBooks = useMemo(() => {
    const set = new Set(wishlist);
    // Keep the wishlist order (newest saved first) by mapping wishlist ids -> books
    return wishlist
      .map((id) => books.find((b) => b.id === id))
      .filter(Boolean) as typeof books;
  }, [books, wishlist]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Wishlist</Text>
            <Text style={styles.subtitle}>
              Saved books you don't wanna lose 💘
            </Text>
          </View>

          {wishlist.length > 0 ? (
            <Pressable
              onPress={clearWishlist}
              style={styles.clearBtn}
              accessibilityRole="button"
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        <FlatList
          data={savedBooks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No saved books yet 🥲</Text>
              <Text style={styles.emptyText}>
                Open a book and tap the heart to save it.
              </Text>

              <Pressable
                style={styles.primaryBtn}
                onPress={() => router.replace("/")}
              >
                <Text style={styles.primaryText}>Browse books</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const cover = item.images?.[0];
            const title = item.title != null ? String(item.title) : "";
            const condition = item.condition != null ? String(item.condition) : "Condition";
            const price = item.price != null ? String(item.price) : "";
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/book/${item.id}`)}
              >
                {cover && typeof cover === "string" ? (
                  <Image source={{ uri: cover }} style={styles.cover} />
                ) : (
                  <View style={styles.coverFallback}>
                    <Text style={styles.coverFallbackText}>No cover</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {condition} • ₹ {price}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  title: { fontSize: 28, fontWeight: "900", color: "#0F3D3E" },
  subtitle: { marginTop: 4, color: "#2E5E4E" },

  clearBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#eee",
  },
  clearText: { fontWeight: "900", color: "#b91c1c" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 3,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  cover: { width: 60, height: 60, borderRadius: 14, resizeMode: "cover" },
  coverFallback: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  coverFallbackText: { fontSize: 11, fontWeight: "800", color: "#666" },

  bookTitle: { fontSize: 14, fontWeight: "900", color: "#0F3D3E" },
  muted: { color: "#666", marginTop: 4 },

  emptyWrap: { marginTop: 60, alignItems: "center", paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#0F3D3E" },
  emptyText: { marginTop: 8, textAlign: "center", color: "#555" },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#0F3D3E",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  primaryText: { color: "white", fontWeight: "900" },
});
