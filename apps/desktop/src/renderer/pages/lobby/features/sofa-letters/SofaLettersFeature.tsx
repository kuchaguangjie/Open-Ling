import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatSessionLetterMarkdown, getDefaultCounselors, isSessionLetterSalutation, splitSessionLetterParagraphs, type CounselingSession, type SessionLetter, type SupportedLocale } from "@shared/index";
import closedEnvelopeArt from "../../../../../../../../assets/runtime/session-letter/envelope-closed-transparent.png";
import openedEnvelopeArt from "../../../../../../../../assets/runtime/session-letter/envelope-paper-transparent.png";
import { getCounselorDialogueAvatar } from "../../../../components/counselor/counselorPortraitAssets";
import { useLingua } from "../../../../localization/useLingua";
import { useSettingsStore } from "../../../../stores/settingsStore";
import { useSessionStore } from "../../../../stores/sessionStore";
import { SessionLetterReader } from "../../../counseling-room/overlays/session-letter/SessionLetterReader";
import { StudioSignature } from "../shared/StudioSignature";
import "./sofa-letters.css";

interface LetterArchiveItem {
  letter: SessionLetter;
  session?: CounselingSession;
}

type ArchiveStatus = "loading" | "ready" | "error";

export function SofaLettersFeature() {
  const { locale, l } = useLingua();
  const counselors = useMemo(() => getDefaultCounselors(locale), [locale]);
  const statusLabels: Record<SessionLetter["status"], string> = {
    pending: l("正在写", "Writing"),
    ready: l("已完成", "Ready"),
    failed: l("生成失败", "Failed")
  };
  const fallbackSessions = useSessionStore((state) => state.sessions);
  const fallbackLettersBySessionId = useSessionStore((state) => state.sessionLettersBySessionId);
  const clientDisplayName = useSettingsStore((state) => state.profile.displayName);
  const [items, setItems] = useState<LetterArchiveItem[]>([]);
  const [status, setStatus] = useState<ArchiveStatus>("loading");
  const [message, setMessage] = useState("");
  const [activeCounselorId, setActiveCounselorId] = useState("all");
  const [query, setQuery] = useState("");
  const [activeLetterId, setActiveLetterId] = useState("");
  const [openedLetter, setOpenedLetter] = useState<LetterArchiveItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const loadRequestSequenceRef = useRef(0);

  const loadLetters = useCallback(
    async (showLoading = true) => {
      const requestSequence = loadRequestSequenceRef.current + 1;
      loadRequestSequenceRef.current = requestSequence;
      const isLatestRequest = () => loadRequestSequenceRef.current === requestSequence;
      if (showLoading) setStatus("loading");

      if (!window.lingDesktop?.sessionLetters?.list) {
        const nextItems = buildFallbackItems(fallbackSessions, fallbackLettersBySessionId);
        if (!isLatestRequest()) return;
        setItems(nextItems);
        setActiveLetterId((current) => (nextItems.some((item) => item.letter.id === current) ? current : nextItems[0]?.letter.id ?? ""));
        setStatus("ready");
        setMessage("");
        return;
      }

      const lettersResult = await window.lingDesktop.sessionLetters.list();
      if (!isLatestRequest()) return;

      if (!lettersResult.ok) {
        setStatus("error");
        setMessage(lettersResult.error.message);
        return;
      }

      const sessionsById = new Map(fallbackSessions.map((session) => [session.id, session]));
      const nextItems = lettersResult.data.map((letter) => ({
        letter,
        session: sessionsById.get(letter.sessionId)
      }));
      setItems(nextItems);
      setActiveLetterId((current) => (nextItems.some((item) => item.letter.id === current) ? current : nextItems[0]?.letter.id ?? ""));
      setStatus("ready");
      setMessage("");
    },
    [fallbackLettersBySessionId, fallbackSessions, locale]
  );

  useEffect(() => {
    void loadLetters();
  }, [loadLetters]);

  useEffect(() => {
    if (!items.some((item) => item.letter.status === "pending")) return;
    const intervalId = window.setInterval(() => void loadLetters(false), 2500);
    return () => window.clearInterval(intervalId);
  }, [items, loadLetters]);

  useEffect(() => {
    if (!openedLetter) return;
    const closeReaderFirst = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpenedLetter(null);
    };
    window.addEventListener("keydown", closeReaderFirst, true);
    return () => window.removeEventListener("keydown", closeReaderFirst, true);
  }, [openedLetter]);

  const counselorFilters = useMemo(() => {
    const ids = new Set(items.map((item) => item.letter.counselorId));
    return [
      { id: "all", label: l("全部咨询师", "All counselors") },
      ...counselors.filter((counselor) => ids.has(counselor.id)).map((counselor) => ({ id: counselor.id, label: counselor.name }))
    ];
  }, [counselors, items, l]);

  const filteredItems = useMemo(() => {
    const text = query.trim();
    return items.filter((item) => {
      if (activeCounselorId !== "all" && item.letter.counselorId !== activeCounselorId) return false;
      if (!text) return true;
      const haystack = `${item.session?.title ?? ""} ${getCounselorName(item.letter.counselorId, locale)} ${formatSessionLetterMarkdown(item.letter.letterMd, clientDisplayName, locale)}`;
      return haystack.includes(text);
    });
  }, [activeCounselorId, clientDisplayName, items, locale, query]);

  const activeItem =
    filteredItems.find((item) => item.letter.id === activeLetterId) ??
    filteredItems[0] ??
    null;

  async function refreshLetters() {
    setIsRefreshing(true);
    try {
      await loadLetters(false);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function regenerateLetter(item: LetterArchiveItem) {
    if (!window.lingDesktop?.sessionLetters?.regenerate) return;
    const requestSequence = loadRequestSequenceRef.current + 1;
    loadRequestSequenceRef.current = requestSequence;
    setItems((current) => current.map((candidate) => candidate.letter.id === item.letter.id ? {
      ...candidate,
      letter: { ...candidate.letter, status: "pending", updatedAt: new Date().toISOString(), errorMessage: undefined }
    } : candidate));
    const result = await window.lingDesktop.sessionLetters.regenerate(item.letter.sessionId);
    if (loadRequestSequenceRef.current !== requestSequence) return;
    if (!result.ok) {
      setItems((current) => current.map((candidate) => candidate.letter.id === item.letter.id ? {
        ...candidate,
        letter: { ...candidate.letter, status: "failed", updatedAt: new Date().toISOString(), errorMessage: result.error.message }
      } : candidate));
      return;
    }
    await loadLetters(false);
  }

  return (
    <section aria-labelledby="sofa-letters-title" className="sofa-letters-shell">
      <header className="sofa-letters-header">
        <div>
          <h2 id="sofa-letters-title">{l("咨询师的信", "Letters from your counselors")}</h2>
          <p>{l("不必急着读完", "Read them at your own pace")}</p>
        </div>
        <div className="sofa-letters-tools">
          <label className="sofa-letter-search">
            <span className="sr-only">{l("搜索来信", "Search letters")}</span>
            <input placeholder={l("搜索来信、会谈或咨询师", "Search letters, sessions, or counselors")} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button disabled={isRefreshing} onClick={() => void refreshLetters()} type="button">
            {isRefreshing ? l("正在刷新……", "Refreshing…") : l("刷新", "Refresh")}
          </button>
        </div>
      </header>

      <nav aria-label={l("按咨询师筛选来信", "Filter letters by counselor")} className="sofa-letter-filters">
        {counselorFilters.map((filter) => (
          <button
            aria-pressed={filter.id === activeCounselorId}
            key={filter.id}
            onClick={() => {
              setActiveCounselorId(filter.id);
              setMobilePreviewOpen(false);
            }}
            type="button"
          >
            {filter.id === "all" ? (
              <img alt="" src={closedEnvelopeArt} />
            ) : (
              <img alt="" src={getCounselorDialogueAvatar(filter.id)} />
            )}
            <span>{filter.label}</span>
          </button>
        ))}
      </nav>

      <div className="sofa-letter-main">
        <section className={`${mobilePreviewOpen ? "sofa-letter-list-panel is-hidden-mobile" : "sofa-letter-list-panel"} ling-motion-content-swap`} aria-label={l("来信列表", "Letter list")} key={`letters-${activeCounselorId}`}>
          {status === "loading" && <ArchiveState title={l("正在读取本机来信……", "Loading letters from this device…")} />}
          {status === "error" && <ArchiveState actionLabel={l("重新读取", "Reload")} message={message} onAction={() => void loadLetters()} title={l("没有读取到来信", "Letters could not be loaded")} />}
          {status === "ready" && items.length === 0 && (
            <ArchiveState message={l("结束一次咨询后，生成完成的咨询师来信会保存在这里。", "Completed counselor letters are kept here after a session ends.")} title={l("还没有来信", "No letters yet")} />
          )}
          {status === "ready" && items.length > 0 && filteredItems.length === 0 && (
            <ArchiveState actionLabel={l("清空搜索", "Clear search")} message={l("换个关键词，或查看其他咨询师的来信。", "Try another search term or view letters from a different counselor.")} onAction={() => setQuery("")} title={l("没有找到相符的来信", "No matching letters")} />
          )}
          {status === "ready" && filteredItems.map((item) => (
            <button
              aria-pressed={activeItem?.letter.id === item.letter.id}
              className={activeItem?.letter.id === item.letter.id ? "sofa-letter-row active" : "sofa-letter-row"}
              key={item.letter.id}
              onClick={() => {
                setActiveLetterId(item.letter.id);
                setMobilePreviewOpen(true);
              }}
              onDoubleClick={() => {
                if (item.letter.status === "ready") setOpenedLetter(item);
              }}
              type="button"
            >
              <img alt="" src={item.letter.status === "ready" && activeItem?.letter.id === item.letter.id ? openedEnvelopeArt : closedEnvelopeArt} />
              <span className="sofa-letter-row-copy">
                <strong>{item.session?.title ?? l(`${getCounselorName(item.letter.counselorId, locale)}的来信`, `Letter from ${getCounselorName(item.letter.counselorId, locale)}`)}</strong>
                <span>{getCounselorName(item.letter.counselorId, locale)}</span>
                <time dateTime={item.session?.endedAt ?? item.letter.updatedAt}>{formatDate(item.session?.endedAt ?? item.letter.updatedAt, locale)}</time>
              </span>
              <span className={`sofa-letter-status ${item.letter.status}`}>{statusLabels[item.letter.status]}</span>
            </button>
          ))}
        </section>

        <aside className={mobilePreviewOpen ? "sofa-letter-preview-panel is-open-mobile" : "sofa-letter-preview-panel"} aria-label={l("来信预览", "Letter preview")}>
          <button className="sofa-letter-mobile-back" onClick={() => setMobilePreviewOpen(false)} type="button">{l("返回来信列表", "Back to letters")}</button>
          {activeItem ? (
            <article className="sofa-letter-preview-paper ling-motion-content-swap" key={activeItem.letter.id}>
              <img alt="" className="sofa-letter-preview-envelope" src={activeItem.letter.status === "ready" ? openedEnvelopeArt : closedEnvelopeArt} />
              <header>
                <div>
                  <h3>{activeItem.session?.title ?? l(`${getCounselorName(activeItem.letter.counselorId, locale)}的来信`, `Letter from ${getCounselorName(activeItem.letter.counselorId, locale)}`)}</h3>
                  <p>{getCounselorName(activeItem.letter.counselorId, locale)}</p>
                </div>
                <time dateTime={activeItem.session?.endedAt ?? activeItem.letter.updatedAt}>{formatReadableDate(activeItem.session?.endedAt ?? activeItem.letter.updatedAt, locale)}</time>
              </header>
              <div className="sofa-letter-preview-divider" />
              {activeItem.letter.status === "ready" ? (
                <div className="sofa-letter-preview-body">{renderLetterPreview(activeItem.letter.letterMd, clientDisplayName, getCounselorName(activeItem.letter.counselorId, locale), locale)}</div>
              ) : activeItem.letter.status === "pending" ? (
                <div className="sofa-letter-preview-state">
                  <strong>{l("咨询师正在写信", "Your counselor is writing")}</strong>
                  <p>{l("通常需要 1–3 分钟。写好后这里会自动更新。", "This usually takes 1–3 minutes. The letter will update here when ready.")}</p>
                </div>
              ) : (
                <div className="sofa-letter-preview-state error">
                  <strong>{l("这封信没有生成完成", "This letter was not completed")}</strong>
                  <p>{activeItem.letter.errorMessage ?? l("可以稍后重新生成。", "You can generate it again later.")}</p>
                </div>
              )}
              <footer>
                {activeItem.letter.status === "ready" && (
                  <button onClick={() => setOpenedLetter(activeItem)} type="button">{l("打开完整信件", "Open full letter")}</button>
                )}
                {activeItem.letter.status === "failed" && (
                  <button onClick={() => void regenerateLetter(activeItem)} type="button">{l("重新生成", "Generate again")}</button>
                )}
              </footer>
            </article>
          ) : (
            <ArchiveState message={l("从列表中选择一封来信，这里会显示预览。", "Choose a letter from the list to preview it here.")} title={l("选择一封来信", "Choose a letter")} />
          )}
        </aside>
      </div>

      <footer className="sofa-letters-studio-footer">
        <StudioSignature label="PRIVATE LETTER ARCHIVE" />
        <p>{l("来信记录保存在这台设备上；生成时，相关会谈内容会发送到你配置的模型服务。", "Letters are stored on this device. When a letter is generated, related session content is sent to your configured model service.")}</p>
      </footer>

      {openedLetter && (
        <SessionLetterReader
          clientDisplayName={clientDisplayName}
          counselorName={getCounselorName(openedLetter.letter.counselorId, locale)}
          letter={openedLetter.letter}
          onClose={() => setOpenedLetter(null)}
          sessionTitle={openedLetter.session?.title}
        />
      )}
    </section>
  );
}

function ArchiveState({ actionLabel, message, onAction, title }: { actionLabel?: string; message?: string; onAction?: () => void; title: string }) {
  return (
    <div className="sofa-letter-state" role="status">
      <img alt="" src={closedEnvelopeArt} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {actionLabel && onAction && <button onClick={onAction} type="button">{actionLabel}</button>}
    </div>
  );
}

function buildFallbackItems(
  sessions: Array<CounselingSession & { messages?: unknown[] }>,
  lettersBySessionId: Record<string, SessionLetter | undefined>
): LetterArchiveItem[] {
  return sessions.reduce<LetterArchiveItem[]>((collection, session) => {
    const letter = lettersBySessionId[session.id];
    if (letter) collection.push({ letter, session });
    return collection;
  }, []).sort((a, b) => new Date(b.session?.endedAt ?? b.letter.updatedAt).getTime() - new Date(a.session?.endedAt ?? a.letter.updatedAt).getTime());
}

function getCounselorName(counselorId: string, locale: SupportedLocale) {
  return getDefaultCounselors(locale).find((counselor) => counselor.id === counselorId)?.name ?? (locale === "en-US" ? "Counselor" : "咨询师");
}

function formatDate(value: string | undefined, locale: SupportedLocale) {
  if (!value) return locale === "en-US" ? "Just now" : "刚刚";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(parsed);
}

function formatReadableDate(value: string | undefined, locale: SupportedLocale) {
  if (!value) return locale === "en-US" ? "Just now" : "刚刚";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(parsed);
}

function renderLetterPreview(markdown: string, displayName: string | undefined, signatureName: string, locale: SupportedLocale) {
  return splitSessionLetterParagraphs(markdown, displayName, locale)
    .slice(0, 6)
    .map((paragraph, index) => <p className={paragraph.replace(/\s/g, "") === signatureName.replace(/\s/g, "") ? "letter-signature" : isSessionLetterSalutation(paragraph) ? "letter-salutation" : undefined} key={`${paragraph.slice(0, 18)}-${index}`}>{paragraph}</p>);
}
