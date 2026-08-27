export function isDevBrowserPreview() {
  return import.meta.env.DEV && !window.lingDesktop?.settings;
}
