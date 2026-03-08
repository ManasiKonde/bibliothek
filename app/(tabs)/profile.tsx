import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, updateName, updateLocation, updateAddress, logout } = useAuth();
  const { books, clearAllBooks } = useBooks();
  const router = useRouter();

  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.location || "India");
  const [addressLine, setAddressLine] = useState(user?.address_line || "");
  const [addressCity, setAddressCity] = useState(user?.address_city || "");
  const [addressPincode, setAddressPincode] = useState(user?.address_pincode || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setLocation(user.location || "India");
      setAddressLine(user.address_line || "");
      setAddressCity(user.address_city || "");
      setAddressPincode(user.address_pincode || "");
    }
  }, [user?.id, user?.name, user?.location, user?.address_line, user?.address_city, user?.address_pincode]);

  const myListingsCount = useMemo(() => {
    if (!user) return 0;
    return books.filter((b) => b.seller?.id === user.id).length;
  }, [books, user]);
  const myBooks = useMemo(() => {
    if (!user) return [];
    return books.filter((b) => b.seller?.id === user.id);
  }, [books, user]);

  const onSave = async () => {
    if (!user) return;

    const cleanName = name.trim();
    const cleanLocation = location.trim();

    if (cleanName.length < 2) {
      Alert.alert("Invalid name", "Name should be at least 2 characters.");
      return;
    }

    if (cleanLocation.length < 2) {
      Alert.alert(
        "Invalid location",
        "Location should be at least 2 characters.",
      );
      return;
    }

    try {
      setSaving(true);
      await updateName(cleanName);
      await updateLocation(cleanLocation);
      const line = addressLine.trim();
      const city = addressCity.trim();
      const pincode = addressPincode.trim();
      if (line || city || pincode) {
        await updateAddress(
          line || "",
          city || "",
          pincode || ""
        );
      }
      Alert.alert("Saved", "Your profile was updated.");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = () => {
    Alert.alert("Logout?", "You'll be taken to login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const onClearBooks = () => {
    Alert.alert(
      "Clear all books?",
      "This removes all listings from local storage (demo reset).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearAllBooks(),
        },
      ],
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.safe}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.muted}>Please log in to see your profile.</Text>
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          data={myBooks}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.container, styles.containerKeyboard]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
          <>
            <Text style={styles.title}>Profile</Text>

            {/* Account Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Account</Text>
              <Text style={styles.muted}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>

              <View style={styles.divider} />

              <Text style={styles.muted}>Your listings</Text>
              <Text style={styles.value}>{myListingsCount}</Text>
            </View>

            {/* Edit Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Details</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                style={styles.input}
              />

              <Text style={styles.label}>Default delivery address (optional)</Text>
              <TextInput
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Address line"
                style={styles.input}
              />
              <TextInput
                value={addressCity}
                onChangeText={setAddressCity}
                placeholder="City"
                style={[styles.input, { marginTop: 8 }]}
              />
              <TextInput
                value={addressPincode}
                onChangeText={(t) => setAddressPincode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="Pincode"
                keyboardType="number-pad"
                style={[styles.input, { marginTop: 8 }]}
              />

              <Pressable
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={styles.primaryText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.cardTitle, { marginBottom: 10 }]}>
              My Listings
            </Text>
          </>
        }
        renderItem={({ item }) => {
          const cover = item.images?.[0];

          return (
            <Pressable
              style={styles.listItem}
              onPress={() => router.push(`/book/${item.id}`)}
            >
              {cover ? (
                <Image source={{ uri: cover }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbFallback}>
                  <Text style={styles.thumbFallbackText}>No Cover</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.muted}>
                  {item.condition} • ₹ {item.price}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/about")}
            >
              <Text style={styles.secondaryText}>About</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/orders")}
            >
              <Text style={styles.secondaryText}>My Orders</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/rentals")}
            >
              <Text style={styles.secondaryText}>My Rentals</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/faq")}
            >
              <Text style={styles.secondaryText}>FAQ</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/terms")}
            >
              <Text style={styles.secondaryText}>Terms & Conditions</Text>
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={onLogout}>
              <Text style={styles.secondaryText}>Logout</Text>
            </Pressable>

            <Pressable style={styles.dangerBtn} onPress={onClearBooks}>
              <Text style={styles.dangerText}>Clear All Books</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </>
        }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: "#F5F1E8",
  },
  containerKeyboard: { paddingBottom: 220 },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F3D3E",
  },
  subtitle: { marginTop: 6, marginBottom: 14, color: "#2E5E4E" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 3,
  },
  cardTitle: {
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 10,
    fontSize: 16,
  },
  muted: { color: "#666" },
  value: { fontWeight: "900", color: "#111", marginTop: 4 },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },

  label: { marginTop: 10, marginBottom: 6, color: "#444", fontWeight: "800" },
  input: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#0F3D3E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: { color: "white", fontWeight: "900", fontSize: 16 },

  secondaryBtn: {
    backgroundColor: "#2E5E4E",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryText: { color: "white", fontWeight: "900" },

  dangerBtn: {
    backgroundColor: "#b91c1c",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  dangerText: { color: "white", fontWeight: "900" },
  listItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#F5F1E8",
    borderRadius: 14,
    padding: 10,
  },
  thumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    resizeMode: "cover",
  },
  thumbFallback: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbFallbackText: {
    color: "#666",
    fontWeight: "800",
    fontSize: 11,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 4,
  },
});
