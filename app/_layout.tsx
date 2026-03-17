import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppFlowProvider } from "@/src/context/AppFlowContext";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { BookProvider } from "@/src/context/BookContext";
import { LogBox, Text, View } from "react-native";
import React from "react";

// Suppress keep-awake errors from Expo in dev (not supported on all platforms)
LogBox.ignoreLogs(["Unable to activate keep awake"]);
if (typeof globalThis !== "undefined") {
  const onUnhandled = (e: PromiseRejectionEvent) => {
    const msg = e?.reason?.message ?? e?.reason ?? "";
    if (String(msg).includes("keep awake")) {
      e.preventDefault?.();
      return;
    }
  };
  globalThis.addEventListener?.("unhandledrejection", onUnhandled);
}

export const unstable_settings = {
  anchor: "index",
};

function RootNavigator() {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#0F3D3E", fontWeight: "900" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <AppFlowProvider>
        <AuthProvider>
          <BookProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <RootNavigator />
              <StatusBar style="auto" />
            </ThemeProvider>
          </BookProvider>
        </AuthProvider>
      </AppFlowProvider>
    </SafeAreaProvider>
  );
}
