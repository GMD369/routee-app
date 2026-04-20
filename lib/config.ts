
const ENV_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

if (!ENV_BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Please configure your ngrok URL in .env",
  );
}

export const API_BASE_URL = ENV_BASE_URL;
