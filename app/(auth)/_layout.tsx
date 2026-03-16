import { useAppFlow } from "@/src/context/AppFlowContext";
import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  const { onboardingComplete, onboardingLoading } = useAppFlow();
  const { user, initializing } = useAuth();

  if (onboardingLoading || initializing) return null;

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
