import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

function getConditionStyle(condition?: string) {
  const c = (condition || "").toLowerCase();
  if (c.includes("like new") || c.includes("new")) return styles.chipLikeNew;
  if (c.includes("good")) return styles.chipGood;
  if (c.includes("used")) return styles.chipUsed;
  if (c.includes("annot")) return styles.chipAnnotated;
  if (c.includes("dog")) return styles.chipDogEared;
  return styles.chipDefault;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { books, getUnreadCount } = useBooks();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }
      getUnreadCount().then(setUnreadCount);
    }, [user?.id, getUnreadCount])
  );

  const filtered = useMemo(() => {
    // Home shows only other users' books (not the current user's listings)
    let result = user?.id
      ? books.filter((b) => b.seller?.id !== user.id)
      : [...books];

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((b) => (b.title || "").toLowerCase().includes(q));
    }

    // Condition filter
    if (selectedCondition !== "All") {
      result = result.filter((b) => b.condition === selectedCondition);
    }

    // 💰 Sorting
    if (sortOrder === "asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortOrder === "desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result;
  }, [books, user?.id, query, selectedCondition, sortOrder]);
  const Empty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>No books found 📚</Text>
      <Text style={styles.emptyText}>
        Try changing filters or list your first book.
      </Text>

      <TouchableOpacity
        style={styles.emptyBtn}
        activeOpacity={0.9}
        onPress={() => router.push("/sell")}
      >
        <Text style={styles.emptyBtnText}>Sell your first book</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Bibliothek</Text>
          <Text style={styles.subtitle}>Where the stories travel.</Text>
        </View>
        <Pressable
          style={styles.messageIconBtn}
          onPress={() => router.push("/inbox")}
          accessibilityLabel="Messages"
        >
          <View>
            <Ionicons name="chatbubble-outline" size={26} color="#0F3D3E" />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title…"
          placeholderTextColor="#7a7a7a"
          style={styles.searchInput}
        />
      </View>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            selectedCondition === "All" && styles.filterActive,
          ]}
          onPress={() => setSelectedCondition("All")}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            selectedCondition === "Good" && styles.filterActive,
          ]}
          onPress={() => setSelectedCondition("Good")}
        >
          <Text style={styles.filterText}>Good</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            selectedCondition === "Like New" && styles.filterActive,
          ]}
          onPress={() => setSelectedCondition("Like New")}
        >
          <Text style={styles.filterText}>Like New</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() =>
            setSortOrder((prev) =>
              prev === "none" ? "asc" : prev === "asc" ? "desc" : "none",
            )
          }
        >
          <Text style={styles.filterText}>
            {sortOrder === "none"
              ? "Sort"
              : sortOrder === "asc"
                ? "₹ Low → High"
                : "₹ High → Low"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={Empty}
        renderItem={({ item }) => {
          const firstImage = item.images?.[0];
          const coverUri = typeof firstImage === "string" && firstImage.startsWith("http") ? firstImage : null;
          const extraCount = (item.images?.length || 0) - 1;

          return (
            <Link href={`/book/${item.id}`} asChild>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.92}
              >
              <View style={styles.coverWrap}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.cover} />
                ) : (
                  <View style={styles.noCover}>
                    <Text style={styles.noCoverText}>No cover</Text>
                  </View>
                )}

                {extraCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{extraCount} photos</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.metaRow}>
                  <View
                    style={[styles.chipBase, getConditionStyle(item.condition)]}
                  >
                    <Text style={styles.chipText}>
                      {item.condition || "Condition"}
                    </Text>
                  </View>
                  {item.sold ? (
                    <View style={styles.soldChip}>
                      <Text style={styles.soldChipText}>Sold</Text>
                    </View>
                  ) : null}
                  <Text style={styles.price}>₹ {item.price}</Text>
                  <View style={styles.trustRow}>
                    <Text style={styles.trustBadge}>Verified Seller</Text>
                    {item.flags?.length === 0 ? (
                      <Text style={styles.trustBadgeGreen}>
                        No Damage Reported
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            </Link>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: "#F5F1E8",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  header: { fontSize: 30, fontWeight: "800", color: "#0F3D3E" },
  subtitle: { marginTop: 4, color: "#2E5E4E" },
  messageIconBtn: { padding: 8 },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  searchWrap: {
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 2,
    marginBottom: 14,
  },
  searchInput: { fontSize: 15, color: "#111" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 18,
    overflow: "hidden",
    elevation: 4,
  },
  coverWrap: { position: "relative", backgroundColor: "#fff" },
  cover: { width: "100%", height: 230, resizeMode: "cover" },
  noCover: {
    width: "100%",
    height: 230,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  noCoverText: { color: "#666", fontWeight: "600" },

  badge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(15, 61, 62, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { color: "white", fontSize: 12, fontWeight: "700" },

  info: { padding: 14 },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F3D3E",
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 16, fontWeight: "900", color: "#0F3D3E" },

  chipBase: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "800", color: "#111" },
  soldChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#b91c1c",
  },
  soldChipText: { fontSize: 12, fontWeight: "800", color: "white" },
  chipDefault: { backgroundColor: "#EAEAEA" },
  chipLikeNew: { backgroundColor: "#D1FAE5" },
  chipGood: { backgroundColor: "#DBEAFE" },
  chipUsed: { backgroundColor: "#FEF3C7" },
  chipAnnotated: { backgroundColor: "#FCE7F3" },
  chipDogEared: { backgroundColor: "#E9D5FF" },

  emptyWrap: { marginTop: 50, alignItems: "center", padding: 20 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 8,
  },
  emptyText: { textAlign: "center", color: "#555", marginBottom: 14 },
  emptyBtn: {
    backgroundColor: "#0F3D3E",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: "white", fontWeight: "900" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EAEAEA",
  },

  filterActive: {
    backgroundColor: "#0F3D3E",
  },

  filterText: {
    fontWeight: "800",
    fontSize: 12,
    color: "#111",
  },

  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
  },
  trustRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  trustBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
    color: "#0369A1",
  },

  trustBadgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
});
