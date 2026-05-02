import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { http } from "./http";

const TOKEN_CACHE_KEY = "musafee.fcm.token";

// expo-notifications push features require a native/dev build — not Expo Go (SDK 53+)
const IS_EXPO_GO = typeof __DEV__ !== "undefined" &&
  (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Constants = require("expo-constants").default;
      return Constants.appOwnership === "expo";
    } catch {
      return false;
    }
  })();

// Show foreground notifications (works in dev builds; no-op in Expo Go)
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function getCachedToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_CACHE_KEY);
}

async function putToken(token: string): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  await http.put("/device-tokens", { token, platform });
  await SecureStore.setItemAsync(TOKEN_CACHE_KEY, token);
}

/** Request permission, get FCM/APNs token, PUT to backend if new or changed. */
export async function initializeNotifications(): Promise<void> {
  // Push tokens require a native dev/production build — skip in Expo Go
  if (IS_EXPO_GO || !Device.isDevice) return;

  // Android: create notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Musafee",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0D0D0D",
    });
  }

  // Request permission if not yet granted
  const { status: current } = await Notifications.getPermissionsAsync();
  let finalStatus = current;
  if (current !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  // Get raw FCM (Android) / APNs (iOS) token
  let token: string;
  try {
    const result = await Notifications.getDevicePushTokenAsync();
    token = result.data;
  } catch (err) {
    console.warn("[notifications] Could not get device push token:", err);
    return;
  }

  // Only PUT to backend if token changed from last known value
  const cached = await getCachedToken();
  if (token !== cached) {
    try {
      await putToken(token);
    } catch (err) {
      console.warn("[notifications] Failed to register token:", err);
    }
  }
}

/** Listen for Firebase token rotations and immediately re-register. */
export function setupTokenRefreshListener(): () => void {
  if (IS_EXPO_GO || !Device.isDevice) return () => {};

  try {
    const sub = Notifications.addPushTokenListener(async (tokenData) => {
      const newToken = tokenData.data;
      const cached = await getCachedToken();
      if (newToken !== cached) {
        try {
          await putToken(newToken);
        } catch (err) {
          console.warn("[notifications] Failed to refresh token:", err);
        }
      }
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/** Call on logout — removes token from backend and clears local cache. */
export async function clearNotificationToken(): Promise<void> {
  const token = await getCachedToken();
  if (!token) return;
  try {
    await http.delete(`/device-tokens/${encodeURIComponent(token)}`);
  } catch (err) {
    console.warn("[notifications] Failed to unregister token:", err);
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_CACHE_KEY);
  }
}
