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
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import { BookProvider } from "@/src/context/BookContext";
import { LogBox, Text, View } from "react-native";

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
  anchor: "(tabs)",
};

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F5F1E8",
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
      {user ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}

      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
