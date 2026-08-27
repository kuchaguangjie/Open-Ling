import { type CSSProperties, type ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useLingua } from "../../../../localization/useLingua";
import { useSessionStore } from "../../../../stores/sessionStore";
import { useSettingsStore } from "../../../../stores/settingsStore";
import {
  preloadImagesSequentiallyWithResults,
  preloadImagesWhenIdle
} from "../../../../media/imagePreload";
import studioLogo from "../../../../../../../../assets/runtime/lobby/counselor-introductions/群心心理工作室-logo.png";
import studioMark from "../../../../../../../../assets/runtime/lobby/resource-table/brand/qunxin-studio-logo-final-v1.png";
import safetyShield from "../../../../../../../../assets/runtime/lobby/resource-table/icons/resource-safety-icon-final-v1.png";
import { getCounselorIntroductionProfiles } from "./counselorIntroductionContent";
import "./counselor-introduction.css";

type SectionIconName = "compass" | "connection" | "care";
type CounselorIntroductionProfile = ReturnType<typeof getCounselorIntroductionProfiles>[number];

function StudioTopicIcon() {
  return <span aria-hidden="true" className="lobby-counselor-studio-mark" style={{ "--lobby-counselor-studio-mark": `url(${studioMark})` } as CSSProperties} />;
}

function CounselorSectionIcon({ name }: { name: SectionIconName }) {
  const paths: Record<SectionIconName, ReactNode> = {
    compass: (
      <>
        <circle cx="16" cy="16" r="12.15" />
        <path d="m20.9 10.45-3.05 7.35-6.75 3.75 3.05-7.35 6.75-3.75Z" />
      </>
    ),
    connection: (
      <>
        <circle cx="11.45" cy="16" r="7.9" />
        <circle cx="20.55" cy="16" r="7.9" />
      </>
    ),
    care: (
      <>
        <path d="M16 13c-3.6-2.88-5.9-4.72-5.9-7.3 0-1.8 1.32-3.17 3.1-3.17 1.22 0 2.3.68 2.8 1.73.5-1.05 1.58-1.73 2.8-1.73 1.78 0 3.1 1.37 3.1 3.17 0 2.58-2.3 4.42-5.9 7.3Z" />
        <path d="M4.35 16.45c2.03-.52 4.15.38 5.4 2.26l1.83 2.77c.85 1.3 2.3 2.07 3.85 2.07h.57" />
        <path d="M27.65 16.45c-2.03-.52-4.15.38-5.4 2.26l-1.83 2.77c-.85 1.3-2.3 2.07-3.85 2.07h-.57" />
        <path d="m7.45 16.95 3.58 3.85M24.55 16.95l-3.58 3.85" />
      </>
    )
  };

  return (
    <svg aria-hidden="true" className={`lobby-counselor-section-icon lobby-counselor-section-icon-${name}`} fill="none" viewBox="0 0 32 32">
      {paths[name]}
    </svg>
  );
}

function CounselorDetails({
  counselor,
  isBooked,
  onBook,
  t
}: {
  counselor: CounselorIntroductionProfile;
  isBooked: boolean;
  onBook: (counselorId: string) => void;
  t: ReturnType<typeof useLingua>["t"];
}) {
  const boundaryTooltipId = `lobby-counselor-ai-boundary-${counselor.id}`;

  return (
    <div className="lobby-counselor-details">
      <div className="lobby-counselor-heading">
        <div>
          <h2>{counselor.name}</h2>
          <p className="lobby-counselor-title">{counselor.title}</p>
        </div>
        <div className="lobby-counselor-heading-actions">
          <div className="lobby-book-control">
            <button className="lobby-book-button" disabled={isBooked} onClick={() => onBook(counselor.id)} type="button">
              {isBooked ? t("counselors.activeSession") : t("counselors.book")}
            </button>
            <span className="lobby-boundary-disclosure">
              <button aria-describedby={boundaryTooltipId} aria-label={t("counselors.aiBoundaryLabel")} className="lobby-boundary-trigger" type="button">
                <img alt="" aria-hidden="true" src={safetyShield} />
              </button>
              <span className="lobby-boundary-tooltip" id={boundaryTooltipId} role="tooltip">
                {t("counselors.aiBoundary")}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="lobby-counselor-sections">
        <section>
          <h3><CounselorSectionIcon name="compass" />{t("counselors.viewHeading")}</h3>
          <div className="lobby-counselor-paragraphs">
            <p>{counselor.summary}</p>
            <p>{counselor.consultationView}</p>
          </div>
        </section>
        <section>
          <h3><CounselorSectionIcon name="connection" />{t("counselors.workingHeading")}</h3>
          <div className="lobby-counselor-paragraphs">
            <p>{counselor.workingStyle}</p>
            {counselor.workingStyleFollowUp && <p>{counselor.workingStyleFollowUp}</p>}
          </div>
        </section>
        <section className="lobby-counselor-fields">
          <h3><StudioTopicIcon />{t("counselors.topicsHeading")}</h3>
          <div aria-label={t("counselors.topicsHeading")} className="lobby-strengths">
            {counselor.topics.map((topic) => <span key={topic}>{topic}</span>)}
          </div>
        </section>
      </div>
    </div>
  );
}

