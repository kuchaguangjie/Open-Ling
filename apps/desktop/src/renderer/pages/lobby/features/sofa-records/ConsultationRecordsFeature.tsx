import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getDefaultCounselors, type CounselingSession, type SessionMessage, type SupportedLocale } from "@shared/index";
import { getCounselorDialogueAvatar } from "../../../../components/counselor/counselorPortraitAssets";
import { useLingua } from "../../../../localization/useLingua";
import { useSettingsStore } from "../../../../stores/settingsStore";
import { useSessionStore } from "../../../../stores/sessionStore";
import { StudioSignature } from "../shared/StudioSignature";
import "./consultation-records.css";

type ArchiveStatus = "loading" | "ready" | "error";

export function ConsultationRecordsFeature() {
  const { locale, l } = useLingua();
  const counselors = useMemo(() => getDefaultCounselors(locale), [locale]);
  const profile = useSettingsStore((state) => state.profile);
  const [sessions, setSessions] = useState<CounselingSession[]>([]);
  const [messagesBySessionId, setMessagesBySessionId] = useState<Record<string, SessionMessage[] | undefined>>({});
  const [status, setStatus] = useState<ArchiveStatus>("loading");
  const [message, setMessage] = useState("");
  const [activeCounselorId, setActiveCounselorId] = useState("all");
  const [query, setQuery] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [renameSession, setRenameSession] = useState<CounselingSession | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [actionError, setActionError] = useState("");
  const [readerSessionId, setReaderSessionId] = useState<string | null>(null);
  const [deleteSessionCandidate, setDeleteSessionCandidate] = useState<CounselingSession | null>(null);

  const loadSessions = useCallback(async (showLoading = true) => {
    if (showLoading) setStatus("loading");
    setActionError("");

    if (!window.lingDesktop?.sessions?.list) {
      const fallbackSessions = useSessionStore.getState().sessions;
      const ended = fallbackSessions.filter((session) => session.status === "ended").map(toCounselingSession);
      setSessions(ended);
      setMessagesBySessionId(Object.fromEntries(fallbackSessions.map((session) => [session.id, session.messages])));
      setActiveSessionId((current) => ended.some((session) => session.id === current) ? current : ended[0]?.id ?? "");
      setStatus("ready");
      setMessage("");
      return;
    }

    try {
      const result = await window.lingDesktop.sessions.list();
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error.message);
        return;
      }
      const ended = result.data.filter((session) => session.status === "ended").sort(sortSessionsNewestFirst);
      setSessions(ended);
      setMessagesBySessionId({});
      setActiveSessionId((current) => ended.some((session) => session.id === current) ? current : ended[0]?.id ?? "");
      setStatus("ready");
      setMessage("");
    } catch {
      setStatus("error");
      setMessage(l("暂时无法读取本机会谈记录，请重新读取。", "Local session records could not be loaded. Please try again."));
    }
  }, [locale]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const counselorFilters = useMemo(() => {
    const ids = new Set(sessions.map((session) => session.counselorId));
    return [
      { id: "all", label: l("所有记录", "All records") },
      ...counselors.filter((counselor) => ids.has(counselor.id)).map((counselor) => ({ id: counselor.id, label: counselor.name }))
    ];
  }, [counselors, l, sessions]);

  const filteredSessions = useMemo(() => {
    const text = query.trim();
    return sessions.filter((session) => {
      const haystack = `${session.title} ${getCounselorName(session.counselorId, locale)}`;
      return (activeCounselorId === "all" || session.counselorId === activeCounselorId) && (!text || haystack.includes(text));
    });
  }, [activeCounselorId, locale, query, sessions]);

  const activeSession = filteredSessions.find((session) => session.id === activeSessionId) ?? filteredSessions[0] ?? null;
  const activeMessages = activeSession ? messagesBySessionId[activeSession.id] : undefined;
  const readerSession = readerSessionId ? sessions.find((session) => session.id === readerSessionId) ?? null : null;
  const readerMessages = readerSession ? messagesBySessionId[readerSession.id] : undefined;
  const showArchiveColumns = status === "ready" && sessions.length > 0;

  const loadMessages = useCallback(async (sessionId: string) => {
    if (messagesBySessionId[sessionId]) return;
    setIsLoadingMessages(true);
    setMessagesError("");
    try {
      if (!window.lingDesktop?.messages?.listBySessionId) {
        setMessagesBySessionId((current) => ({ ...current, [sessionId]: [] }));
        return;
      }
      const result = await window.lingDesktop.messages.listBySessionId(sessionId);
      if (!result.ok) {
        setMessagesError(result.error.message);
        return;
      }
      setMessagesBySessionId((current) => ({ ...current, [sessionId]: result.data.filter((item) => item.role !== "system") }));
    } catch {
      setMessagesError(l("暂时无法读取这场会谈，请重新读取。", "This session could not be loaded. Please try again."));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [locale, messagesBySessionId]);

  useEffect(() => {
    if (activeSession) void loadMessages(activeSession.id);
  }, [activeSession, loadMessages]);

  async function refreshSessions() {
    setIsRefreshing(true);
    try {
      await loadSessions(false);
    } finally {
      setIsRefreshing(false);
    }
  }

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId);
    setMobilePreviewOpen(true);
    setOpenMenuSessionId(null);
  }

  function openRecordReader(sessionId: string) {
    setActiveSessionId(sessionId);
    setMobilePreviewOpen(false);
    setReaderSessionId(sessionId);
    void loadMessages(sessionId);
  }

  async function saveRename() {
    if (!renameSession) return;
    const title = renameDraft.trim();
    if (!title) return;
    const updatedAt = new Date().toISOString();
    setActionError("");
    try {
      if (window.lingDesktop?.sessions?.update) {
        const result = await window.lingDesktop.sessions.update(renameSession.id, { title, updatedAt });
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }
      setSessions((current) => current.map((session) => session.id === renameSession.id ? { ...session, title, updatedAt } : session));
      useSessionStore.setState((state) => ({
        sessions: state.sessions.map((session) => session.id === renameSession.id ? { ...session, title, updatedAt } : session)
      }));
      setRenameSession(null);
    } catch {
      setActionError(l("没有保存新的会谈名称，请稍后重试。", "The new session title was not saved. Please try again."));
    }
  }

  function requestDelete(session: CounselingSession) {
    setOpenMenuSessionId(null);
    setDeleteSessionCandidate(session);
  }

  async function confirmDelete() {
    const session = deleteSessionCandidate;
    if (!session) return;
    setActionError("");
    try {
      if (window.lingDesktop?.sessions?.delete) {
        const result = await window.lingDesktop.sessions.delete(session.id);
        if (!result.ok) {
          setActionError(result.error.message);
          return;
        }
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setMessagesBySessionId((current) => {
        const next = { ...current };
        delete next[session.id];
        return next;
      });
      setActiveSessionId((current) => current === session.id ? "" : current);
      useSessionStore.setState((state) => ({
        activeSessionId: state.activeSessionId === session.id ? "" : state.activeSessionId,
        sessions: state.sessions.filter((item) => item.id !== session.id)
      }));
      setDeleteSessionCandidate(null);
    } catch {
      setActionError(l("没有删除这场会谈，现有记录保持不变。请稍后重试。", "The session was not deleted. Existing records remain unchanged. Please try again."));
    }
  }

  return (
    <section aria-labelledby="consultation-records-title" className="consultation-records-shell">
      <header className="consultation-records-header">
        <div>
          <h2 id="consultation-records-title">{l("会谈记录", "Session records")}</h2>
          <p>{l("在这里，慢慢回看", "Return to them at your own pace")}</p>
        </div>
        <div className="consultation-records-tools">
          <label className="consultation-record-search">
            <span className="sr-only">{l("搜索会谈或咨询师", "Search sessions or counselors")}</span>
            <input placeholder={l("搜索会谈或咨询师", "Search sessions or counselors")} value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button disabled={isRefreshing} onClick={() => void refreshSessions()} type="button">{isRefreshing ? l("正在刷新……", "Refreshing…") : l("刷新", "Refresh")}</button>
        </div>
      </header>

      <nav aria-label={l("按记录与咨询师筛选会谈", "Filter sessions by counselor")} className="consultation-record-filters">
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
            {filter.id === "all" ? <ArchiveNotebookIcon /> : <img alt="" src={getCounselorDialogueAvatar(filter.id)} />}
            <span>{filter.label}</span>
          </button>
        ))}
      </nav>

      <div className={showArchiveColumns ? "consultation-record-main" : "consultation-record-main is-single-state"}>
        {!showArchiveColumns && (
          <section aria-label={l("会谈记录状态", "Session-record status")} className="consultation-record-unified-state">
            {status === "loading" && <ArchiveState title={l("正在读取本机会谈记录……", "Loading session records from this device…")} />}
            {status === "error" && <ArchiveState actionLabel={l("重新读取", "Reload")} message={message} onAction={() => void loadSessions()} title={l("没有读取到会谈记录", "Session records could not be loaded")} />}
            {status === "ready" && <ArchiveState message={l("完成一次会谈后，可以在这里慢慢回看完整记录。", "After a session ends, you can return here to review the complete record.")} title={l("还没有会谈记录", "No session records yet")} />}
          </section>
        )}
        {showArchiveColumns && (
          <>
        <section aria-label={l("会谈列表", "Session list")} className={`${mobilePreviewOpen ? "consultation-record-list-panel is-hidden-mobile" : "consultation-record-list-panel"} ling-motion-content-swap`} key={`records-${activeCounselorId}`}>
          {filteredSessions.length === 0 && <ArchiveState actionLabel={l("清空搜索", "Clear search")} message={l("换个关键词，或查看其他咨询师的会谈。", "Try another search term or view sessions with a different counselor.")} onAction={() => setQuery("")} title={l("没有找到相符的会谈", "No matching sessions")} />}
          {filteredSessions.map((session) => (
            <article className={activeSession?.id === session.id ? "consultation-record-row active" : "consultation-record-row"} key={session.id}>
              <button
                aria-label={`${session.title} ${getCounselorName(session.counselorId, locale)} ${formatDate(session.endedAt ?? session.updatedAt, locale)}`}
                aria-pressed={activeSession?.id === session.id}
                className="consultation-record-row-select"
                onClick={() => selectSession(session.id)}
                onDoubleClick={() => openRecordReader(session.id)}
                type="button"
              >
                <span className="consultation-record-row-copy">
                  <strong>{session.title}</strong>
                  <span>{getCounselorName(session.counselorId, locale)}</span>
                  <time dateTime={session.endedAt ?? session.updatedAt}>{formatDate(session.endedAt ?? session.updatedAt, locale)}</time>
                </span>
              </button>
              <button aria-expanded={openMenuSessionId === session.id} aria-label={l(`打开“${session.title}”的操作`, `Open actions for “${session.title}”`)} className="consultation-record-row-menu-button" onClick={() => setOpenMenuSessionId((current) => current === session.id ? null : session.id)} type="button">···</button>
              {openMenuSessionId === session.id && (
                <div className="consultation-record-row-menu" role="menu">
                  <button onClick={() => { setRenameSession(session); setRenameDraft(session.title); setOpenMenuSessionId(null); }} role="menuitem" type="button">{l("重命名", "Rename")}</button>
                  <button className="danger" onClick={() => requestDelete(session)} role="menuitem" type="button">{l("删除", "Delete")}</button>
                </div>
              )}
            </article>
          ))}
        </section>

        <aside aria-label={l("会谈记录预览", "Session-record preview")} className={mobilePreviewOpen ? "consultation-record-preview-panel is-open-mobile" : "consultation-record-preview-panel"}>
          <button className="consultation-record-mobile-back" onClick={() => setMobilePreviewOpen(false)} type="button">{l("返回会谈列表", "Back to sessions")}</button>
          {activeSession ? (
            <article className="consultation-record-preview-paper ling-motion-content-swap" key={activeSession.id}>
              <header>
                <div>
                  <h3>{activeSession.title}</h3>
                  <p>{getCounselorName(activeSession.counselorId, locale)} · {formatReadableDate(activeSession.endedAt ?? activeSession.updatedAt, locale)} · {formatDuration(activeSession, locale)} · {l(`${activeMessages?.length ?? "…"}条消息`, `${activeMessages?.length ?? "…"} messages`)}</p>
                </div>
              </header>
              <div className="consultation-record-preview-divider" />
              <div className="consultation-record-transcript" aria-live="polite">
                {isLoadingMessages && <TranscriptState title={l("正在读取会谈内容……", "Loading session content…")} />}
                {messagesError && <TranscriptState actionLabel={l("重新读取", "Reload")} message={messagesError} onAction={() => activeSession && void loadMessages(activeSession.id)} title={l("没有读取到会谈内容", "Session content could not be loaded")} />}
                {!isLoadingMessages && !messagesError && activeMessages?.length === 0 && <TranscriptState title={l("这场会谈还没有可回看的消息", "This session has no messages to review")} />}
                {!isLoadingMessages && !messagesError && activeMessages && activeMessages.slice(0, 8).map((item) => (
                  <RecordMessage
                    counselorId={activeSession.counselorId}
                    counselorName={getCounselorName(activeSession.counselorId, locale)}
                    key={item.id}
                    message={item}
                    profileName={profile.displayName}
                    userAvatarSrc={profile.avatarDataUrl}
                  />
                ))}
              </div>
              <footer>
                {activeMessages && activeMessages.length > 0 && <button onClick={() => openRecordReader(activeSession.id)} type="button">{l("打开完整记录", "Open full record")}</button>}
              </footer>
            </article>
          ) : <ArchiveState message={l("从列表中选择一场会谈，这里会显示原始记录。", "Choose a session from the list to preview its original record.")} title={l("选择一场会谈", "Choose a session")} />}
        </aside>
          </>
        )}
      </div>

      <footer className="consultation-records-studio-footer">
        <StudioSignature label="CONSULTATION ARCHIVE" />
        <p>{l("会谈记录仅保存在这台设备中", "Session records are stored only on this device")}</p>
      </footer>

      {actionError && <p className="consultation-record-action-error" role="alert">{actionError}</p>}
      {renameSession && (
        <div aria-label={l("重命名会谈", "Rename session")} aria-modal="true" className="consultation-record-rename-backdrop" role="dialog">
          <form className="consultation-record-rename-dialog" onSubmit={(event) => { event.preventDefault(); void saveRename(); }}>
            <h3>{l("重命名会谈", "Rename session")}</h3>
            <label>
              <span>{l("会谈名称", "Session title")}</span>
              <input autoFocus onChange={(event) => setRenameDraft(event.target.value)} value={renameDraft} />
            </label>
            <footer>
              <button onClick={() => setRenameSession(null)} type="button">{l("取消", "Cancel")}</button>
              <button type="submit">{l("保存", "Save")}</button>
            </footer>
          </form>
        </div>
      )}
      {deleteSessionCandidate && (
        <div aria-label={l("删除会谈确认", "Confirm session deletion")} aria-modal="true" className="consultation-record-delete-backdrop" role="dialog">
          <div className="consultation-record-delete-dialog">
            <span aria-hidden="true" className="consultation-record-delete-icon">!</span>
            <div>
              <p>{l("删除会谈记录", "Delete session record")}</p>
              <h3>{l(`确认删除“${deleteSessionCandidate.title}”吗？`, `Delete “${deleteSessionCandidate.title}”?`)}</h3>
              <span>{l("删除后无法恢复，这台设备上的对应记录也会一并移除。", "This cannot be undone. The corresponding record will be removed from this device.")}</span>
            </div>
            <footer>
              <button onClick={() => setDeleteSessionCandidate(null)} type="button">{l("取消", "Cancel")}</button>
              <button className="danger" onClick={() => void confirmDelete()} type="button">{l("确认删除", "Delete")}</button>
            </footer>
          </div>
        </div>
      )}
      {readerSession && createPortal(
        <ConsultationRecordReader
          counselorName={getCounselorName(readerSession.counselorId, locale)}
          messages={readerMessages}
          onClose={() => setReaderSessionId(null)}
          profileName={profile.displayName}
          session={readerSession}
          userAvatarSrc={profile.avatarDataUrl}
        />,
        document.body
      )}
    </section>
  );
}

