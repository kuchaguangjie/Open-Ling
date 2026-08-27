import type { CounselingStreamEvent, CounselingStreamRequest, IpcFailure, IpcSuccess } from "@shared/index";

const activeDevStreams = new Map<string, AbortController>();

export async function streamDevCounselingMessage(
  request: CounselingStreamRequest,
  handlers: { onEvent: (event: CounselingStreamEvent) => void }
): Promise<IpcSuccess<{ requestId: string }> | IpcFailure> {
  const controller = new AbortController();
  activeDevStreams.set(request.requestId, controller);

  try {
    const response = await fetch("/__ling_dev/counseling/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      return {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "网页测试连接失败，请检查本地 dev server。" }
      };
    }

    await readStreamEvents(response, handlers.onEvent);
    return { ok: true, data: { requestId: request.requestId } };
  } catch {
    if (controller.signal.aborted) {
      handlers.onEvent({ requestId: request.requestId, type: "status", status: "cancelled" });
      return { ok: true, data: { requestId: request.requestId } };
    }
    return {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "网页测试连接失败，请检查本地 dev server。" }
    };
  } finally {
    activeDevStreams.delete(request.requestId);
  }
}

export function cancelDevCounselingStream(requestId: string) {
  activeDevStreams.get(requestId)?.abort();
}

async function readStreamEvents(response: Response, onEvent: (event: CounselingStreamEvent) => void) {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const event = parseEventLine(line);
      if (event) onEvent(event);
    }
  }

  const event = parseEventLine(buffer);
  if (event) onEvent(event);
}

function parseEventLine(line: string): CounselingStreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as CounselingStreamEvent;
  } catch {
    return null;
  }
}
