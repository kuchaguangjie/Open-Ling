import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLingua } from "../../../../localization/useLingua";
import { StoryCard } from "./StoryCard";
import { StoryReader } from "./StoryReader";
import { StudioSignature } from "../shared/StudioSignature";
import { getCounselorDialogueAvatar } from "../../../../components/counselor/counselorPortraitAssets";
import { pickRandomCounselorStatusQuote } from "../../../../content/counselorStatusQuotes";
import {
  preloadImagesSequentiallyWithResults,
  preloadImagesWhenIdle
} from "../../../../media/imagePreload";
import {
  getStoryArticles,
  getLocalizedStoryArticles,
  getStoryCounselors,
  type StoryCounselorId
} from "./storyContent";
import "./bookcase.css";

type ContentStatus = "loading" | "ready" | "empty" | "error";

export function BookcaseFeature({ initialStatus = "ready" }: { initialStatus?: ContentStatus }) {
  const { locale, l } = useLingua();
  const storyCounselors = useMemo(() => getStoryCounselors(locale), [locale]);
  const storyArticles = useMemo(() => getLocalizedStoryArticles(locale), [locale]);
  const [activeCounselor, setActiveCounselor] = useState<StoryCounselorId>("chengling");
  const [openedArticleId, setOpenedArticleId] = useState<string | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentStatus>(initialStatus);
  const [counselorQuote, setCounselorQuote] = useState(() => pickRandomCounselorStatusQuote("chengling", locale));
  const [decodedAvatarUrls, setDecodedAvatarUrls] = useState<Set<string>>(() => new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<StoryCounselorId, number>>({
    chengling: 0,
    zhouzhou: 0,
    linleshui: 0
  });
  const returnFocusId = useRef<string | null>(null);

  const articles = useMemo(() => getStoryArticles(activeCounselor, locale), [activeCounselor, locale]);
  const counselor = storyCounselors.find((item) => item.id === activeCounselor);
  const openedArticle = storyArticles.find((article) => article.id === openedArticleId) ?? null;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const avatarUrls = storyCounselors.map((item) => getCounselorDialogueAvatar(item.id));
    const [selectedAvatarUrl, ...remainingAvatarUrls] = avatarUrls;
    void (async () => {
      const selectedDecodedUrls = await preloadImagesSequentiallyWithResults([selectedAvatarUrl]);
      if (cancelled) return;
      setDecodedAvatarUrls(new Set(selectedDecodedUrls));

      await preloadImagesWhenIdle(remainingAvatarUrls, { signal: controller.signal });
      if (cancelled) return;
      const remainingDecodedUrls = await preloadImagesSequentiallyWithResults(remainingAvatarUrls);
      if (!cancelled) setDecodedAvatarUrls(new Set([...selectedDecodedUrls, ...remainingDecodedUrls]));
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [storyCounselors]);

  useLayoutEffect(() => {
    if (!openedArticle && listRef.current) {
      listRef.current.scrollTop = scrollPositions.current[activeCounselor];
      if (returnFocusId.current) {
        document.querySelector<HTMLButtonElement>(`[data-story-id="${returnFocusId.current}"]`)?.focus();
        returnFocusId.current = null;
      }
    }
  }, [activeCounselor, openedArticle]);

  useEffect(() => {
    setCounselorQuote(pickRandomCounselorStatusQuote(activeCounselor, locale));
  }, [activeCounselor, locale]);

  function rememberScrollPosition() {
    if (listRef.current) scrollPositions.current[activeCounselor] = listRef.current.scrollTop;
  }

  function selectCounselor(counselorId: StoryCounselorId) {
    rememberScrollPosition();
    setActiveCounselor(counselorId);
    setCounselorQuote(pickRandomCounselorStatusQuote(counselorId, locale));
  }

  function openArticle(articleId: string) {
    rememberScrollPosition();
    returnFocusId.current = articleId;
    setOpenedArticleId(articleId);
  }

  if (contentStatus !== "ready") {
    return <BookcaseState status={contentStatus} onRetry={() => setContentStatus("ready")} />;
  }

  if (openedArticle) {
    return <StoryReader article={openedArticle} onBack={() => setOpenedArticleId(null)} />;
  }

  return (
    <section className="story-corner-shell" aria-labelledby="story-corner-title">
      <aside className="story-corner-intro">
        <h2 id="story-corner-title">{l("故事簿", "Stories")}</h2>
        <nav aria-label={l("按咨询师浏览故事", "Browse stories by counselor")} className="story-corner-categories">
          {storyCounselors.map((item) => (
            <BookcaseCounselorTab
              active={activeCounselor === item.id}
              avatarUrl={getCounselorDialogueAvatar(item.id)}
              decodedAvatarUrls={decodedAvatarUrls}
              key={item.id}
              label={item.label}
              onSelect={() => selectCounselor(item.id)}
            />
          ))}
        </nav>
        <blockquote aria-label={l("咨询室摘句", "A line from the counseling room")} className="story-corner-quote ling-motion-content-swap" key={`quote-${activeCounselor}`}>
          <span aria-hidden="true" className="story-corner-quote-rule" />
          <p>“{counselorQuote}”</p>
          <cite>{counselor?.name} · {l("咨询室摘句", "Counseling-room reflection")}</cite>
        </blockquote>
        <div className="story-corner-colophon">
          <StudioSignature label="STUDIO FICTION COLLECTION" />
        </div>
      </aside>

      <div className="story-corner-library ling-motion-content-swap" key={activeCounselor}>
        <header className="story-corner-library-header">
          <div className="story-corner-library-title">
            <span>{l("群心故事簿 · 原创虚构", "Qunxin Stories · Original fiction")}</span>
            <strong>{counselor?.label}</strong>
          </div>
          <p className="story-corner-library-description">{l("由咨询师从各自关注的心理视角创作，写下关系、困境与转变中的片刻。故事会逐渐增加。", "Original fiction written through each counselor's psychological lens, holding moments of relationship, struggle, and change. More stories will be added over time.")}</p>
          <span>{l(`${articles.length} 篇`, `${articles.length} ${articles.length === 1 ? "story" : "stories"}`)}</span>
        </header>
        <div
          aria-live="polite"
          className="story-corner-list"
          data-testid="story-scroll-region"
          ref={listRef}
        >
          {articles.map((article, index) => (
            <StoryCard article={article} featured={index === 0} key={article.id} onOpen={openArticle} />
          ))}
          <p className="story-corner-list-end">{l("人物、情节与对话均为虚构，不对应真实用户，也不读取或改写会谈内容。", "All characters, events, and dialogue are fictional. They do not represent real users and do not use or rewrite session content.")}</p>
        </div>
      </div>
    </section>
  );
}

function BookcaseCounselorTab({
  active,
  avatarUrl,
  decodedAvatarUrls,
  label,
  onSelect
}: {
  active: boolean;
  avatarUrl: string;
  decodedAvatarUrls: Set<string>;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button aria-pressed={active} onClick={onSelect} type="button">
      <img
        alt=""
        className="story-corner-counselor-avatar"
        decoding="async"
        src={decodedAvatarUrls.has(avatarUrl) ? avatarUrl : undefined}
      />
      <span>{label}</span>
    </button>
  );
}

function BookcaseState({ status, onRetry }: { status: Exclude<ContentStatus, "ready">; onRetry: () => void }) {
  const { l } = useLingua();
  if (status === "loading") {
    return (
      <section aria-live="polite" className="story-corner-state">
        <span className="story-corner-state-mark" aria-hidden="true">{l("书", "S")}</span>
        <h2>{l("正在打开故事簿……", "Opening the storybook…")}</h2>
        <div aria-hidden="true" className="story-corner-skeleton"><i /><i /><i /></div>
      </section>
    );
  }

  if (status === "empty") {
    return (
      <section aria-live="polite" className="story-corner-state">
        <span className="story-corner-state-mark" aria-hidden="true">{l("页", "P")}</span>
        <h2>{l("故事簿里还没有故事", "There are no stories here yet")}</h2>
        <p>{l("这里暂时还没有可以阅读的故事。你可以之后再来，或先返回等待室。", "There is nothing to read here yet. Return later, or go back to the waiting room for now.")}</p>
      </section>
    );
  }

  return (
    <section aria-live="polite" className="story-corner-state story-corner-state-error">
      <span className="story-corner-state-mark" aria-hidden="true">!</span>
      <h2>{l("没有打开故事簿", "The storybook did not open")}</h2>
      <p>{l("刚才的操作没有改变内容。请重新打开；如果仍然失败，可以先返回等待室。", "Nothing was changed. Try opening it again; if it still fails, return to the waiting room for now.")}</p>
      <button onClick={onRetry} type="button">{l("重新打开", "Open again")}</button>
    </section>
  );
}