function ConsultationRecordReader({ counselorName, messages, onClose, profileName, session, userAvatarSrc }: { counselorName: string; messages: SessionMessage[] | undefined; onClose: () => void; profileName: string; session: CounselingSession; userAvatarSrc?: string }) {
  const { locale, l } = useLingua();
  return (
    <div aria-label={l("完整会谈记录阅读器", "Full session-record reader")} className="consultation-record-reader-backdrop" onClick={onClose} role="presentation">
      <article aria-label={l(`${session.title}完整会谈记录`, `Full record of ${session.title}`)} aria-modal="true" className="consultation-record-reader lobby-overlay-panel lobby-overlay-studio-surface" onClick={(event) => event.stopPropagation()} role="dialog">
        <span aria-hidden="true" className="lobby-studio-frame-skin">
          <span className="lobby-studio-frame-slice is-top-left" /><span className="lobby-studio-frame-slice is-top" /><span className="lobby-studio-frame-slice is-top-right" />
          <span className="lobby-studio-frame-slice is-left" /><span className="lobby-studio-frame-slice is-right" />
          <span className="lobby-studio-frame-slice is-bottom-left" /><span className="lobby-studio-frame-slice is-bottom" /><span className="lobby-studio-frame-slice is-bottom-right" />
        </span>
        <button aria-label={l("关闭完整会谈记录", "Close full session record")} className="lobby-overlay-close" onClick={onClose} type="button">×</button>
        <div className="consultation-record-reader-paper lobby-overlay-paper">
          <header className="consultation-record-reader-header">
            <button className="consultation-record-reader-back" onClick={onClose} type="button">← {l("返回会谈列表", "Back to sessions")}</button>
            <div>
              <p>{l("会谈完整记录", "Complete session record")}</p>
              <h2>{session.title}</h2>
              <span>{counselorName} · {formatReadableDate(session.endedAt ?? session.updatedAt, locale)} · {formatDuration(session, locale)} · {l(`${messages?.length ?? "…"}条消息`, `${messages?.length ?? "…"} messages`)}</span>
            </div>
          </header>
          <div className="consultation-record-reader-divider" />
          <div className="consultation-record-reader-transcript" aria-live="polite">
            {messages === undefined && <TranscriptState title={l("正在读取完整会谈记录……", "Loading the complete session record…")} />}
            {messages?.length === 0 && <TranscriptState title={l("这场会谈还没有可回看的消息", "This session has no messages to review")} />}
            {messages?.map((item) => <RecordMessage counselorId={session.counselorId} counselorName={counselorName} key={item.id} message={item} profileName={profileName} userAvatarSrc={userAvatarSrc} />)}
          </div>
          <footer className="consultation-record-reader-footer">{l("记录仅保存在这台设备中", "This record is stored only on this device")}</footer>
        </div>
      </article>
    </div>
  );
}

