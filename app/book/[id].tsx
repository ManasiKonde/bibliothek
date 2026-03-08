import { useAuth } from "@/src/context/AuthContext";
import { useBooks } from "@/src/context/BookContext";
import type { Review } from "@/src/types/models";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ImageViewer from "react-native-image-zoom-viewer";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - 40;

export default function BookDetails() {
  const { user } = useAuth();
  const {
    books,
    toggleWishlist,
    isWishlisted,
    deleteBook,
    markAsSold,
    getReviews,
    addReview,
  } = useBooks();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const book = books.find((b) => b.id === id);
  const isSeller = user && book && book.seller?.id === user.id;
  const sold = Boolean(book?.sold);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    const list = await getReviews(id);
    setReviews(list);
    setReviewsLoading(false);
  }, [id, getReviews]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (!book) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Book not found.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const imageUris = book.images?.length ? book.images : [];
  const hasFlags =
    Array.isArray(book.flags) && book.flags.length > 0;
  const saved = isWishlisted(book.id);
  const alreadyReviewed =
    Boolean(user?.id) && reviews.some((r) => r.userId === user?.id);

  function formatReviewDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const handleSubmitReview = async () => {
    if (!user) return;
    const comment = reviewComment.trim();
    if (reviewRating < 1 || reviewRating > 5) {
      Alert.alert("Invalid rating", "Please choose 1–5 stars.");
      return;
    }
    setReviewSubmitting(true);
    const ok = await addReview(
      book.id,
      { rating: reviewRating, comment },
      { id: user.id, name: user.name }
    );
    setReviewSubmitting(false);
    if (ok) {
      setReviewComment("");
      setReviewRating(3);
      loadReviews();
    } else {
      Alert.alert("Error", "Could not submit review.");
    }
  };

  const openZoom = (index: number) => {
    setZoomIndex(index);
    setZoomVisible(true);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete listing?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const res = await deleteBook(book.id);
            if (res.ok) {
              router.replace("/(tabs)");
            } else {
              Alert.alert("Could not delete", res.error ?? "Try again later.");
            }
          },
        },
      ]
    );
  };

  const handleMarkAsSold = () => {
    Alert.alert(
      "Mark as sold?",
      "This will show a Sold chip and hide the Buy button.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as sold",
          onPress: async () => {
            const ok = await markAsSold(book.id);
            if (!ok) Alert.alert("Error", "Could not update.");
          },
        },
      ]
    );
  };

  const imageUrls = imageUris
    .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
    .map((url) => ({ url }));

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
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#0F3D3E" />
          </Pressable>
          <Pressable
            onPress={() => toggleWishlist(book.id)}
            style={styles.iconBtn}
            accessibilityLabel={
              saved ? "Remove from wishlist" : "Add to wishlist"
            }
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={26}
              color={saved ? "#b91c1c" : "#0F3D3E"}
            />
          </Pressable>
        </View>

        {imageUris.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={IMAGE_SIZE + 12}
            snapToAlignment="start"
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const i = Math.round(
                e.nativeEvent.contentOffset.x / (IMAGE_SIZE + 12)
              );
              setImageIndex(Math.min(i, imageUris.length - 1));
            }}
            style={styles.galleryScroll}
            contentContainerStyle={styles.galleryContent}
          >
            {imageUris.map((uri, i) => (
              <Pressable
                key={`${uri}-${i}`}
                onPress={() => openZoom(i)}
                style={[
                  styles.galleryImage,
                  {
                    width: IMAGE_SIZE,
                    marginRight: i < imageUris.length - 1 ? 12 : 0,
                  },
                ]}
              >
                <Image
                  source={{ uri: typeof uri === "string" ? uri : "" }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View
            style={[
              styles.galleryImage,
              styles.noImage,
              { width: IMAGE_SIZE },
            ]}
          >
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}

        {imageUris.length > 1 ? (
          <View style={styles.dots}>
            {imageUris.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === imageIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        <Text style={styles.title}>{String(book.title)}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹ {String(book.price)}</Text>
          <View style={styles.conditionChip}>
            <Text style={styles.conditionChipText}>
              {String(book.condition ?? "Condition")}
            </Text>
          </View>
          {sold ? (
            <View style={styles.soldChip}>
              <Text style={styles.soldChipText}>Sold</Text>
            </View>
          ) : null}
        </View>

        {book.seller ? (
          <View style={styles.sellerCard}>
            <Text style={styles.sellerLabel}>Sold by</Text>
            <Text style={styles.sellerName}>
              {String(book.seller.name)}
            </Text>
            <Text style={styles.sellerLocation}>
              {String(book.seller.location)}
            </Text>
          </View>
        ) : null}

        {hasFlags ? (
          <View style={styles.flagsSection}>
            <Text style={styles.flagsLabel}>Condition notes</Text>
            <View style={styles.flagsRow}>
              {book.flags!.map((flag) => (
                <View key={flag} style={styles.flagChip}>
                  <Text style={styles.flagChipText}>{String(flag)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {book.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Note from seller</Text>
            <Text style={styles.notesText}>{String(book.notes)}</Text>
          </View>
        ) : null}

        {book.listing_type === "rent" ? (
          <View style={styles.rentalBlock}>
            <Text style={styles.rentalBlockTitle}>Rental terms</Text>
            <Text style={styles.rentalRow}>Rental period: {book.rental_days} days</Text>
            {book.usage_rules ? (
              <Text style={styles.rentalRow}>Usage rules: {book.usage_rules}</Text>
            ) : null}
            <Text style={styles.rentalRow}>Damage penalty: Rs {book.damage_penalty ?? 0}</Text>
            <Text style={styles.rentalRow}>Late return: Rs {book.late_penalty_per_day ?? 0} per day</Text>
            <Text style={styles.rentalRow}>Security deposit: Rs {book.security_deposit ?? 0} (refundable)</Text>
          </View>
        ) : null}

        {isSeller ? (
          <View style={styles.sellerActions}>
            {!sold ? (
              <Pressable
                style={styles.markSoldBtn}
                onPress={handleMarkAsSold}
              >
                <Text style={styles.markSoldText}>Mark as sold</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.deleteBtn}
              onPress={handleDelete}
            >
              <Text style={styles.deleteBtnText}>Delete listing</Text>
            </Pressable>
          </View>
        ) : null}

        {!sold && !isSeller ? (
          book.listing_type === "rent" ? (
            <Pressable
              style={styles.buyBtn}
              onPress={() => router.push({ pathname: "/rent-checkout/[id]", params: { id: book.id } })}
            >
              <Text style={styles.buyText}>Rent this book</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.buyBtn}
              onPress={() => router.push(`/checkout/${book.id}`)}
            >
              <Text style={styles.buyText}>Buy Now</Text>
            </Pressable>
          )
        ) : null}

        {!isSeller ? (
          <Pressable
            style={styles.messageBtn}
            onPress={() =>
                router.push({
                  pathname: "/messages/[bookId]",
                  params: {
                    bookId: book.id,
                    otherUserId: book.seller?.id,
                    bookTitle: book.title,
                  },
                })
              }
          >
            <Text style={styles.messageBtnText}>Message seller</Text>
          </Pressable>
        ) : null}

        <Text style={styles.reviewsHeading}>Reviews</Text>
        {reviewsLoading ? (
          <Text style={styles.mutedText}>Loading reviews...</Text>
        ) : reviews.length === 0 ? (
          <Text style={styles.mutedText}>No reviews yet.</Text>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewUser}>{String(r.user)}</Text>
                  <Text style={styles.reviewDate}>{formatReviewDate(r.createdAt)}</Text>
                </View>
                <View style={[styles.starsRow, { marginTop: 4 }]}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= r.rating ? "star" : "star-outline"}
                      size={14}
                      color="#EAB308"
                    />
                  ))}
                </View>
                {r.comment ? (
                  <Text style={styles.reviewComment}>{String(r.comment)}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {user ? (
          alreadyReviewed ? (
            <View style={styles.writeReviewCard}>
              <Text style={styles.alreadyReviewedText}>You already reviewed this book.</Text>
            </View>
          ) : (
            <View style={styles.writeReviewCard}>
              <Text style={styles.writeReviewTitle}>Write a review</Text>
              <Text style={styles.reviewLabel}>Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={styles.starBtn}
                  >
                    <Ionicons
                      name={star <= reviewRating ? "star" : "star-outline"}
                      size={28}
                      color="#EAB308"
                    />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.reviewLabel}>Comment (optional)</Text>
              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Your experience with this listing..."
                placeholderTextColor="#888"
                style={styles.reviewInput}
                multiline
                numberOfLines={3}
              />
              <Pressable
                style={[styles.reviewSubmitBtn, reviewSubmitting && styles.btnDisabled]}
                onPress={handleSubmitReview}
                disabled={reviewSubmitting}
              >
                <Text style={styles.reviewSubmitText}>
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </Text>
              </Pressable>
            </View>
          )
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={zoomVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomVisible(false)}
      >
        <ImageViewer
          imageUrls={imageUrls}
          index={zoomIndex}
          onCancel={() => setZoomVisible(false)}
          enableImageZoom
          enableSwipeDown
          onSwipeDown={() => setZoomVisible(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F1E8" },
  container: { paddingHorizontal: 20, paddingBottom: 20 },
  containerKeyboard: { paddingBottom: 280 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBtn: { padding: 8 },

  galleryScroll: { marginHorizontal: -20 },
  galleryContent: { paddingHorizontal: 20, gap: 12 },
  galleryImage: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
  },
  noImage: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: { color: "#666", fontWeight: "700" },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
  },
  dotActive: { backgroundColor: "#0F3D3E", width: 18 },

  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F3D3E",
    marginTop: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
    flexWrap: "wrap",
  },
  price: { fontSize: 20, fontWeight: "900", color: "#0F3D3E" },
  conditionChip: {
    backgroundColor: "#2E5E4E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  conditionChipText: { color: "white", fontSize: 12, fontWeight: "800" },
  soldChip: {
    backgroundColor: "#b91c1c",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  soldChipText: { color: "white", fontSize: 12, fontWeight: "800" },

  sellerCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    elevation: 2,
  },
  sellerLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
  sellerName: { fontSize: 16, fontWeight: "800", color: "#0F3D3E" },
  sellerLocation: { fontSize: 14, color: "#555", marginTop: 2 },

  flagsSection: { marginTop: 16 },
  flagsLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F3D3E",
    marginBottom: 8,
  },
  flagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagChip: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  flagChipText: { fontSize: 12, fontWeight: "700", color: "#92400E" },

  notesSection: {
    marginTop: 16,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#2E5E4E",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666",
    marginBottom: 6,
  },
  notesText: { fontSize: 14, color: "#333", lineHeight: 20 },

  rentalBlock: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#E8F0EF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0F3D3E",
  },
  rentalBlockTitle: { fontSize: 16, fontWeight: "800", color: "#0F3D3E", marginBottom: 8 },
  rentalRow: { fontSize: 14, color: "#333", marginBottom: 4 },
  sellerActions: { marginTop: 16, gap: 10 },
  markSoldBtn: {
    backgroundColor: "#2E5E4E",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  markSoldText: { color: "white", fontWeight: "800" },
  deleteBtn: {
    backgroundColor: "#b91c1c",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnText: { color: "white", fontWeight: "800" },

  buyBtn: {
    marginTop: 24,
    backgroundColor: "#0F3D3E",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buyText: { color: "white", fontWeight: "900", fontSize: 17 },

  reviewsHeading: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F3D3E",
    marginTop: 28,
    marginBottom: 10,
  },
  mutedText: { fontSize: 14, color: "#666", marginBottom: 12 },
  reviewsList: { gap: 10, marginBottom: 16 },
  reviewCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewUser: { fontSize: 14, fontWeight: "800", color: "#0F3D3E" },
  reviewDate: { fontSize: 12, color: "#666" },
  starsRow: { flexDirection: "row", gap: 2 },
  reviewComment: { fontSize: 14, color: "#444", lineHeight: 20 },
  alreadyReviewedText: { fontSize: 14, color: "#2E5E4E", fontWeight: "700" },
  messageBtn: {
    marginTop: 10,
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  messageBtnText: { color: "#0F3D3E", fontWeight: "800" },

  writeReviewCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    elevation: 2,
  },
  writeReviewTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F3D3E",
    marginBottom: 12,
  },
  reviewLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 6 },
  starBtn: { padding: 4 },
  reviewInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  reviewSubmitBtn: {
    backgroundColor: "#2E5E4E",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  reviewSubmitText: { color: "white", fontWeight: "800" },
  btnDisabled: { opacity: 0.6 },

  notFound: { flex: 1, padding: 20, justifyContent: "center" },
  notFoundText: { fontSize: 16, color: "#444", marginBottom: 12 },
  backBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0F3D3E",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  backBtnText: { color: "white", fontWeight: "800" },
});
