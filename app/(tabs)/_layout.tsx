import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { useAppFlow } from "@/src/context/AppFlowContext";
import { useAuth } from "@/src/context/AuthContext";

export default function TabLayout() {
  const { onboardingComplete, onboardingLoading } = useAppFlow();
  const { user, initializing } = useAuth();

  if (onboardingLoading || initializing) return null;

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F3D3E",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
