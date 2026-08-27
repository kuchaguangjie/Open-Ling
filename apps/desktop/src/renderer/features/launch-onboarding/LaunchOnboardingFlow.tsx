import { useState } from "react";
import { LaunchWelcomeScreen, LaunchWelcomeShell } from "../launch-welcome";
import { useLingua } from "../../localization/useLingua";
import { LaunchModelConnectionScreen } from "./LaunchModelConnectionScreen";
import { LaunchSecurityScreen } from "./LaunchSecurityScreen";
import "./launch-onboarding.css";

export type LaunchOnboardingStep = "welcome" | "security" | "model";

interface LaunchOnboardingFlowProps {
  initialStep?: LaunchOnboardingStep;
  onComplete: () => void;
  onSecuritySetupComplete?: () => void;
}

export function LaunchOnboardingFlow({
  initialStep = "welcome",
  onComplete,
  onSecuritySetupComplete
}: LaunchOnboardingFlowProps) {
  const { t } = useLingua();
  const [step, setStep] = useState<LaunchOnboardingStep>(initialStep);
  const steps: LaunchOnboardingStep[] = ["welcome", "model", "security"];
  const currentPage = Math.max(steps.indexOf(step), 0) + 1;
  const progress = `${String(currentPage).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
  const labelledBy = {
    welcome: "launch-welcome-title",
    model: "launch-model-title",
    security: "launch-security-title"
  }[step];
  const progressLabel = {
    welcome: t("launch.welcome.progressLabel"),
    model: t("launch.model.progressLabel"),
    security: t("launch.security.progressLabel")
  }[step];

  return (
    <div className="launch-onboarding-flow">
      <LaunchWelcomeShell
        footer={(
          <span
            aria-label={progressLabel}
            className="launch-welcome-progress"
          >
            {progress}
          </span>
        )}
        labelledBy={labelledBy}
      >
        <div className="launch-onboarding-step" key={step}>
          {step === "welcome" && (
            <LaunchWelcomeScreen
              onContinue={() => setStep("model")}
              presentation="embedded"
            />
          )}
          {step === "model" && (
            <LaunchModelConnectionScreen
              onBack={() => setStep("welcome")}
              onComplete={() => setStep("security")}
              presentation="embedded"
            />
          )}
          {step === "security" && (
            <LaunchSecurityScreen
              onBack={() => setStep("model")}
              onComplete={() => {
                onSecuritySetupComplete?.();
                onComplete();
              }}
              onSkip={onComplete}
              presentation="embedded"
            />
          )}
        </div>
      </LaunchWelcomeShell>
    </div>
  );
}
