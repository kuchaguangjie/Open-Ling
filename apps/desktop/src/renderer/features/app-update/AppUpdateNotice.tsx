import { useEffect, useState } from "react";
import type { AppUpdateStatus } from "@shared/index";
import { useLingua } from "../../localization/useLingua";
import "./app-update-notice.css";

export function AppUpdateNotice() {
  const { t } = useLingua();
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);

  useEffect(() => {
    const updates = window.lingDesktop?.updates;
    if (!updates) return;
    let cancelled = false;
    void updates.getStatus().then((result) => {
      if (!cancelled && result.ok) setStatus(result.data);
    });
    const unsubscribe = updates.onStatusChanged((nextStatus) => {
      if (!cancelled) setStatus(nextStatus);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (
    status?.state !== "available" ||
    !status.availableVersion ||
    dismissedVersion === status.availableVersion
  ) {
    return null;
  }

  return (
    <aside aria-label={t("update.noticeLabel")} className="app-update-notice" role="status">
      <button
        aria-label={t("update.dismiss")}
        className="app-update-notice-close"
        onClick={() => setDismissedVersion(status.availableVersion ?? null)}
        type="button"
      >
        ×
      </button>
      <strong>Ling v{status.availableVersion} {t("update.availableSuffix")}</strong>
      <p>{t("update.manualInstall")}</p>
      <button
        className="app-update-notice-link"
        onClick={() => void window.lingDesktop.updates?.openDownloadPage()}
        type="button"
      >
        {t("update.openWebsite")}
      </button>
    </aside>
  );
}
