import Constants, { ExecutionEnvironment } from "expo-constants";
import { supabase } from "./supabaseClient";

export async function registerForPushNotificationsAsync(
  userId: string
): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  const Device = await import("expo-device");
  if (!Device.isDevice) return;

  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData?.data;
  if (!token) return;

  const { error } = await supabase.from("push_tokens").upsert(
    { user_id: userId, token },
    { onConflict: "token" }
  );
  if (error) console.warn("Push token save failed:", error.message);
}
