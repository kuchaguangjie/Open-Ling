import { type ReactNode, useEffect, useState } from "react";
import consentCardUrl from "../../../../../../../../assets/runtime/lobby/resource-table/cards/resource-consent-card-transparent-v1.png";
import helpCardUrl from "../../../../../../../../assets/runtime/lobby/resource-table/cards/resource-help-card-transparent-v1.png";
import safetyCardUrl from "../../../../../../../../assets/runtime/lobby/resource-table/cards/resource-safety-card-transparent-v1.png";
import { useLingua } from "../../../../localization/useLingua";
import { preloadDecodedImage } from "../../../../media/imagePreload";
import { StudioSignature } from "../shared/StudioSignature";
import { CrisisSupportReader } from "./CrisisSupportReader";
import { InformedConsentReader } from "./InformedConsentReader";
import { getResourceDocuments, type ResourceDocumentId } from "./resourceContent";
import { UserGuideReader } from "./UserGuideReader";
import "./resource-table.css";

export interface ResourceTableFeatureProps {
  status?: "ready" | "loading" | "empty" | "error";
}

const documentCardUrls: Record<ResourceDocumentId, string> = {
  help: helpCardUrl,
  safety: safetyCardUrl,
  consent: consentCardUrl
};

function ResourceTableShell({
  children,
  contentKey,
  documentReader = false,
  showFooter = false
}: {
  children: ReactNode;
  contentKey: string;
  documentReader?: boolean;
  showFooter?: boolean;
}) {
  const { t } = useLingua();
  return (
    <div className={`resource-table-shell resource-table-shell-default${documentReader ? " is-document-reader" : ""}`}>
      <div className="resource-table-content ling-motion-content-swap" key={contentKey}>{children}</div>
      {showFooter && (
        <footer className="resource-table-studio-footer">
          <StudioSignature label="STUDIO REFERENCE DESK" />
          <p>{t("resources.footer")}</p>
        </footer>
      )}
    </div>
  );
}

export function ResourceTableFeature({ status = "ready" }: ResourceTableFeatureProps) {
  const { locale, t } = useLingua();
  const resourceDocuments = getResourceDocuments(locale);
  const [selectedId, setSelectedId] = useState<ResourceDocumentId | null>(null);
  const [decodedCardUrls, setDecodedCardUrls] = useState<Set<string>>(() => new Set());
  const selectedDocument = resourceDocuments.find((document) => document.id === selectedId);

  useEffect(() => {
    if (status !== "ready" || selectedId) return;
    let cancelled = false;
    void (async () => {
      for (const document of resourceDocuments) {
        const url = documentCardUrls[document.id];
        try {
          await preloadDecodedImage(url);
          if (cancelled) return;
          setDecodedCardUrls((current) => new Set(current).add(url));
        } catch {
          // Keep the light card placeholder if optional illustration art cannot be decoded.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, status]);

  if (status !== "ready") {
    return (
      <ResourceTableShell contentKey={`status-${status}`}>
        <section className="resource-table-status" aria-live="polite">
          <p>{t(`resources.${status}`)}</p>
          <button onClick={() => setSelectedId(null)} type="button">{t("resources.back")}</button>
        </section>
      </ResourceTableShell>
    );
  }

  if (selectedDocument?.id === "consent") {
    return (
      <ResourceTableShell contentKey="consent" documentReader>
        <InformedConsentReader onBack={() => setSelectedId(null)} />
      </ResourceTableShell>
    );
  }

  if (selectedDocument?.id === "help") {
    return (
      <ResourceTableShell contentKey="help" documentReader>
        <UserGuideReader onBack={() => setSelectedId(null)} />
      </ResourceTableShell>
    );
  }

  if (selectedDocument?.id === "safety") {
    return (
      <ResourceTableShell contentKey="safety" documentReader>
        <CrisisSupportReader onBack={() => setSelectedId(null)} />
      </ResourceTableShell>
    );
  }

  if (selectedDocument) {
    return (
      <ResourceTableShell contentKey={selectedDocument.id}>
        <article aria-label={selectedDocument.title} className="resource-table-reader">
          <button className="resource-table-back" onClick={() => setSelectedId(null)} type="button"><span aria-hidden="true">‹</span> {t("resources.back")}</button>
          <p className="lobby-overlay-kicker">{t("resources.desk")} · {t("resources.studioMaterials")}</p>
          <h2>{selectedDocument.title}</h2>
          <p className="resource-table-reader-summary">{selectedDocument.summary}</p>
          <div className="resource-table-sections">
            {selectedDocument.sections.map((section) => (
              <section className={section.tone === "important" ? "is-important" : undefined} key={section.heading}>
                <h3>{section.heading}</h3>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
          </div>
        </article>
      </ResourceTableShell>
    );
  }

  return (
    <ResourceTableShell contentKey="catalog" showFooter>
      <section className="resource-table-catalog">
        <header className="resource-table-header">
          <h2>{t("resources.desk")}</h2>
          <p>{t("resources.studioMaterials")}</p>
        </header>
        <div className="resource-table-document-list">
          {resourceDocuments.map((document) => (
            <button
              aria-label={`${t("resources.view")}${locale === "zh-CN" ? "" : " "}${document.title}`}
              className={`resource-table-document resource-table-document-${document.id}`}
              key={document.id}
              onClick={() => setSelectedId(document.id)}
              type="button"
            >
              <img
                alt=""
                aria-hidden="true"
                className="resource-table-card-art"
                data-resource-art="illustrated-card"
                decoding="async"
                src={decodedCardUrls.has(documentCardUrls[document.id]) ? documentCardUrls[document.id] : undefined}
              />
              <span aria-hidden="true" className="resource-table-card-copy">
                <strong>{document.title}</strong>
                <span>{document.summary}</span>
                <i />
                <small>{t("resources.view")} <b aria-hidden="true">→</b></small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </ResourceTableShell>
  );
}
