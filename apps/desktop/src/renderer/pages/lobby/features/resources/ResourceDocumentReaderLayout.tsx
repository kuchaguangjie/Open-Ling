import type { ReactNode } from "react";
import qunxinLogoUrl from "../../../../../../../../assets/runtime/lobby/resource-table/brand/qunxin-studio-logo-final-v1.png";
import { useLingua } from "../../../../localization/useLingua";

interface ResourceDocumentReaderLayoutProps {
  ariaLabel: string;
  title: string;
  version: string;
  navigationLabel: string;
  navigation: ReactNode;
  children: ReactNode;
  contentKey?: string;
  footer?: ReactNode;
  onBack?: () => void;
}

export function ResourceDocumentReaderLayout({
  ariaLabel,
  title,
  version,
  navigationLabel,
  navigation,
  children,
  contentKey,
  footer,
  onBack
}: ResourceDocumentReaderLayoutProps) {
  const { t } = useLingua();
  return (
    <article aria-label={ariaLabel} className="resource-document-reader">
      <header className="resource-document-reader-header">
        {onBack ? (
          <button className="resource-table-back" onClick={onBack} type="button">
            <span aria-hidden="true">‹</span> {t("resources.back")}
          </button>
        ) : <span aria-hidden="true" className="resource-document-reader-header-spacer" />}
        <div className="resource-document-reader-heading">
          <h2>{title}</h2>
        </div>
        <div aria-label={t("brand.studio")} className="resource-document-reader-brand">
          <img alt="" src={qunxinLogoUrl} />
          <span>{t("brand.studio")}</span>
        </div>
      </header>
      <div className="resource-document-reader-layout">
        <nav aria-label={navigationLabel} className="resource-document-reader-navigation">
          {navigation}
        </nav>
        <section aria-live="polite" className="resource-document-reader-page">
          <div className="resource-document-reader-page-scroll ling-motion-content-swap" key={contentKey}>
            {children}
            <p aria-label={`${t("resources.documentVersion")} ${version}`} className="resource-document-reader-version">{t("resources.version")} {version} · {t("brand.copyright")}</p>
          </div>
          {footer && <footer className="resource-document-reader-footer">{footer}</footer>}
        </section>
      </div>
    </article>
  );
}
