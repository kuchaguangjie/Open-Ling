import type { CSSProperties, ReactNode } from "react";
import paperTextureUrl from "../../../../../../assets/runtime/lobby/resource-table/frame/resource-table-paper-blank-v20.png";
import brandLogoUrl from "../../../../../../assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-4x-v1.png";
import thresholdRoomUrl from "../../../../../../assets/runtime/launch/welcome/final/welcome-threshold-room-v1.png";
import { useLingua } from "../../localization/useLingua";
import { preloadImagesSequentially } from "../../media/imagePreload";
import "./launch-welcome.css";

const launchWelcomeCriticalAssets = [paperTextureUrl, brandLogoUrl, thresholdRoomUrl];

export async function preloadLaunchWelcomeAssets() {
  await preloadImagesSequentially(launchWelcomeCriticalAssets);
}

export interface LaunchWelcomeShellProps {
  children: ReactNode;
  footer?: ReactNode;
  labelledBy: string;
}

export function LaunchWelcomeShell({ children, footer, labelledBy }: LaunchWelcomeShellProps) {
  const { t } = useLingua();
  return (
    <main
      aria-labelledby={labelledBy}
      className="launch-welcome-shell"
      style={{ "--launch-welcome-paper": `url(${paperTextureUrl})` } as CSSProperties}
    >
      <figure aria-label={t("launch.sceneLabel")} className="launch-welcome-scene">
        <img alt="" src={thresholdRoomUrl} />
      </figure>

      <section className="launch-welcome-paper">
        <div aria-hidden="true" className="launch-welcome-paper-rule" />
        <div className="launch-welcome-content">
          <header className="launch-welcome-brand">
            <img alt="" src={brandLogoUrl} />
            <span aria-hidden="true" className="launch-welcome-brand-divider" />
            <span>{t("brand.studio")}</span>
          </header>

          <div className="launch-welcome-copy">{children}</div>
          <footer className="launch-welcome-footer">{footer}</footer>
        </div>
      </section>
    </main>
  );
}
