import type { CapacitorConfig } from "@capacitor/cli"

// The APK ships the built SPA; it talks to the API over the network, so the
// API base is baked in at build time (VITE_API_URL) — see `npm run apk`.
const config: CapacitorConfig = {
  appId: "ru.mosres.app",
  appName: "mosres",
  webDir: "dist",
  // cleartext + mixed content: the page is served from https://localhost inside
  // the WebView, while the API is plain http:// (LAN address or an adb-reversed
  // localhost port).
  server: { androidScheme: "https", cleartext: true },
  android: { allowMixedContent: true },
}

export default config
