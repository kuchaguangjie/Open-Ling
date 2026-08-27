import { useEffect, useState } from "react";
import lakeBackgroundUrl from "../../../../../../assets/runtime/launch/loading/final/loading-lake-background-no-ui-v1.png";
import lingWordmarkUrl from "../../../../../../assets/runtime/launch/loading/final/ling-wordmark-green-transparent-v1.png";
import boatLogoUrl from "../../../../../../assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-4x-v1.png";
import {
  getStartupLoadingContent,
  type StartupLoadingPhase
} from "./startupLoadingContent";
import "./startup-loading.css";
import { useLingua } from "../../localization/useLingua";

const ATMOSPHERE_INTERVAL_MS = 3_200;
const FEATURE_HINT_DELAY_MS = 900;

export interface StartupLoadingScreenProps {
  phase: StartupLoadingPhase;
  exiting?: boolean;
}

export function StartupLoadingScreen({ phase, exiting = false }: StartupLoadingScreenProps) {
  const { locale, t } = useLingua();
  const content = getStartupLoadingContent(locale);
  const [contentIndex, setContentIndex] = useState(0);
  const [featureHintVisible, setFeatureHintVisible] = useState(false);
  const [featureHint] = useState(
    () => content.featureHints[Math.floor(Math.random() * content.featureHints.length)]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setContentIndex((current) => current + 1);
    }, ATMOSPHERE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const delay = window.setTimeout(() => {
      setFeatureHintVisible(true);
    }, FEATURE_HINT_DELAY_MS);

    return () => window.clearTimeout(delay);
  }, []);

  const atmosphereIndex = contentIndex % content.atmosphereLines.length;

  return (
    <section
      aria-busy={phase !== "ready"}
      aria-label={t("startup.aria")}
      className={`startup-loading${exiting ? " startup-loading--exiting" : ""}`}
    >
      <img aria-hidden="true" className="startup-loading__background" decoding="async" src={lakeBackgroundUrl} />
      <div aria-hidden="true" className="startup-loading__wash" />

      <div className="startup-loading__center">
        <div className="startup-loading__mark">
          <img className="startup-loading__boat" decoding="async" src={boatLogoUrl} alt={t("startup.logoAlt")} />
          <img aria-hidden="true" className="startup-loading__reflection" decoding="async" src={boatLogoUrl} />
        </div>

        <p aria-live="polite" aria-atomic="true" className="startup-loading__status" role="status">
          <span className="startup-loading__status-copy" key={phase}>{content.phaseLabels[phase]}</span>
        </p>
        <p
          aria-hidden="true"
          className="startup-loading__atmosphere"
          key={`atmosphere-${atmosphereIndex}`}
        >
          {content.atmosphereLines[atmosphereIndex]}
        </p>
      </div>

      <div
        aria-hidden="true"
        className={`startup-loading__hint${featureHintVisible ? " startup-loading__hint--visible" : ""}`}
      >
        <div className="startup-loading__hint-content">
          <img className="startup-loading__hint-wordmark" decoding="async" src={lingWordmarkUrl} />
          <p>{featureHint}</p>
        </div>
      </div>
    </section>
  );
}

export type { StartupLoadingPhase } from "./startupLoadingContent";
