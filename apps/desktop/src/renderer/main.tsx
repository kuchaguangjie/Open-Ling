import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import "@fontsource/noto-serif-sc/700.css";
import "./styles/global.css";
import "./styles/theme.css";
import "./styles/cursor.css";
import { syncHostedCounselorPackages } from "./counselors/hostedCounselorPackages";
void bootstrapRenderer();

async function bootstrapRenderer() {
  try {
    await syncHostedCounselorPackages();
  } catch {
    // A damaged extension must never prevent Ling's built-in counselors from loading.
  }
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
