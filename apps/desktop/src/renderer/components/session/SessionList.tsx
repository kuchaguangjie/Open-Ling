import { type ReactNode, useEffect, useRef, useState } from "react";
import { getDefaultCounselors } from "@shared/index";
import { useAppStore } from "../../stores/appStore";
import { useSessionStore } from "../../stores/sessionStore";
import { useConsultationFlowStore } from "../../flows/consultation/consultationFlowStore";
import compactLogo from "../../../../../../assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-v1.png";
import { useLingua } from "../../localization/useLingua";

export function SessionList({
  onOpenSettings,
  onRequestNewConsultation,
  roomActions
}: {
  onOpenSettings: () => void;
  onRequestNewConsultation: () => void;
  roomActions?: ReactNode;
}) {
  const { locale, t } = useLingua();
  const counselors = getDefaultCounselors(locale);
  const activePage = useAppStore((state) => state.activePage);
  const {
    activeSessionId,
    activeStreamRequestId,
    currentCounselorId,
    deleteSession,
    expandedHistoryCounselorId,
    isSidebarCollapsed,
    newSessionError,
    renameSession,
    searchQuery,
    sessions,
    setSearchQuery,
    toggleHistoryForCounselor,
    toggleSidebar
  } = useSessionStore();
  const openPersistedSession = useConsultationFlowStore((state) => state.openPersistedSession);
  const activeFlow = useConsultationFlowStore((state) => state.flow);
  const flowBusy = useConsultationFlowStore((state) => state.isBusy);
  const navigationBusy = Boolean(activeStreamRequestId) || flowBusy;
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInFlight = useRef<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const counselorSessions = sessions
    .filter((session) => session.counselorId === currentCounselorId)
    .sort(sortSessionsNewestFirst);
  const getLocalizedSessionSubtitle = (session: { counselorId?: string; status?: string }) => {
    const counselorName = counselors.find((item) => item.id === session.counselorId)?.name ?? t("common.counselor");
    return `${counselorName} · ${t(session.status === "ended" ? "session.ended" : "session.active")}`;
  };
  const currentSession = counselorSessions.find((session) => session.id === activeSessionId);
  const historicalSessions = counselorSessions.filter(
    (session) => session.id !== activeSessionId && session.status !== "draft"
  );
  const historyExpanded = expandedHistoryCounselorId === currentCounselorId;
  const filteredHistory = historicalSessions.filter((session) => {
    const query = searchQuery.trim();
    if (!query) return true;
    return `${session.title} ${getLocalizedSessionSubtitle(session)}`.includes(query);
  });

  useEffect(() => {
    setSearchQuery("");
  }, [currentCounselorId, setSearchQuery]);

  useEffect(() => {
    if (!contextMenu) return;
    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("click", closeMenu);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", closeMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  function startRename(sessionId: string, currentTitle: string) {
    setRenamingSessionId(sessionId);
    setRenameDraft(currentTitle);
    setContextMenu(null);
  }

  async function commitRename(sessionId: string) {
    if (renameInFlight.current === sessionId) return;
    const nextTitle = renameDraft.trim();
    if (!nextTitle) {
      setRenamingSessionId(null);
      setRenameDraft("");
      return;
    }
    renameInFlight.current = sessionId;
    setSessionActionError(null);
    const result = await renameSession(sessionId, nextTitle);
    renameInFlight.current = null;
    if (!result.ok) {
      setSessionActionError(result.message);
      return;
    }
    setRenamingSessionId(null);
    setRenameDraft("");
  }

  function requestNewConsultationFromSidebar() {
    setSessionActionError(null);
    useSessionStore.setState({ newSessionError: undefined });
    if (navigationBusy) return;
    if (activeFlow?.surface.kind !== "session") return;
    onRequestNewConsultation();
  }

  async function confirmDelete(sessionId: string, title: string) {
    setContextMenu(null);
    if (sessionId === activeSessionId || deletingSessionId) return;
    if (!window.confirm(t("session.deleteConfirm").replace("{title}", title))) return;
    setDeletingSessionId(sessionId);
    setSessionActionError(null);
    const result = await deleteSession(sessionId);
    if (!result.ok) setSessionActionError(result.message);
    setDeletingSessionId(null);
  }

  const compactSidebar = (
      <aside className="session-sidebar collapsed" aria-label={t("session.navigation")}>
        <img alt={t("brand.studio")} className="collapsed-brand-logo" src={compactLogo} />
        <div className="collapsed-sidebar-actions" aria-label={t("session.tools")}>
          <button
            className="sidebar-icon-button"
            disabled={navigationBusy}
            type="button"
            aria-label={t("session.newAria")}
            onClick={requestNewConsultationFromSidebar}
          >
            <span aria-hidden="true" className="sidebar-icon-glyph">＋</span>
            <span className="sidebar-icon-tooltip" role="tooltip"><strong>{t("session.new")}</strong><small>{t("session.newHint")}</small></span>
          </button>
          <button
            aria-controls="session-history-drawer"
            aria-expanded={!isSidebarCollapsed}
            className={!isSidebarCollapsed ? "sidebar-icon-button active" : "sidebar-icon-button"}
            disabled={navigationBusy}
            type="button"
            aria-label={t("features.records.title")}
            onClick={toggleSidebar}
          >
            <span aria-hidden="true" className="sidebar-icon-glyph">◷</span>
            <span className="sidebar-icon-tooltip" role="tooltip"><strong>{t("features.records.title")}</strong><small>{t("session.recordsHint")}</small></span>
          </button>
          <button
            className={activePage === "settings" ? "sidebar-icon-button active" : "sidebar-icon-button"}
            disabled={navigationBusy}
            type="button"
            aria-label={t("session.settings")}
            onClick={onOpenSettings}
          >
            <span aria-hidden="true" className="sidebar-icon-glyph">⚙</span>
            <span className="sidebar-icon-tooltip" role="tooltip"><strong>{t("session.settings")}</strong><small>{t("session.settingsHint")}</small></span>
          </button>
        </div>
        <span aria-hidden="true" className="collapsed-sidebar-spacer" />
        {roomActions}
        {(newSessionError || sessionActionError) && (
          <p className="collapsed-sidebar-error" role="alert">
            {sessionActionError ?? newSessionError}
          </p>
        )}
      </aside>
  );

  return (
    <>
      {compactSidebar}
      {!isSidebarCollapsed && <aside className="session-sidebar history-drawer" id="session-history-drawer" aria-label={t("features.records.title")}>
      <header className="history-drawer-header">
        <div><p className="eyebrow">{t("session.localSessions")}</p><h2>{t("features.records.title")}</h2></div>
        <div>
          <span className="local-badge">{t("session.localSaved")}</span>
          <button
            aria-label={t("session.closeRecords")}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              useSessionStore.setState({ isSidebarCollapsed: true });
            }}
            type="button"
          >
            ×
          </button>
        </div>
      </header>
      {newSessionError && (
        <p className="new-session-error" role="alert">
          {newSessionError}
        </p>
      )}
      {sessionActionError && (
        <p className="new-session-error" role="alert">
          {sessionActionError}
        </p>
      )}
      <div className="session-list">
        <p className="session-section-label">{t("history.current")}</p>
        {!currentSession && (
          <div className="session-list-empty">
            <p>{t("session.noCurrent")}</p>
          </div>
        )}
        {currentSession && renderSession(currentSession)}
        <button
          aria-expanded={historyExpanded}
          className="session-history-disclosure"
          onClick={() => toggleHistoryForCounselor(currentCounselorId)}
          type="button"
        >
          <span>{t("session.historyCount").replace("{count}", String(historicalSessions.length))}</span>
          <span aria-hidden="true">{historyExpanded ? "⌃" : "⌄"}</span>
        </button>
        {historyExpanded && (
          <label className="session-search">
            <span className="sr-only">{t("session.searchAria")}</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("session.searchPlaceholder")}
              value={searchQuery}
            />
          </label>
        )}
        {historyExpanded && filteredHistory.length === 0 && (
          <div className="session-list-empty">
            <p>{t(historicalSessions.length === 0 ? "session.noOther" : "session.noMatch")}</p>
          </div>
        )}
        {historyExpanded && filteredHistory.map((session) => renderSession(session))}
      </div>
      {contextMenu && (
        <div
          className="session-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              const session = sessions.find((item) => item.id === contextMenu.sessionId);
              if (session) startRename(session.id, session.title);
            }}
          >
            {t("session.rename")}
          </button>
          {contextMenu.sessionId !== activeSessionId && (
            <button
              className="danger"
              disabled={Boolean(deletingSessionId)}
              role="menuitem"
              type="button"
              onClick={() => {
                const session = sessions.find((item) => item.id === contextMenu.sessionId);
                if (session) void confirmDelete(session.id, session.title);
              }}
            >
              {t("session.delete")}
            </button>
          )}
        </div>
      )}
      </aside>}
    </>
  );

  function renderSession(session: (typeof sessions)[number]) {
    const isRenaming = renamingSessionId === session.id;
    const sessionContent = (
      <>
        <span className="session-row-main">
          {isRenaming ? (
            <input
              aria-label={t("session.renameInput")}
              autoFocus
              className="session-rename-input"
              onBlur={() => void commitRename(session.id)}
              onChange={(event) => setRenameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitRename(session.id);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setRenamingSessionId(null);
                  setRenameDraft("");
                }
              }}
              value={renameDraft}
            />
          ) : (
            <span className="session-title">{session.title}</span>
          )}
          <small>{session.time}</small>
        </span>
        <span className="session-preview">{getLocalizedSessionSubtitle(session)}</span>
      </>
    );
    return (
      <div
        className={session.id === activeSessionId ? "session-item active" : "session-item"}
        key={session.id}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu({ sessionId: session.id, x: event.clientX, y: event.clientY });
        }}
      >
        {isRenaming ? (
          <div className="session-item-main">{sessionContent}</div>
        ) : (
          <button
            className="session-item-main"
            disabled={navigationBusy}
            onClick={() => {
              setSessionActionError(null);
              useSessionStore.setState({ newSessionError: undefined });
              openPersistedSession({ counselorId: session.counselorId, sessionId: session.id, status: session.status });
            }}
            type="button"
          >
            {sessionContent}
          </button>
        )}
              {!isRenaming && (
                <button
                  aria-label={t("session.actions").replace("{title}", session.title)}
                  className="session-options-button"
                  disabled={navigationBusy}
                  onClick={(event) => {
                    event.stopPropagation();
                    const rect = event.currentTarget.getBoundingClientRect();
                    setContextMenu({ sessionId: session.id, x: rect.right - 118, y: rect.bottom + 4 });
                  }}
                  type="button"
                >
                  ⋯
                </button>
              )}
              {session.id !== activeSessionId && (
                <button
                  aria-label={t("session.deleteAria").replace("{title}", session.title)}
                  className="session-delete-button"
                  disabled={deletingSessionId === session.id}
                  onClick={() => void confirmDelete(session.id, session.title)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              )}
      </div>
    );
  }
}

function sortSessionsNewestFirst(a: { updatedAt?: string; endedAt?: string; createdAt?: string }, b: { updatedAt?: string; endedAt?: string; createdAt?: string }) {
  return sessionTimestamp(b) - sessionTimestamp(a);
}

function sessionTimestamp(session: { updatedAt?: string; endedAt?: string; createdAt?: string }) {
  const value = session.updatedAt ?? session.endedAt ?? session.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8m-6 3v6m4-6v6M9 5h6l1 2h4M4 7h16m-2 0-1 13H7L6 7" />
    </svg>
  );
}
