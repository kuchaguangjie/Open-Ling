import type {
  CounselingMemorySnapshot,
  CounselingSession
} from "../../../../../packages/shared/src/index.js";

export interface SessionMemoContext {
  consultationMemo?: string;
  sourceMemoId?: string;
}

export async function loadOrCreateSessionMemoryContext({
  session,
  enabled,
  loadCurrentContext,
  saveSnapshot,
  now = new Date().toISOString()
}: {
  session: CounselingSession;
  enabled: boolean;
  loadCurrentContext: () => Promise<SessionMemoContext>;
  saveSnapshot: (snapshot: CounselingMemorySnapshot) => Promise<void>;
  now?: string;
}): Promise<SessionMemoContext> {
  if (session.memorySnapshot) {
    return readSessionMemoSnapshot(session.memorySnapshot);
  }

  const context = enabled ? await loadCurrentContext() : {};
  const snapshot = createSessionMemoSnapshot(context, enabled, now);
  await saveSnapshot(snapshot);
  return readSessionMemoSnapshot(snapshot);
}

export function createSessionMemoSnapshot(
  context: SessionMemoContext,
  enabled: boolean,
  createdAt: string
): CounselingMemorySnapshot {
  return {
    version: 2,
    enabled,
    ...(enabled && context.consultationMemo?.trim()
      ? { consultationMemo: context.consultationMemo.trim() }
      : {}),
    ...(enabled && context.sourceMemoId?.trim() ? { sourceMemoId: context.sourceMemoId.trim() } : {}),
    createdAt
  };
}

export function readSessionMemoSnapshot(snapshot: CounselingMemorySnapshot): SessionMemoContext {
  if (snapshot.version !== 2 || !snapshot.enabled) return {};
  return {
    ...(snapshot.consultationMemo?.trim() ? { consultationMemo: snapshot.consultationMemo.trim() } : {}),
    ...(snapshot.sourceMemoId?.trim() ? { sourceMemoId: snapshot.sourceMemoId.trim() } : {})
  };
}
