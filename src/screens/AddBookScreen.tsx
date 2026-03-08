import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Book, BookCondition, BookFlag, ListingType } from "@/src/types/models";
import { readAsStringAsync } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { Picker } from "@react-native-picker/picker";
import { supabase } from "@/src/lib/supabaseClient";

const BOOK_CONDITIONS: BookCondition[] = [
  "Like New",
  "Very Good",
  "Good",
  "Used",
  "Acceptable",
  "Annotated",
  "Dog-eared",
];

const BOOK_FLAGS: BookFlag[] = [
  "Highlights",
  "Annotations",
  "Torn Pages",
  "Dog-eared Pages",
  "Water Damage",
  "Loose Binding",
  "Missing Pages",
  "Cover Damage",
];

function uniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getContentType(ext: string | undefined): string {
  const e = (ext ?? "").toLowerCase();
  if (e === "png") return "image/png";
  if (e === "gif") return "image/gif";
  if (e === "webp") return "image/webp";
  return "image/jpeg";
}

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

export default function AddBookScreen() {
  const { addBook } = useBooks();
  const { user } = useAuth();
  const router = useRouter();

  const [listingType, setListingType] = useState<ListingType>("sell");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<BookCondition>("Good");
  const [flags, setFlags] = useState<BookFlag[]>([]);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [rentalDays, setRentalDays] = useState("");
  const [usageRules, setUsageRules] = useState("");
  const [damagePenalty, setDamagePenalty] = useState("");
  const [majorDamagePenalty, setMajorDamagePenalty] = useState("");
  const [latePenaltyPerDay, setLatePenaltyPerDay] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [extensionDays, setExtensionDays] = useState("");
  const [extensionFee, setExtensionFee] = useState("");

  const imageCountText = useMemo(
    () => `${images.length}/${MAX_IMAGES}`,
    [images.length],
  );

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your gallery.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) =>
        Array.from(new Set([...prev, ...uris])).slice(0, MAX_IMAGES),
      );
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((x) => x !== uri));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user) return [];

    const uploadedUrls: string[] = [];

    for (const uri of images) {
      try {
        const base64 = await readAsStringAsync(uri, {
          encoding: "base64",
        });

        const fileExt = uri.split(".").pop()?.split("?")[0];
        const ext = fileExt ?? "jpg";
        const fileName = `${user.id}/${uniqueId()}.${ext}`;
        const contentType = getContentType(ext);
        const bytes = base64ToUint8Array(base64);

        const { error } = await supabase.storage
          .from("book-images")
          .upload(fileName, bytes, { contentType });

        if (error) {
          console.error("Upload error:", error.message);
          continue;
        }

        const { data } = supabase.storage
          .from("book-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
      } catch (e) {
        console.error("Upload read error:", e);
        throw e;
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Login required", "Please login to sell a book.");
      router.push("/(auth)/login");
      return;
    }

    const cleanTitle = title.trim();
    const cleanPrice = price.trim();

    if (!cleanTitle) {
      Alert.alert("Missing title", "Please enter the book title.");
      return;
    }

    if (!cleanPrice) {
      Alert.alert("Missing price", "Please enter a price.");
      return;
    }

    if (Number(cleanPrice) <= 0) {
      Alert.alert("Invalid price", "Price must be greater than 0.");
      return;
    }

    if (images.length < MIN_IMAGES) {
      Alert.alert("Add photos", `Please upload at least ${MIN_IMAGES} photo.`);
      return;
    }

    if (listingType === "rent") {
      const days = Number(rentalDays);
      if (!rentalDays.trim() || !Number.isInteger(days) || days < 1) {
        Alert.alert("Rental period", "Enter rental period in days (e.g. 10).");
        return;
      }
      if (!usageRules.trim()) {
        Alert.alert("Usage rules", "Describe how the book must be handled.");
        return;
      }
      const dmg = Number(damagePenalty);
      const late = Number(latePenaltyPerDay);
      const dep = Number(securityDeposit);
      if (Number.isNaN(dmg) || dmg < 0) {
        Alert.alert("Damage penalty", "Enter a valid amount (0 or more).");
        return;
      }
      if (Number.isNaN(late) || late < 0) {
        Alert.alert("Late return penalty", "Enter per-day fine amount (0 or more).");
        return;
      }
      if (Number.isNaN(dep) || dep < 0) {
        Alert.alert("Security deposit", "Enter refundable deposit amount.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const uploadedUrls = await uploadImages();

      if (uploadedUrls.length === 0) {
        Alert.alert("Upload failed", "Images could not be uploaded.");
        setSubmitting(false);
        return;
      }

      const bookId = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newBook: Book = {
        id: bookId,
        title: cleanTitle,
        price: cleanPrice,
        condition,
        flags,
        notes: notes.trim() || undefined,
        images: uploadedUrls,
        seller: {
          id: user.id,
          name: user.name ?? "Unknown",
          location: user.location ?? "India",
          rating: 0,
          totalSales: 0,
        },
        reviews: [],
        listing_type: listingType,
        ...(listingType === "rent"
          ? {
              rental_days: Number(rentalDays),
              usage_rules: usageRules.trim(),
              damage_penalty: Number(damagePenalty),
              major_damage_penalty: majorDamagePenalty.trim() ? Number(majorDamagePenalty) : undefined,
              late_penalty_per_day: Number(latePenaltyPerDay),
              security_deposit: Number(securityDeposit),
              extension_days: extensionDays.trim() ? Number(extensionDays) : undefined,
              extension_fee: extensionFee.trim() ? Number(extensionFee) : undefined,
            }
          : {}),
      };

      const res = await addBook(newBook);
      setSubmitting(false);

      if (!res.ok) {
        Alert.alert("Error", res.error ?? "Could not add book.");
        return;
      }
      router.replace("/(tabs)");
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert("Error", message);
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={[styles.container, styles.containerKeyboard]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <Text style={styles.heading}>List Your Book</Text>

        <View style={styles.listingTypeRow}>
          <Pressable
            style={[styles.listingTypeBtn, listingType === "sell" && styles.listingTypeBtnActive]}
            onPress={() => setListingType("sell")}
          >
            <Text style={[styles.listingTypeText, listingType === "sell" && styles.listingTypeTextActive]}>Sell</Text>
          </Pressable>
          <Pressable
            style={[styles.listingTypeBtn, listingType === "rent" && styles.listingTypeBtnActive]}
            onPress={() => setListingType("rent")}
          >
            <Text style={[styles.listingTypeText, listingType === "rent" && styles.listingTypeTextActive]}>Rent</Text>
          </Pressable>
        </View>

        <TextInput
          placeholder="Book Title *"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />

        <TextInput
          placeholder={listingType === "sell" ? "Price (numbers only) *" : "Rental fee (numbers only) *"}
          value={price}
          onChangeText={(txt) => setPrice(txt.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          style={styles.input}
        />

        {listingType === "rent" && (
          <>
            <Text style={styles.label}>Rental period (days) *</Text>
            <TextInput
              placeholder="e.g. 10"
              value={rentalDays}
              onChangeText={(t) => setRentalDays(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.label}>Usage rules *</Text>
            <Text style={styles.hint}>How the book must be handled (no writing, no food, etc.)</Text>
            <TextInput
              placeholder="e.g. No highlighting, return in same condition"
              value={usageRules}
              onChangeText={setUsageRules}
              style={styles.notesInput}
              multiline
              numberOfLines={2}
              maxLength={500}
            />
            <Text style={styles.label}>Minor damage penalty (₹) *</Text>
            <Text style={styles.hint}>Charged for minor damage (e.g. highlights, wear)</Text>
            <TextInput
              placeholder="e.g. 50"
              value={damagePenalty}
              onChangeText={(t) => setDamagePenalty(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.label}>Major damage penalty (₹) optional</Text>
            <Text style={styles.hint}>Significant damage; total loss = full book value (rental price)</Text>
            <TextInput
              placeholder="e.g. 200 or leave blank"
              value={majorDamagePenalty}
              onChangeText={(t) => setMajorDamagePenalty(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.label}>Late return penalty (₹ per day) *</Text>
            <TextInput
              placeholder="Per-day fine after due date"
              value={latePenaltyPerDay}
              onChangeText={(t) => setLatePenaltyPerDay(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.label}>Security deposit (₹) *</Text>
            <Text style={styles.hint}>
              Refundable; suggested 20–30% of rental price. Deducted for damage or late fees if applicable.
            </Text>
            {price.trim() && /^\d+$/.test(price) && (
              <Pressable
                style={styles.suggestedBtn}
                onPress={() => setSecurityDeposit(String(Math.round(Number(price) * 0.25)))}
              >
                <Text style={styles.suggestedBtnText}>Use suggested (25%): Rs {Math.round(Number(price) * 0.25)}</Text>
              </Pressable>
            )}
            <TextInput
              placeholder="Refundable deposit amount"
              value={securityDeposit}
              onChangeText={(t) => setSecurityDeposit(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.label}>Extension (optional)</Text>
            <Text style={styles.hint}>Buyer can extend once: add days and fee (e.g. +5 days, Rs 30)</Text>
            <View style={styles.extensionRow}>
              <TextInput
                placeholder="+ days"
                value={extensionDays}
                onChangeText={(t) => setExtensionDays(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={[styles.input, styles.extensionInput]}
              />
              <TextInput
                placeholder="Fee (Rs)"
                value={extensionFee}
                onChangeText={(t) => setExtensionFee(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                style={[styles.input, styles.extensionInput]}
              />
            </View>
          </>
        )}

        <Text style={styles.label}>Condition</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={condition}
            onValueChange={(v) => setCondition((v as BookCondition) || "Good")}
            style={styles.picker}
            dropdownIconColor="#0F3D3E"
            mode="dropdown"
            itemStyle={Platform.OS === "ios" ? styles.pickerItemStyle : undefined}
          >
            {BOOK_CONDITIONS.map((c) => (
              <Picker.Item key={c} label={c} value={c} color="#0F3D3E" />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Condition notes (optional)</Text>
        <Text style={styles.hint}>Tap any that apply to your copy</Text>
        <View style={styles.flagsRow}>
          {BOOK_FLAGS.map((flag) => {
            const selected = flags.includes(flag);
            return (
              <Pressable
                key={flag}
                onPress={() =>
                  setFlags((prev) =>
                    selected ? prev.filter((f) => f !== flag) : [...prev, flag]
                  )
                }
                style={[
                  styles.flagChip,
                  selected && styles.flagChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.flagChipText,
                    selected && styles.flagChipTextSelected,
                  ]}
                >
                  {flag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Extra notes for readers (optional)</Text>
        <Text style={styles.hint}>
          Condition details, edition info, or anything else buyers should know
        </Text>
        <TextInput
          placeholder="e.g. Slight crease on spine, signed on first page"
          value={notes}
          onChangeText={setNotes}
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        <View style={styles.conditionSpacer} />

        <Pressable style={styles.imageButton} onPress={pickImages}>
          <Text style={styles.imageButtonText}>
            Upload Images ({imageCountText})
          </Text>
        </Pressable>

        <View style={styles.imageContainer}>
          {images.map((uri) => (
            <Pressable
              key={uri}
              onLongPress={() => removeImage(uri)}
              style={styles.previewWrap}
            >
              <Image source={{ uri }} style={styles.previewImage} />
              <View style={styles.removePill}>
                <Text style={styles.removeText}>Hold to remove</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? "Submitting..." : "Submit"}
          </Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  container: { padding: 20, backgroundColor: "#F5F1E8" },
  containerKeyboard: { paddingBottom: 280 },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
    color: "#0F3D3E",
  },
  listingTypeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  listingTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
  },
  listingTypeBtnActive: {
    borderColor: "#0F3D3E",
    backgroundColor: "#E8F0EF",
  },
  listingTypeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  listingTypeTextActive: {
    color: "#0F3D3E",
  },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F3D3E",
    marginBottom: 6,
  },
  pickerWrap: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 4,
    overflow: "hidden",
    minHeight: 56,
  },
  picker: {
    height: 56,
    color: "#0F3D3E",
    fontSize: 16,
    fontWeight: "700",
  },
  pickerItemStyle: {
    fontSize: 17,
    color: "#0F3D3E",
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  suggestedBtn: {
    backgroundColor: "#E8F0EF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  suggestedBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F3D3E",
  },
  extensionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  extensionInput: { flex: 1, marginBottom: 0 },
  notesInput: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    minHeight: 88,
    textAlignVertical: "top",
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  flagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  flagChipSelected: {
    backgroundColor: "#0F3D3E",
    borderColor: "#0F3D3E",
  },
  flagChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  flagChipTextSelected: {
    color: "white",
  },
  conditionSpacer: {
    height: 20,
  },
  imageButton: {
    backgroundColor: "#0F3D3E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  imageButtonText: { color: "white", fontWeight: "900" },
  imageContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  previewWrap: { marginRight: 10, marginBottom: 10, position: "relative" },
  previewImage: { width: 100, height: 100, borderRadius: 10 },
  removePill: {
    position: "absolute",
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 4,
    borderRadius: 8,
  },
  removeText: {
    color: "white",
    fontSize: 10,
    textAlign: "center",
    fontWeight: "800",
  },
  submitBtn: {
    backgroundColor: "#2E5E4E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: "white", fontWeight: "900", fontSize: 16 },
});
