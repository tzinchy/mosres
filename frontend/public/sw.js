// Minimal service worker: Chrome requires one with a fetch handler before it
// offers "Install app". No caching on purpose — the data is live, and a stale
// cache of an analytics UI is worse than no offline mode.
self.addEventListener("fetch", () => {})
