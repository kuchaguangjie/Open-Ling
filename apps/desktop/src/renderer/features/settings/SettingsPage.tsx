import { useEffect, useRef, useState } from "react";
import qunxinLogo from "../../../../../../assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-v1.png";
import { useAppStore } from "../../stores/appStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { LobbyFeatureFrame } from "../../pages/lobby/features/LobbyFeatureFrame";
import {
  SettingsSystemPage,
  SystemSettingsNavigation,
  type SystemSettingsTab
} from "./system/SettingsSystemPage";
import { useLingua } from "../../localization/useLingua";

export function SettingsPage() {
  const { t } = useLingua();
  const closeSettings = useAppStore((state) => state.closeSettings);
  const dirtySections = useSettingsStore((state) => state.dirtySections);
  const discardUnsavedChanges = useSettingsStore((state) => state.discardUnsavedChanges);
  const [activeSettingsTab, setActiveSettingsTab] = useState<SystemSettingsTab>("model");
  const [pendingAction, setPendingAction] = useState<{ type: "tab"; tab: SystemSettingsTab } | { type: "close" } | null>(null);
  const hasUnsavedChanges = Object.values(dirtySections).some(Boolean);

  function requestTabChange(tab: SystemSettingsTab) {
    if (tab === activeSettingsTab) return;
    if (hasUnsavedChanges) {
      setPendingAction({ type: "tab", tab });
      return;
    }
    setActiveSettingsTab(tab);
  }

  function requestClose() {
    if (hasUnsavedChanges) {
      setPendingAction({ type: "close" });
      return;
    }
    closeSettings();
  }

  function discardAndContinue() {
    const action = pendingAction;
    discardUnsavedChanges();
    setPendingAction(null);
    if (action?.type === "tab") setActiveSettingsTab(action.tab);
    if (action?.type === "close") closeSettings();
  }

  return (
    <LobbyFeatureFrame
      archiveLabel={t("settings.archive")}
      className="lobby-overlay-settings"
      closeLabel={t("settings.close")}
      onClose={requestClose}
      title={t("settings.title")}
      unifiedStudioSurface
    >
      <section className="settings-window" aria-label={t("settings.aria")}>
        <aside className="settings-sidebar">
          <header className="settings-studio-brand">
            <img alt={t("settings.logoAlt")} className="settings-studio-logo" src={qunxinLogo} />
            <div>
              <strong>Ling</strong>
              <span>{t("settings.brandLine")}</span>
            </div>
          </header>

          <div className="settings-sidebar-navigation">
            <SystemSettingsNavigation activeTab={activeSettingsTab} onTabChange={requestTabChange} />
          </div>
        </aside>

        <main className="settings-main system-settings-main">
          <SettingsSystemPage activeTab={activeSettingsTab} onTabChange={requestTabChange} showNavigation={false} />
        </main>
        {pendingAction && <UnsavedChangesDialog onCancel={() => setPendingAction(null)} onDiscard={discardAndContinue} />}
      </section>
    </LobbyFeatureFrame>
  );
}

function UnsavedChangesDialog({ onCancel, onDiscard }: { onCancel: () => void; onDiscard: () => void }) {
  const { t } = useLingua();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [onCancel]);

  return (
    <div className="settings-confirm-backdrop" onMouseDown={onCancel}>
      <section aria-labelledby="unsaved-settings-title" aria-modal="true" className="settings-confirm-dialog" onMouseDown={(event) => event.stopPropagation()} role="alertdialog">
        <h2 id="unsaved-settings-title">{t("settings.unsavedTitle")}</h2>
        <p>{t("settings.unsavedBody")}</p>
        <div>
          <button className="system-secondary-button" onClick={onDiscard} type="button">{t("settings.discard")}</button>
          <button className="system-primary-button" onClick={onCancel} ref={cancelRef} type="button">{t("settings.return")}</button>
        </div>
      </section>
    </div>
  );
}
