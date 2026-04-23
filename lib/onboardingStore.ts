import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "musafee.onboarding.completed";

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const completed = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return completed === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
  } catch (error) {
    console.error("Failed to mark onboarding as completed:", error);
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  } catch (error) {
    console.error("Failed to reset onboarding:", error);
  }
}
