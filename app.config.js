export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-maps",
      {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "",
      },
    ],
  ],
});
