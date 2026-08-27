import type { SupportedLocale } from "@shared/index";
import { useLingua } from "../../localization/useLingua";
import { useSettingsStore } from "../../stores/settingsStore";
import { LaunchWelcomeShell } from "./LaunchWelcomeShell";

export interface LaunchWelcomeScreenProps {
  onContinue: () => void;
  presentation?: "launch" | "embedded";
}

export function LaunchWelcomeScreen({ onContinue, presentation = "launch" }: LaunchWelcomeScreenProps) {
  const { locale, t } = useLingua();
  const displayName = useSettingsStore((state) => state.profile.displayName);
  const saveProfile = useSettingsStore((state) => state.saveProfile);
  const updateLocale = useSettingsStore((state) => state.updateLocale);
  const updateProfile = useSettingsStore((state) => state.updateProfile);

  async function continueAfterSaving() {
    updateLocale(locale);
    updateProfile({ displayName: displayName.trim() });
    await saveProfile();
    onContinue();
  }

  const content = (
    <>
      <div className="launch-welcome-message">
        <h1 id="launch-welcome-title">{t("launch.welcome.title")}</h1>
        <p>{t("launch.welcome.description")}</p>
        <div className="launch-welcome-name-field">
          <label htmlFor="launch-welcome-display-name">{t("launch.welcome.nameLabel")}</label>
          <input
            autoComplete="name"
            id="launch-welcome-display-name"
            maxLength={60}
            onChange={(event) => updateProfile({ displayName: event.target.value })}
            placeholder={t("launch.welcome.namePlaceholder")}
            type="text"
            value={displayName}
          />
          <small>{t("launch.welcome.nameHint")}</small>
        </div>
        <LanguageChoice />
      </div>

      <div aria-label={t("launch.welcome.actionsLabel")} className="launch-welcome-actions" role="group">
        <button className="launch-welcome-button is-primary" onClick={() => void continueAfterSaving()} type="button">
          {t("launch.welcome.continue")}
        </button>
      </div>
    </>
  );

  if (presentation === "embedded") return content;

  return (
    <LaunchWelcomeShell
      footer={<span className="launch-welcome-progress" aria-label={t("launch.welcome.progressLabel")}>01 / 03</span>}
      labelledBy="launch-welcome-title"
    >
      {content}
    </LaunchWelcomeShell>
  );
}

function LanguageChoice() {
  const { locale, t } = useLingua();
  const updateLocale = useSettingsStore((state) => state.updateLocale);

  return (
    <fieldset className="launch-language-choice">
      <legend>{t("language.label")}</legend>
      <div>
        {(["zh-CN", "en-US"] as const satisfies readonly SupportedLocale[]).map((option) => (
          <button
            aria-pressed={locale === option}
            className={locale === option ? "active" : ""}
            key={option}
            onClick={() => updateLocale(option)}
            type="button"
          >
            {t(`language.${option}`)}
          </button>
        ))}
      </div>
      <small>{t("language.systemHint")}</small>
    </fieldset>
  );
}
