import { Fragment, type ReactNode, useState } from "react";
import {
  getInformedConsentAcknowledgement,
  getInformedConsentSensitiveDataAcknowledgement,
  informedConsentVersion
} from "../../../../flows/consultation/informedConsentContent";
import { useLingua } from "../../../../localization/useLingua";
import qunxinLogoUrl from "../../../../../../../../assets/runtime/lobby/resource-table/brand/qunxin-studio-logo-final-v1.png";
import {
  getInformedConsentDocument,
  type InformedConsentBlock,
  type InformedConsentModule
} from "../resources/informedConsentContent";
import "./informed-consent.css";

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/gu).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function ConsentBlocks({ blocks }: { blocks: InformedConsentBlock[] }) {
  return blocks.map((block, index) => {
    if (block.type === "subheading") return <h3 key={`${block.text}-${index}`}>{block.text}</h3>;
    if (block.type === "unordered-list") {
      return <ul key={`list-${index}`}>{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>;
    }
    if (block.type === "ordered-list") {
      return <ol key={`steps-${index}`}>{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ol>;
    }
    return <p key={`${block.text}-${index}`}>{renderInline(block.text)}</p>;
  });
}

function ConsentIntroduction() {
  const { locale, t } = useLingua();
  const introduction = getInformedConsentDocument(locale).introduction.filter(
    (block) => block.type !== "paragraph"
      || (!block.text.startsWith("本页是资料桌中的完整版本") && !block.text.startsWith("This is the full version")),
  );
  return (
    <div className="consultation-consent-copy consultation-consent-introduction">
      <p className="consultation-consent-section-index">{t("consent.readingInformation")}</p>
      <h3>{t("consent.introductionTitle")}</h3>
      <ConsentBlocks blocks={introduction} />
      <aside>{t("consent.introductionAside")}</aside>
    </div>
  );
}

function ConsentModule({ module, moduleCount }: { module: InformedConsentModule; moduleCount: number }) {
  return (
    <div className="consultation-consent-copy">
      <p className="consultation-consent-section-index">
        {module.number.padStart(2, "0")} / {String(moduleCount).padStart(2, "0")}
      </p>
      <h3>{module.title}</h3>
      <ConsentBlocks blocks={module.blocks} />
    </div>
  );
}

export function InformedConsentPage({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { locale, t } = useLingua();
  const [acknowledged, setAcknowledged] = useState(false);
  const [sensitiveDataAcknowledged, setSensitiveDataAcknowledged] = useState(false);
  const [activePage, setActivePage] = useState("overview");
  const { modules } = getInformedConsentDocument(locale);
  const pageIds = ["overview", ...modules.map((module) => module.id)];
  const pageIndex = pageIds.indexOf(activePage);
  const activeModule = modules.find((module) => module.id === activePage);
  const canConfirm = acknowledged && sensitiveDataAcknowledged;
  const openPage = (pageId: string) => setActivePage(pageId);

  return (
    <article aria-label={t("consent.fullTitle")} className="consultation-consent-reader consultation-consent-reader-full">
      <header className="consultation-consent-header">
        <div>
          <span>{t("consent.beforeCounseling")}</span>
          <h2>{t("consent.fullTitle")}</h2>
          <p>{t("consent.headerDescription")}</p>
        </div>
        <div aria-label={t("brand.studio")} className="consultation-consent-brand">
          <img alt="" src={qunxinLogoUrl} />
          <span>{t("brand.studio")}</span>
        </div>
      </header>

      <div className="consultation-consent-body">
        <nav aria-label={t("consent.directoryLabel")} className="consultation-consent-navigation">
          <div className="consultation-consent-navigation-heading">
            <strong>{t("consent.readingDirectory")}</strong>
            <span>{pageIndex === 0 ? t("consent.overview") : `${pageIndex} / ${modules.length}`}</span>
          </div>
          <div className="consultation-consent-navigation-items">
            <button aria-current={activePage === "overview" ? "page" : undefined} onClick={() => openPage("overview")} type="button">
              <span>{t("consent.overview")}</span><strong>{t("consent.startingInformation")}</strong>
            </button>
            {modules.map((module) => (
              <button
                aria-current={activePage === module.id ? "page" : undefined}
                aria-label={locale === "en-US" ? `Section ${module.number}: ${module.title}` : `第${module.number}部分 ${module.title}`}
                key={module.id}
                onClick={() => openPage(module.id)}
                type="button"
              >
                <span>{module.number.padStart(2, "0")}</span><strong>{module.title}</strong>
              </button>
            ))}
          </div>
        </nav>

        <section aria-live="polite" className="consultation-consent-page">
          <div className="consultation-consent-page-scroll ling-motion-content-swap" key={activePage}>
            {activeModule ? (
              <ConsentModule module={activeModule} moduleCount={modules.length} />
            ) : (
              <ConsentIntroduction />
            )}
            <p className="consultation-consent-version">{t("consent.version")} {informedConsentVersion} · {t("brand.copyright")}</p>
          </div>
          <div className="consultation-consent-pagination">
            <button disabled={pageIndex <= 0} onClick={() => openPage(pageIds[pageIndex - 1] ?? "overview")} type="button">{t("consent.previous")}</button>
            <span>{pageIndex === 0 ? t("consent.overview") : `${pageIndex} / ${modules.length}`}</span>
            <button disabled={pageIndex >= pageIds.length - 1} onClick={() => openPage(pageIds[pageIndex + 1] ?? activePage)} type="button">{t("consent.next")}</button>
          </div>
        </section>
      </div>

      <footer className="consultation-consent-confirmation">
        <div className="consultation-consent-acknowledgements">
          <label>
            <input checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} type="checkbox" />
            <span>{getInformedConsentAcknowledgement(locale)}</span>
          </label>
          <label>
            <input checked={sensitiveDataAcknowledged} onChange={(event) => setSensitiveDataAcknowledged(event.target.checked)} type="checkbox" />
            <span>{getInformedConsentSensitiveDataAcknowledgement(locale)}</span>
          </label>
        </div>
        <div className="consultation-consent-actions">
          <button className="consultation-consent-cancel" onClick={onCancel} type="button">{t("consent.notNow")}</button>
          <button disabled={!canConfirm} onClick={onConfirm} type="button">{t("consent.agree")}</button>
        </div>
      </footer>
    </article>
  );
}
