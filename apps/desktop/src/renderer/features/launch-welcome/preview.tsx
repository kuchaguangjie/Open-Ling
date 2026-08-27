import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/600.css";
import { LaunchWelcomeScreen } from "./LaunchWelcomeScreen";

document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LaunchWelcomeScreen onContinue={() => undefined} />
  </React.StrictMode>
);
