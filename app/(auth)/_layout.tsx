import { useAuth } from "@/src/context/AuthContext";
import { Redirect, Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  const { user, initializing } = useAuth();

  // Wait for auth to load
  if (initializing) return null;

  // If already logged in, bounce to tabs
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