export function CounselorIntroductionFeature({
  onBook,
  onCounselorChange,
  portraitOverrides,
  selectedCounselorId
}: {
  mode: "introduction" | "booking";
  onBook: (counselorId: string) => void;
  onCounselorChange: (counselorId: string) => void;
  portraitOverrides?: Partial<Record<string, string>>;
  selectedCounselorId: string;
}) {
  const { locale, t } = useLingua();
  const disabledCounselorIds = useSettingsStore((state) => state.disabledCounselorIds);
  const counselorIntroductionProfiles = useMemo(
    () => getCounselorIntroductionProfiles(locale, disabledCounselorIds),
    [disabledCounselorIds, locale]
  );
  const bookedCounselorId = useSessionStore((state) => state.bookedCounselorId);
  const selectedCounselor = counselorIntroductionProfiles.find((item) => item.id === selectedCounselorId) ?? counselorIntroductionProfiles[0];
  const isSelectedCounselorBooked = bookedCounselorId === selectedCounselor.id;
  const copyRef = useRef<HTMLDivElement>(null);
  const counselorChangeRequestRef = useRef(0);

  useLayoutEffect(() => {
    copyRef.current?.scrollTo?.({ top: 0 });
  }, [selectedCounselor.id]);

  useEffect(() => {
    const controller = new AbortController();
    const deferredAssetUrls = counselorIntroductionProfiles
      .flatMap((counselor) => [portraitOverrides?.[counselor.id] ?? counselor.portrait, counselor.avatar]);
    void preloadImagesWhenIdle(deferredAssetUrls, { signal: controller.signal });
    return () => controller.abort();
  }, [counselorIntroductionProfiles, portraitOverrides]);

  const selectCounselor = (counselor: CounselorIntroductionProfile) => {
    if (counselor.id === selectedCounselor.id) return;
    const requestId = counselorChangeRequestRef.current + 1;
    counselorChangeRequestRef.current = requestId;
    const portrait = portraitOverrides?.[counselor.id] ?? counselor.portrait;
    void preloadImagesSequentiallyWithResults([portrait, counselor.avatar]).then(() => {
      if (counselorChangeRequestRef.current === requestId) onCounselorChange(counselor.id);
    });
  };

  return (
    <div className={`lobby-counselor-layout lobby-counselor-layout-${selectedCounselor.id}`}>
      <header className="lobby-counselor-masthead">
        <div className="lobby-counselor-tabs" role="tablist" aria-label={t("counselors.choose")}>
          {counselorIntroductionProfiles.map((counselor) => {
            const isCurrentCounselor = selectedCounselor.id === counselor.id;
            return (
              <button
                aria-label={counselor.name}
                aria-selected={isCurrentCounselor}
                key={counselor.id}
                onClick={() => selectCounselor(counselor)}
                role="tab"
                type="button"
              >
                <span className="lobby-counselor-tab-avatar">
                  <img
                    alt={locale === "en-US" ? `${counselor.name} conversation avatar` : `${counselor.name}对话头像`}
                    decoding="async"
                    src={counselor.avatar}
                  />
                  {isCurrentCounselor && <span aria-hidden="true" className="lobby-counselor-tab-status-dot" />}
                </span>
                <span className="lobby-counselor-tab-copy">
                  <strong>{counselor.name}</strong>
                  <small aria-hidden={!isCurrentCounselor}>
                    {isCurrentCounselor ? t("counselors.currentlyViewing") : "\u00a0"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </header>
      <section aria-label={locale === "en-US" ? `Introduction to ${selectedCounselor.name}` : `${selectedCounselor.name}咨询师介绍`} className="lobby-counselor-profile">
        <div className="lobby-counselor-portrait-stage">
          <img
            alt={locale === "en-US" ? `Portrait of ${selectedCounselor.name}` : `${selectedCounselor.name}咨询师介绍立绘`}
            className="lobby-counselor-portrait-active"
            data-counselor-id={selectedCounselor.id}
            decoding="async"
            key={`portrait-${selectedCounselor.id}`}
            src={portraitOverrides?.[selectedCounselor.id] ?? selectedCounselor.portrait}
          />
        </div>
        <div className="lobby-counselor-copy" ref={copyRef}>
          <div className="lobby-counselor-details-transition">
            <div className="lobby-counselor-details-layer">
              <CounselorDetails counselor={selectedCounselor} isBooked={isSelectedCounselorBooked} onBook={onBook} t={t} />
            </div>
          </div>
          <section aria-labelledby="lobby-counselor-shared-belief-title" className="lobby-counselor-shared-belief">
            <span aria-hidden="true" className="lobby-counselor-quote-mark">“</span>
            <div className="lobby-counselor-shared-belief-copy">
              <h2 id="lobby-counselor-shared-belief-title">{t("counselors.sharedBeliefTitle")}</h2>
              <p>
                <span>{t("counselors.sharedBelief1")}</span>
                <span>{t("counselors.sharedBelief2")}</span>
                <span>{t("counselors.sharedBelief3")}</span>
              </p>
            </div>
            <div className="lobby-counselor-brand">
              <img alt={t("brand.studio")} className="lobby-counselor-logo" src={studioLogo} />
              <span>{t("brand.studio")}</span>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
