// Build-time Expo config.
// Allows injecting native keys (e.g., Google Maps API key) via environment variables.

const appJson = require('./app.json');

module.exports = () => {
  const config = appJson.expo ?? appJson;

  const googleMapsApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.EXPO_GOOGLE_MAPS_API_KEY;

  if (googleMapsApiKey) {
    config.android = config.android ?? {};
    config.android.config = config.android.config ?? {};
    config.android.config.googleMaps = config.android.config.googleMaps ?? {};
    config.android.config.googleMaps.apiKey = googleMapsApiKey;

    // Optional iOS support if you ever use Google Maps provider on iOS.
    config.ios = config.ios ?? {};
    config.ios.config = config.ios.config ?? {};
    config.ios.config.googleMapsApiKey = googleMapsApiKey;
  }

  return config;
};
