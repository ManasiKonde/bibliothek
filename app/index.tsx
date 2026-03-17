import { useAppFlow } from "@/src/context/AppFlowContext";
import { useAuth } from "@/src/context/AuthContext";
import { Redirect } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function Index() {
  const { onboardingComplete, onboardingLoading } = useAppFlow();
  const { user, initializing } = useAuth();

  if (onboardingLoading || initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F5F1E8",
        }}
      >
        <Text style={{ color: "#0F3D3E", fontWeight: "900" }}>Loading…</Text>
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
