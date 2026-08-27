import { Fragment, type ReactNode, useState } from "react";
import { useLingua } from "../../../../localization/useLingua";
import {
  getInformedConsentDocument,
  type InformedConsentBlock,
  type InformedConsentModule
} from "./informedConsentContent";
import { informedConsentVersion } from "../../../../flows/consultation/informedConsentContent";
import { ResourceDocumentReaderLayout } from "./ResourceDocumentReaderLayout";

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
    if (block.type === "subheading") {
      return <h3 key={`${block.text}-${index}`}>{block.text}</h3>;
    }

    if (block.type === "unordered-list") {
      const counselorProfiles = block.items.length === 3
        && block.items.every((item) => /^\*\*(程灵|周舟|林乐水|Cheng Ling|Zhou Zhou|Lin Leshui)/u.test(item));
      return (
        <ul className={counselorProfiles ? "informed-consent-counselors" : undefined} key={`list-${index}`}>
          {block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}
        </ul>
      );
    }

    if (block.type === "ordered-list") {
      return (
        <ol key={`steps-${index}`}>
          {block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}
        </ol>
      );
    }

    return <p key={`${block.text}-${index}`}>{renderInline(block.text)}</p>;
  });
}

function ConsentOverview({ hideReferenceDeskGuidance, onOpenModule }: { hideReferenceDeskGuidance?: boolean; onOpenModule: (id: string) => void }) {
  const { locale, t } = useLingua();
  const { introduction: completeIntroduction, modules } = getInformedConsentDocument(locale);
  const introduction = hideReferenceDeskGuidance
    ? completeIntroduction.filter(
      (block) => block.type !== "paragraph"
        || (!block.text.startsWith("本页是资料桌中的完整") && !block.text.startsWith("This is the full version")),
    )
    : completeIntroduction;
  return (
    <>
      <header className="informed-consent-overview-header"><h3>{t("consent.readingInformation")}</h3></header>
      <div className="informed-consent-introduction">
        <ConsentBlocks blocks={introduction} />
      </div>
      <div className="informed-consent-directory" aria-label={t("consent.directoryLabel")}>
        {modules.map((module) => (
          <button key={module.id} onClick={() => onOpenModule(module.id)} type="button">
            <span>{module.number.padStart(2, "0")}</span>
            <strong>{module.title}</strong>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
    </>
  );
}

function ConsentModulePage({ module }: { module: InformedConsentModule }) {
  return (
    <div className={`informed-consent-module informed-consent-module-${module.number}`}>
      <header>
        <span>{module.number.padStart(2, "0")} / 07</span>
        <h2>{module.title}</h2>
      </header>
      <div className="informed-consent-module-body">
        <ConsentBlocks blocks={module.blocks} />
      </div>
    </div>
  );
}

export function InformedConsentReader({
  footer,
  hideReferenceDeskGuidance = false,
  onBack
}: {
  footer?: ReactNode;
  hideReferenceDeskGuidance?: boolean;
  onBack?: () => void;
}) {
  const { locale, t } = useLingua();
  const [activePage, setActivePage] = useState("overview");
  const { modules } = getInformedConsentDocument(locale);
  const activeModule = modules.find((module) => module.id === activePage);
  const pageIds = ["overview", ...modules.map((module) => module.id)];
  const pageIndex = pageIds.indexOf(activePage);
  const openPage = (pageId: string) => setActivePage(pageId);

  const navigation = (
    <>
      <p>{t("consent.fullTitle")}</p>
      <div className="informed-consent-navigation-items">
        <button
          aria-current={activePage === "overview" ? "page" : undefined}
          onClick={() => openPage("overview")}
          type="button"
        >
          <span>{t("consent.overview")}</span>
          <strong>{t("consent.resourceIntroTitle")}</strong>
        </button>
        {modules.map((module) => (
          <button
            aria-current={activePage === module.id ? "page" : undefined}
            aria-label={locale === "en-US" ? `Section ${module.number}: ${module.title}` : `第${module.number}部分 ${module.title}`}
            key={module.id}
            onClick={() => openPage(module.id)}
            type="button"
          >
            <span>{module.number.padStart(2, "0")}</span>
            <strong>{module.title}</strong>
          </button>
        ))}
      </div>
    </>
  );

  const pagination = (
    <div className="informed-consent-pagination">
      <button disabled={pageIndex <= 0} onClick={() => openPage(pageIds[pageIndex - 1] ?? "overview")} type="button">{t("consent.previous")}</button>
      <span>{pageIndex === 0 ? t("consent.overview") : `${pageIndex} / ${modules.length}`}</span>
      <button disabled={pageIndex >= pageIds.length - 1} onClick={() => openPage(pageIds[pageIndex + 1] ?? activePage)} type="button">{t("consent.next")}</button>
    </div>
  );

  return (
    <ResourceDocumentReaderLayout
      ariaLabel={t("consent.fullTitle")}
      contentKey={activePage}
      footer={footer ?? pagination}
      navigation={navigation}
      navigationLabel={t("consent.directoryLabel")}
      onBack={onBack}
      title={t("consent.fullTitle")}
      version={informedConsentVersion}
    >
      {activeModule
        ? <ConsentModulePage module={activeModule} />
        : <ConsentOverview hideReferenceDeskGuidance={hideReferenceDeskGuidance} onOpenModule={openPage} />}
    </ResourceDocumentReaderLayout>
  );
}
