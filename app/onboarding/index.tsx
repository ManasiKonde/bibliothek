import { useAppFlow } from "@/src/context/AppFlowContext";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    key: "1",
    image: require("@/assets/images/onboarding1.png"),
    title: "Discover Your Next\nFavourite Book",
    subtitle:
      "Browse thousands of books listed by readers near you. Find hidden gems at great prices.",
    accent: "#0F3D3E",
  },
  {
    key: "2",
    image: require("@/assets/images/onboarding2.png"),
    title: "Buy, Sell &\nRent with Ease",
    subtitle:
      "List your books in minutes, buy securely, or rent to keep your shelf fresh without breaking the bank.",
    accent: "#2E5E4E",
  },
  {
    key: "3",
    image: require("@/assets/images/onboarding3.png"),
    title: "Join a Community\nof Book Lovers",
    subtitle:
      "Connect with fellow readers, chat with sellers, and be part of a growing literary community.",
    accent: "#0F3D3E",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { onboardingComplete, onboardingLoading, completeOnboarding } =
    useAppFlow();
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Animate in on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // If onboarding already done, redirect immediately
  useEffect(() => {
    if (onboardingLoading || !onboardingComplete) return;
    router.replace(user ? "/(tabs)" : "/(auth)/login");
  }, [onboardingComplete, onboardingLoading, router, user]);

  if (onboardingLoading || onboardingComplete) return null;

  const isLast = activeIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    }
  };

  const finish = async (path: "/(auth)/login" | "/(auth)/signup") => {
    if (submitting) return;
    setSubmitting(true);
    await completeOnboarding();
    router.replace(path);
  };

  const skip = async () => {
    if (submitting) return;
    setSubmitting(true);
    await completeOnboarding();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Skip button */}
      <Animated.View
        style={[styles.skipRow, { opacity: fadeAnim }]}
      >
        {!isLast ? (
          <Pressable onPress={skip} style={styles.skipBtn} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </Animated.View>

      {/* Slides */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.imageWrapper}>
                <Image
                  source={item.image}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.title, { color: item.accent }]}>
                {item.title}
              </Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />
      </Animated.View>

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Bottom actions */}
      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        {!isLast ? (
          <Pressable
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleNext}
            disabled={submitting}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              onPress={() => finish("/(auth)/signup")}
              disabled={submitting}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? "Loading…" : "Get Started"}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, submitting && styles.btnDisabled]}
              onPress={() => finish("/(auth)/login")}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>
                Already have an account?{" "}
                <Text style={styles.secondaryBtnAccent}>Sign in</Text>
              </Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F1E8",
  },
  skipRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 50,
    alignItems: "flex-end",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B8B8C",
  },

  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  imageWrapper: {
    width: width * 0.78,
    height: width * 0.78,
    borderRadius: 32,
    backgroundColor: "#E8EDE8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    overflow: "hidden",
    shadowColor: "#0F3D3E",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  image: {
    width: "90%",
    height: "90%",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#556B6B",
    textAlign: "center",
    fontWeight: "400",
    paddingHorizontal: 8,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#0F3D3E",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#C2D0D0",
  },

  actions: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#0F3D3E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0F3D3E",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    color: "#6B8B8C",
    fontWeight: "500",
  },
  secondaryBtnAccent: {
    color: "#0F3D3E",
    fontWeight: "800",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
