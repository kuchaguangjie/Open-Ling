import "@fontsource/noto-serif-sc/400.css";
import ReactDOM from "react-dom/client";
import "../../styles/theme.css";
import { StartupLoadingScreen, type StartupLoadingPhase } from "./StartupLoadingScreen";

const query = new URLSearchParams(window.location.search);
const requestedPhase = query.get("phase");
const allowedPhases: StartupLoadingPhase[] = ["opening", "reading-sessions", "ready"];
const phase = allowedPhases.includes(requestedPhase as StartupLoadingPhase)
  ? (requestedPhase as StartupLoadingPhase)
  : "reading-sessions";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <StartupLoadingScreen phase={phase} exiting={query.get("exiting") === "true"} />
);