function ArchiveNotebookIcon() {
  return (
    <span aria-hidden="true" className="consultation-record-all-icon">
      <svg fill="none" viewBox="0 0 32 32">
        <path d="M9.5 6.5h11.3a2.7 2.7 0 0 1 2.7 2.7v13.6a2.7 2.7 0 0 1-2.7 2.7H9.5a2.7 2.7 0 0 1-2.7-2.7V9.2a2.7 2.7 0 0 1 2.7-2.7Z" fill="#F9F2E1" stroke="currentColor" strokeWidth="1.7" />
        <path d="M11.2 5.2v3.2M11.2 23.6v3.2M15.4 12h4.8M15.4 16h4.8M15.4 20h3.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
        <path d="M8.2 10.8h3M8.2 15.9h3M8.2 21h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    </span>
  );
}

function RecordMessage({ counselorId, counselorName, message, profileName, userAvatarSrc }: { counselorId: string; counselorName: string; message: SessionMessage; profileName: string; userAvatarSrc?: string }) {
  const { l } = useLingua();
  const isCounselor = message.role === "assistant";
  const name = isCounselor ? counselorName : profileName.trim() || l("我", "Me");
  const avatar = isCounselor
    ? <img alt={l(`${name}头像`, `${name}'s avatar`)} src={getCounselorDialogueAvatar(counselorId)} />
    : userAvatarSrc
      ? <img alt={l(`${name}头像`, `${name}'s avatar`)} src={userAvatarSrc} />
      : <span aria-hidden="true" className="consultation-record-message-avatar-text">{name.slice(0, 1)}</span>;
  const copy = (
    <div className="consultation-record-message-copy">
      <span>{name}</span>
      <p>{message.content || "……"}</p>
    </div>
  );
  return (
    <article className={isCounselor ? "consultation-record-message counselor" : "consultation-record-message visitor"}>
      {isCounselor ? <>{avatar}{copy}</> : <>{copy}{avatar}</>}
    </article>
  );
}

