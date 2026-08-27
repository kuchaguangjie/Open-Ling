import { type ReactNode } from "react";
import "./lobby-feature-frame.css";

export function LobbyFeatureFrame({
  archiveLabel,
  children,
  className,
  closeLabel,
  onClose,
  title,
  unifiedStudioSurface = false
}: {
  archiveLabel: string;
  children: ReactNode;
  className: string;
  closeLabel: string;
  onClose?: () => void;
  title: string;
  unifiedStudioSurface?: boolean;
}) {
  return (
    <div
      aria-label={title}
      className={`lobby-overlay-backdrop ${unifiedStudioSurface ? "lobby-overlay-backdrop-studio" : ""}`}
      role="dialog"
    >
      <section
        aria-label={archiveLabel}
        className={`lobby-overlay-panel ${unifiedStudioSurface ? "lobby-overlay-studio-surface" : ""} ${className}`}
      >
        <div aria-hidden="true" className="lobby-overlay-frame-detail" />
        {unifiedStudioSurface && (
          <span aria-hidden="true" className="lobby-studio-frame-skin">
            <span className="lobby-studio-frame-slice is-top-left" />
            <span className="lobby-studio-frame-slice is-top" />
            <span className="lobby-studio-frame-slice is-top-right" />
            <span className="lobby-studio-frame-slice is-left" />
            <span className="lobby-studio-frame-slice is-right" />
            <span className="lobby-studio-frame-slice is-bottom-left" />
            <span className="lobby-studio-frame-slice is-bottom" />
            <span className="lobby-studio-frame-slice is-bottom-right" />
          </span>
        )}
         {onClose && <button aria-label={closeLabel} className="lobby-overlay-close" onClick={onClose} type="button">×</button>}
        <div className="lobby-overlay-paper">{children}</div>
      </section>
    </div>
  );
}
