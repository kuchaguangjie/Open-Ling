import type { ActiveCounselingStream, CounselingSession, CounselingStreamRequest } from "../../../../../packages/shared/src/index.js";

interface ActiveCounselingRuntime extends ActiveCounselingStream {
  controller: AbortController;
}

/**
 * Serializes short operations that must be checked and committed as one logical unit.
 * Different keys still run concurrently, while a failed operation never blocks the queue.
 */
export class KeyedExclusiveQueue {
  private readonly tails = new Map<string, Promise<void>>();

  async run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.tails.set(key, tail);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

export class SessionRuntimeCoordinator {
  private readonly streamsByRequest = new Map<string, ActiveCounselingRuntime>();
  private readonly requestBySession = new Map<string, string>();
  private readonly mutations = new Set<string>();

  beginMutation(sessionId: string) {
    if (this.mutations.has(sessionId) || this.requestBySession.has(sessionId)) return false;
    this.mutations.add(sessionId);
    return true;
  }

  finishMutation(sessionId: string) {
    this.mutations.delete(sessionId);
  }

  beginStream(sessionId: string, requestId: string, controller: AbortController) {
    if (
      this.streamsByRequest.has(requestId) ||
      this.mutations.has(sessionId) ||
      this.requestBySession.has(sessionId)
    ) {
      return false;
    }
    this.requestBySession.set(sessionId, requestId);
    this.streamsByRequest.set(requestId, { requestId, sessionId, controller });
    return true;
  }

  finishStream(sessionId: string, requestId: string) {
    if (this.requestBySession.get(sessionId) === requestId) this.requestBySession.delete(sessionId);
    const runtime = this.streamsByRequest.get(requestId);
    if (runtime?.sessionId === sessionId) this.streamsByRequest.delete(requestId);
  }

  getActiveStream(sessionId: string): ActiveCounselingStream | null {
    const requestId = this.requestBySession.get(sessionId);
    return requestId ? { requestId, sessionId } : null;
  }

  hasActiveStreams() {
    return this.streamsByRequest.size > 0;
  }

  abort(requestId: string) {
    const runtime = this.streamsByRequest.get(requestId);
    runtime?.controller.abort();
    return Boolean(runtime);
  }
}

export function validateCounselingStreamTarget(
  session: Pick<CounselingSession, "status" | "counselorId" | "teamId">,
  request: Pick<CounselingStreamRequest, "counselorId" | "teamId">
) {
  if (session.status !== "active") return "这场咨询当前不能发送消息。若已结束，请先选择“继续咨询”。";
  if (request.counselorId && request.counselorId !== session.counselorId) return "当前咨询师与这场会谈的记录不一致。请返回等待室并重新进入；不要继续发送。";
  if (request.teamId && session.teamId && request.teamId !== session.teamId) return "当前会谈支持配置与记录不一致。请返回等待室并重新进入；不要继续发送。";
  return null;
}
