function hasElectronBridge() {
  return Boolean(window.lingDesktop?.settings);
}

export function isDevBrowserPreview() {
  return import.meta.env.DEV && !hasElectronBridge();
}

// The Capacitor shell has no Electron bridge either, but it runs a production
// build (import.meta.env.DEV is false), so the dev check alone would leave it
// stuck on the "model not configured" gate and unable to open a consultation.
// VITE_MOBILE_SHELL opens the same path explicitly at build time, leaving
// desktop behaviour untouched.
export function isShellPreview() {
  return !hasElectronBridge() && (import.meta.env.DEV || import.meta.env.VITE_MOBILE_SHELL === "1");
}
