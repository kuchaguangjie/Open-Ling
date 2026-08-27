import { useEffect, useRef } from "react";
import type { LobbyFeatureId } from "../features/lobbyFeatureRegistry";
import {
  quickNavAppointmentUrl,
  quickNavLettersUrl,
  quickNavSettingsUrl
} from "../lobbyCriticalAssets";
import { useLingua } from "../../../localization/useLingua";

export function LobbyQuickNav({
  onOpenFeature,
  onOpenSettings,
  onPrepareFeature
}: {
  onOpenFeature: (featureId: LobbyFeatureId) => void;
  onOpenSettings: () => void;
  onPrepareFeature: (featureId: LobbyFeatureId) => void;
}) {
  const { t } = useLingua();
  return (
    <nav aria-label={t("quickNav.aria")} className="lobby-quick-nav">
      <span aria-hidden="true" className="lobby-quick-nav-frame" />
      <div className="lobby-quick-nav-items">
        <QuickNavItem iconUrl={quickNavLettersUrl} kind="letters" label={t("features.letters.title")} onClick={() => onOpenFeature("letters")} onIntent={() => onPrepareFeature("letters")} />
        <QuickNavItem iconUrl={quickNavAppointmentUrl} kind="appointment" label={t("features.booking.title")} onClick={() => onOpenFeature("booking")} onIntent={() => onPrepareFeature("booking")} primary />
        <QuickNavItem iconUrl={quickNavSettingsUrl} kind="settings" label={t("settings.title")} onClick={onOpenSettings} />
      </div>
    </nav>
  );
}

function QuickNavItem({
  iconUrl,
  kind,
  label,
  onClick,
  onIntent,
  primary = false
}: {
  iconUrl: string;
  kind: "appointment" | "letters" | "settings";
  label: string;
  onClick: () => void;
  onIntent?: () => void;
  primary?: boolean;
}) {
  const intentTimerRef = useRef<number | undefined>(undefined);
  const cancelDelayedIntent = () => {
    if (intentTimerRef.current !== undefined) window.clearTimeout(intentTimerRef.current);
    intentTimerRef.current = undefined;
  };
  const prepareAfterHover = () => {
    cancelDelayedIntent();
    intentTimerRef.current = window.setTimeout(() => {
      intentTimerRef.current = undefined;
      onIntent?.();
    }, 120);
  };
  const prepareNow = () => {
    cancelDelayedIntent();
    onIntent?.();
  };

  useEffect(() => cancelDelayedIntent, []);

  return (
    <button
      className={`lobby-quick-nav-item is-${kind}${primary ? " is-primary" : ""}`}
      onClick={onClick}
      onFocus={prepareNow}
      onPointerDown={prepareNow}
      onPointerEnter={prepareAfterHover}
      onPointerLeave={cancelDelayedIntent}
      type="button"
    >
      <img alt="" aria-hidden="true" className="lobby-quick-nav-icon" decoding="async" draggable="false" src={iconUrl} />
      <span className="lobby-quick-nav-label">{label}</span>
    </button>
  );
}
