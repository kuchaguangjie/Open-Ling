import { type ReactNode, useEffect, useMemo, useState } from "react";
import { formatSessionLetterMarkdown, getDefaultCounselors, isSessionLetterSalutation, splitSessionLetterParagraphs, type CounselingSession, type SessionLetter, type SupportedLocale } from "@shared/index";
import sidebarPlant from "../../../../../../../assets/brand/sidebar-plant.png";
import closedLetterEnvelopeArt from "../../../../../../../assets/runtime/session-letter/envelope-closed-transparent.png";
import letterEnvelopeArt from "../../../../../../../assets/runtime/session-letter/envelope-paper-transparent.png";
import letterWaxSealArt from "../../../../../../../assets/runtime/session-letter/wax-seal-cord-ling-transparent.png";
import { getCounselorDialogueAvatar } from "../../../components/counselor/counselorPortraitAssets";
import { useLingua } from "../../../localization/useLingua";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useSessionStore } from "../../../stores/sessionStore";
import "./settings-memory.css";

interface LetterArchiveItem {
  letter: SessionLetter;
  session?: CounselingSession;
}

function LetterIcon({ name }: { name: "letter" | "archive" | "search" | "filter" | "open" | "refresh" | "close" }) {
  const icons: Record<typeof name, ReactNode> = {
    letter: (
      <>
        <path d="M5.4 7.4h13.2v9.4H5.4z" />
        <path d="m6.2 8.2 5.8 5 5.8-5" />
        <path d="m8.4 15.5 3-2.5" />
        <path d="m15.6 15.5-3-2.5" />
      </>
    ),
    archive: (
      <>
        <path d="M6.2 5.9h11.6v12.2H6.2z" />
        <path d="M8.2 8.7h7.6" />
        <path d="M8.2 11.6h5.7" />
        <path d="M8.2 14.5h4.1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="4.8" />
        <path d="m14.5 14.5 4 4" />
      </>
    ),
    filter: <path d="M6.3 6.7h11.4l-4.3 5.1v4.7l-2.8 1.1v-5.8z" />,
    open: (
      <>
        <path d="M7.2 6.5h9.6v11H7.2z" />
        <path d="M9.2 9.4h5.6" />
        <path d="M9.2 12.2h4" />
      </>
    ),
    refresh: (
      <>
        <path d="M17.7 8.2A6.5 6.5 0 0 0 6.2 9.8" />
        <path d="M17.8 5.5v2.8h-2.8" />
        <path d="M6.3 15.8a6.5 6.5 0 0 0 11.5-1.6" />
        <path d="M6.2 18.5v-2.8H9" />
      </>
    ),
    close: (
      <>
        <path d="m8 8 8 8" />
        <path d="m16 8-8 8" />
      </>
    )
  };

  return (
    <svg className="memory-icon" viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export function SettingsMemoryPage() {
  const { locale, l } = useLingua();
  const counselors = getDefaultCounselors(locale);
  const statusLabels: Record<SessionLetter["status"], string> = {
    pending: l("正在写信", "Writing"),
    ready: l("已写好", "Ready"),
    failed: l("写信失败", "Failed")
  };
  const fallbackSessions = useSessionStore((state) => state.sessions);
  const fallbackLettersBySessionId = useSessionStore((state) => state.sessionLettersBySessionId);
  const clientDisplayName = useSettingsStore((state) => state.profile.displayName);
  const [items, setItems] = useState<LetterArchiveItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [activeCounselorId, setActiveCounselorId] = useState("all");
  const [query, setQuery] = useState("");
  const [activeLetterId, setActiveLetterId] = useState("");
  const [openedLetter, setOpenedLetter] = useState<LetterArchiveItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    void loadLetters();
  }, [fallbackLettersBySessionId, fallbackSessions]);

  async function loadLetters() {
    if (!window.lingDesktop?.sessionLetters?.list || !window.lingDesktop?.sessions?.list) {
      const nextItems = buildFallbackItems(fallbackSessions, fallbackLettersBySessionId);
      setItems(nextItems);
      setActiveLetterId((current) => (nextItems.some((item) => item.letter.id === current) ? current : nextItems[0]?.letter.id ?? ""));
      setStatus("ready");
      return;
    }

    setStatus("loading");
    const [lettersResult, sessionsResult] = await Promise.all([
      window.lingDesktop.sessionLetters.list(),
      window.lingDesktop.sessions.list()
    ]);
    if (!lettersResult.ok) {
      setStatus("error");
      setMessage(lettersResult.error.message);
      return;
    }
    if (!sessionsResult.ok) {
      setStatus("error");
      setMessage(sessionsResult.error.message);
      return;
    }

    const sessionsById = new Map(sessionsResult.data.map((session) => [session.id, session]));
    const nextItems = lettersResult.data.flatMap((letter) => {
      const session = sessionsById.get(letter.sessionId);
      return session?.status === "ended" ? [{ letter, session }] : [];
    });
    setItems(nextItems);
    setActiveLetterId((current) => (nextItems.some((item) => item.letter.id === current) ? current : nextItems[0]?.letter.id || ""));
    setStatus("ready");
    setMessage("");
  }

  async function refreshLetters() {
    setIsRefreshing(true);
    try {
      await loadLetters();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function regenerateLetter(item: LetterArchiveItem) {
    if (!window.lingDesktop?.sessionLetters?.regenerate) return;
    setItems((current) =>
      current.map((candidate) =>
        candidate.letter.id === item.letter.id
          ? {
              ...candidate,
              letter: {
                ...candidate.letter,
                status: "pending",
                updatedAt: new Date().toISOString(),
                errorMessage: undefined
              }
            }
          : candidate
      )
    );
    const result = await window.lingDesktop.sessionLetters.regenerate(item.letter.sessionId);
    if (!result.ok) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.letter.id === item.letter.id
            ? {
                ...candidate,
                letter: {
                  ...candidate.letter,
                  status: "failed",
                  updatedAt: new Date().toISOString(),
                  errorMessage: result.error.message
                }
              }
            : candidate
        )
      );
      return;
    }
    await loadLetters();
  }

  const counselorFilters = useMemo(() => {
    const ids = new Set(items.map((item) => item.letter.counselorId));
    return [
      { id: "all", label: l("全部咨询师", "All counselors"), count: items.length },
      ...counselors
        .filter((counselor) => ids.has(counselor.id))
        .map((counselor) => ({
          id: counselor.id,
          label: counselor.name,
          count: items.filter((item) => item.letter.counselorId === counselor.id).length
        }))
    ];
  }, [counselors, items, l]);

  const filteredItems = useMemo(() => {
    const text = query.trim();
    return items.filter((item) => {
      const counselorName = getCounselorName(item.letter.counselorId, locale);
      const haystack = `${item.session?.title ?? ""} ${counselorName} ${formatSessionLetterMarkdown(item.letter.letterMd, clientDisplayName, locale)}`.trim();
      return (
        (activeCounselorId === "all" || item.letter.counselorId === activeCounselorId) &&
        (!text || haystack.includes(text))
      );
    });
  }, [activeCounselorId, clientDisplayName, items, locale, query]);

  const activeItem =
    filteredItems.find((item) => item.letter.id === activeLetterId) ??
    filteredItems[0] ??
    items.find((item) => item.letter.id === activeLetterId) ??
    null;

  return (
    <section className="settings-memory-page letter-archive-page">
      <header className="memory-page-header letter-page-header">
        <div className="settings-page-title memory-title">
          <span className="title-sprig" aria-hidden="true" />
          <div>
            <h1>{l("咨询师的信", "Letters from your counselors")}</h1>
            <p>{l("每次会谈结束后，咨询师写给你的信都会保存在这里。你可以晚一点再回来，慢慢打开。", "Letters written after your sessions are kept here. You can return and open them whenever you feel ready.")}</p>
          </div>
        </div>
        <label className="letter-search">
          <LetterIcon name="search" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={l("搜索来信、会谈或咨询师", "Search letters, sessions, or counselors")} />
        </label>
      </header>

      <div className="memory-notice letter-notice">
        <LetterIcon name="letter" />
        <span>{l("这些信不是诊断或总结，而是咨询师在一次会谈之后，写给你的温和回看。", "These letters are neither diagnoses nor clinical summaries. They are a gentle reflection from your counselor after a session.")}</span>
      </div>

      <div className="letter-dashboard">
        <aside className="memory-category-panel letter-filter-panel">
          <h2>{l("来信筛选", "Filter letters")}</h2>
          <div className="memory-category-list">
            {counselorFilters.map((filter) => (
              <button
                className={filter.id === activeCounselorId ? "memory-category-item active" : "memory-category-item"}
                key={filter.id}
                onClick={() => setActiveCounselorId(filter.id)}
                type="button"
              >
                <span>
                  {filter.id === "all" ? (
                    <span className="letter-filter-icon">
                      <LetterIcon name="archive" />
                    </span>
                  ) : (
                    <img className="letter-filter-avatar" alt="" src={getCounselorDialogueAvatar(filter.id)} />
                  )}
                  {filter.label}
                </span>
              </button>
            ))}
          </div>
          <div className="memory-privacy-note letter-privacy-note">
            <span className="privacy-icon">
              <LetterIcon name="filter" />
            </span>
            <h3>{l("本地保存", "Stored locally")}</h3>
            <p>{l("这些来信只保存在你的本地设备里，和仅供 Ling 使用的后台整理材料分开。", "These letters are stored only on this device and are kept separate from background materials used only by Ling.")}</p>
          </div>
        </aside>

        <section className="memory-list-panel letter-list-panel">
          <header className="memory-list-header">
            <h2>{l(`来信列表（${filteredItems.length} 封）`, `Letters (${filteredItems.length})`)}</h2>
            <div className="memory-list-actions">
              <button className={isRefreshing ? "is-refreshing" : ""} disabled={isRefreshing} onClick={() => void refreshLetters()} type="button">
                {isRefreshing ? l("刷新中", "Refreshing") : l("刷新", "Refresh")}
                <LetterIcon name="refresh" />
              </button>
            </div>
          </header>

          <div className="letter-card-list">
            {status === "loading" && <div className="memory-state-card">{l("正在读取本地来信...", "Loading local letters…")}</div>}
            {status === "error" && <div className="memory-state-card error">{message}</div>}
            {status === "ready" && filteredItems.length === 0 && (
              <div className="memory-state-card">
                <h3>{l("还没有来信", "No letters yet")}</h3>
                <p>{l("结束一次会谈后，咨询师写给你的信会出现在这里。", "After a session ends, a letter from your counselor will appear here.")}</p>
              </div>
            )}
            {status === "ready" &&
              filteredItems.map((item) => (
                <article
                  className={activeItem?.letter.id === item.letter.id ? "letter-card active" : "letter-card"}
                  key={item.letter.id}
                >
                  <button
                    aria-pressed={activeItem?.letter.id === item.letter.id}
                    className="letter-card-main"
                    onClick={() => setActiveLetterId(item.letter.id)}
                    onDoubleClick={() => {
                      setActiveLetterId(item.letter.id);
                      if (item.letter.status === "ready") setOpenedLetter(item);
                    }}
                    type="button"
                  >
                    <span className="letter-card-icon">
                      <img alt="" src={activeItem?.letter.id === item.letter.id ? letterEnvelopeArt : closedLetterEnvelopeArt} />
                    </span>
                    <span className="letter-card-copy">
                      <span className="letter-card-heading">
                        <strong>{item.session?.title ?? l("未命名会谈", "Untitled session")}</strong>
                        <span className={`letter-status-badge ${item.letter.status}`}>{statusLabels[item.letter.status]}</span>
                      </span>
                      <span className="letter-card-meta">
                        {getCounselorName(item.letter.counselorId, locale)} · {formatDate(item.session?.endedAt ?? item.letter.updatedAt, locale)}
                      </span>
                      <span className="letter-card-excerpt">{getLetterExcerpt(item.letter, clientDisplayName, locale)}</span>
                    </span>
                  </button>
                </article>
              ))}
          </div>
        </section>

        <aside className="letter-preview-panel">
          {activeItem ? (
            <>
              <div className="letter-preview-paper">
                <div className="letter-preview-mark" aria-hidden="true" />
                <img className="letter-preview-art" alt="" src={letterEnvelopeArt} />
                <span className={`letter-status-badge ${activeItem.letter.status}`}>
                  {statusLabels[activeItem.letter.status]}
                </span>
                <h2>{activeItem.session?.title ?? l("未命名会谈", "Untitled session")}</h2>
                <p className="letter-preview-meta">{formatReadableDate(activeItem.session?.endedAt ?? activeItem.letter.updatedAt, locale)}</p>
                {activeItem.letter.status === "ready" ? (
                  <div className="letter-preview-content">{renderLetterPreview(activeItem.letter.letterMd, clientDisplayName, getCounselorName(activeItem.letter.counselorId, locale), locale)}</div>
                ) : activeItem.letter.status === "pending" ? (
                  <p className="letter-preview-state">{l("咨询师正在把这次会谈慢慢整理成一封信。你可以稍后回来查看。", "Your counselor is shaping this session into a letter. You can return later to read it.")}</p>
                ) : (
                  <p className="letter-preview-state error">{activeItem.letter.errorMessage ?? l("这封信暂时没有写好，可以重新生成。", "This letter was not completed. You can generate it again.")}</p>
                )}
              </div>
              <div className="letter-preview-actions">
                <button disabled={activeItem.letter.status !== "ready"} onClick={() => setOpenedLetter(activeItem)} type="button">
                  {l("打开完整信件", "Open full letter")}
                </button>
                {activeItem.letter.status === "failed" && (
                  <button onClick={() => void regenerateLetter(activeItem)} type="button">
                    {l("重新生成", "Generate again")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="letter-preview-empty">
              <img alt="" src={sidebarPlant} />
              <h2>{l("还没有选中的来信", "No letter selected")}</h2>
              <p>{l("结束一次会谈后，来信会在这里静静等你。", "After a session ends, its letter will wait for you here.")}</p>
            </div>
          )}
        </aside>
      </div>

      {openedLetter && (
        <div className="letter-reader-backdrop" onClick={() => setOpenedLetter(null)}>
          <article className="letter-reader-paper" onClick={(event) => event.stopPropagation()} role="dialog" aria-label={l("完整来信", "Full letter")}>
            <img className="letter-reader-envelope" alt="" src={letterEnvelopeArt} />
            <img className="letter-reader-seal" alt="" src={letterWaxSealArt} />
            <div className="letter-reader-sheet">
              <button className="letter-reader-close" onClick={() => setOpenedLetter(null)} type="button" aria-label={l("关闭来信", "Close letter")}>
                <LetterIcon name="close" />
              </button>
              <header className="letter-reader-letterhead">
                <h2>{openedLetter.session?.title ?? l(`${getCounselorName(openedLetter.letter.counselorId, locale)}写给你的一封信`, `A letter to you from ${getCounselorName(openedLetter.letter.counselorId, locale)}`)}</h2>
                <div className="letter-reader-divider" aria-hidden="true" />
              </header>
              <div className="letter-reader-body">
                {renderLetter(openedLetter.letter.letterMd, undefined, getCounselorName(openedLetter.letter.counselorId, locale), clientDisplayName, locale)}
              </div>
              <footer className="letter-reader-signature">
                <p>{getCounselorName(openedLetter.letter.counselorId, locale)}</p>
                <time dateTime={openedLetter.letter.updatedAt}>{formatReadableDate(openedLetter.letter.updatedAt, locale)}</time>
              </footer>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

function buildFallbackItems(
  sessions: Array<CounselingSession & { messages?: unknown[] }>,
  lettersBySessionId: Record<string, SessionLetter | undefined>
): LetterArchiveItem[] {
  return sessions
    .reduce<LetterArchiveItem[]>((collection, session) => {
      const letter = lettersBySessionId[session.id];
      if (letter && session.status === "ended") collection.push({ letter, session });
      return collection;
    }, [])
    .sort((a, b) => {
      const aTime = new Date(a.session?.endedAt ?? a.letter.updatedAt).getTime();
      const bTime = new Date(b.session?.endedAt ?? b.letter.updatedAt).getTime();
      return bTime - aTime;
    });
}

function getCounselorName(counselorId: string, locale: SupportedLocale) {
  return getDefaultCounselors(locale).find((counselor) => counselor.id === counselorId)?.name ?? (locale === "en-US" ? "Counselor" : "咨询师");
}

function formatDate(value: string | undefined, locale: SupportedLocale) {
  if (!value) return locale === "en-US" ? "Just now" : "刚刚";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(parsed);
}

function formatReadableDate(value: string | undefined, locale: SupportedLocale) {
  if (!value) return locale === "en-US" ? "Just now" : "刚刚";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(parsed);
}

function getLetterExcerpt(letter: SessionLetter, clientDisplayName: string | undefined, locale: SupportedLocale) {
  if (letter.status === "pending") return locale === "en-US" ? "Your counselor is writing this letter." : "咨询师正在写这封信。";
  if (letter.status === "failed") return letter.errorMessage ?? (locale === "en-US" ? "This letter was not completed." : "这封信暂时没有写好。");
  return formatSessionLetterMarkdown(letter.letterMd, clientDisplayName, locale).replace(/[#*_>`-]/g, "").replace(/\s+/g, " ").trim() || (locale === "en-US" ? "This letter does not have any content yet." : "这封信还没有内容。");
}

function renderLetterPreview(markdown: string, clientDisplayName: string | undefined, signatureName: string, locale: SupportedLocale) {
  return renderLetter(markdown, 3, signatureName, clientDisplayName, locale);
}

function renderLetter(markdown: string, limit: number | undefined, signatureName: string | undefined, clientDisplayName: string | undefined, locale: SupportedLocale) {
  const paragraphs = splitSessionLetterParagraphs(markdown, clientDisplayName, locale);
  if (signatureName && !limit && paragraphs.at(-1)?.replace(/\s/g, "") === signatureName.replace(/\s/g, "")) {
    paragraphs.pop();
  }
  return paragraphs.slice(0, limit).map((paragraph, index) => (
    <p className={paragraph.replace(/\s/g, "") === signatureName?.replace(/\s/g, "") ? "letter-signature" : isSessionLetterSalutation(paragraph) ? "letter-salutation" : undefined} key={`${paragraph.slice(0, 18)}-${index}`}>
      {paragraph}
    </p>
  ));
}