function ArchiveState({ actionLabel, message, onAction, title }: { actionLabel?: string; message?: string; onAction?: () => void; title: string }) {
  return <div className="consultation-record-state" role="status"><span aria-hidden="true">⌁</span><h3>{title}</h3>{message && <p>{message}</p>}{actionLabel && onAction && <button onClick={onAction} type="button">{actionLabel}</button>}</div>;
}

function TranscriptState({ actionLabel, message, onAction, title }: { actionLabel?: string; message?: string; onAction?: () => void; title: string }) {
  return <div className="consultation-record-transcript-state" role="status"><strong>{title}</strong>{message && <p>{message}</p>}{actionLabel && onAction && <button onClick={onAction} type="button">{actionLabel}</button>}</div>;
}

function toCounselingSession(session: { messages?: SessionMessage[]; time?: string; preview?: string; messagesLoaded?: boolean } & CounselingSession): CounselingSession { return session; }
function getCounselorName(counselorId: string, locale: SupportedLocale) { return getDefaultCounselors(locale).find((counselor) => counselor.id === counselorId)?.name ?? (locale === "en-US" ? "Counselor" : "咨询师"); }
function sortSessionsNewestFirst(a: CounselingSession, b: CounselingSession) { return new Date(b.endedAt ?? b.updatedAt ?? 0).getTime() - new Date(a.endedAt ?? a.updatedAt ?? 0).getTime(); }
function formatDate(value: string | undefined, locale: SupportedLocale) { const parsed = value ? new Date(value) : null; return parsed && !Number.isNaN(parsed.getTime()) ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(parsed) : locale === "en-US" ? "Just now" : "刚刚"; }
function formatReadableDate(value: string | undefined, locale: SupportedLocale) { const parsed = value ? new Date(value) : null; return parsed && !Number.isNaN(parsed.getTime()) ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }).format(parsed) : locale === "en-US" ? "Just now" : "刚刚"; }
function formatDuration(session: CounselingSession, locale: SupportedLocale) { const start = new Date(session.startedAt ?? session.createdAt ?? session.updatedAt ?? 0).getTime(); const end = new Date(session.endedAt ?? session.updatedAt ?? session.createdAt ?? start).getTime(); const minutes = Math.max(1, Math.round((end - start) / 60000)); return locale === "en-US" ? `${minutes} min` : `${minutes}分钟`; }
