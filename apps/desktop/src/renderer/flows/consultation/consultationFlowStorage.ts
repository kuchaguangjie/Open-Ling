import type { ConsultationFlowState, ConsultationFlowSurface } from "./consultationFlowMachine";

export const activeConsultationFlowStorageKey = "ling.consultationFlow.active.v1";
const activeConsultationFlowVersion = 1;

export function readActiveConsultationFlow(): ConsultationFlowState | null {
  try {
    const raw = window.localStorage.getItem(activeConsultationFlowStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !isRecord(parsed) ||
      parsed.version !== activeConsultationFlowVersion ||
      typeof parsed.sessionId !== "string" ||
      !parsed.sessionId.trim() ||
      typeof parsed.counselorId !== "string" ||
      !parsed.counselorId.trim() ||
      (parsed.script !== "first" && parsed.script !== "second" && parsed.script !== "returning")
    ) {
      return null;
    }
    const surface = parseSurface(parsed.surface);
    if (!surface) return null;
    const closingCycle = parseClosingCycle(parsed.closingCycle);
    if (parsed.closingCycle !== undefined && !closingCycle) return null;
    return {
      counselorId: parsed.counselorId,
      sessionId: parsed.sessionId,
      script: parsed.script,
      surface,
      ...(closingCycle ? { closingCycle } : {})
    };
  } catch {
    return null;
  }
}

function parseSurface(value: unknown): ConsultationFlowSurface | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  switch (value.kind) {
    case "arrival":
      return { kind: value.kind };
    case "opening":
    case "starting":
    case "cancelling":
    case "closing":
      return isLineIndex(value.lineIndex) ? { kind: value.kind, lineIndex: value.lineIndex } : null;
    case "session":
    case "ending":
    case "closing-menu":
      return { kind: value.kind };
    case "closing-notice":
      return value.reason === "letter-pending" || value.reason === "letter-failed" || value.reason === "letter-unknown"
        ? { kind: value.kind, reason: value.reason }
        : null;
    case "history":
    case "letter":
      return value.origin === "closing" || value.origin === "archive"
        ? { kind: value.kind, origin: value.origin }
        : null;
    default:
      return null;
  }
}

function parseClosingCycle(value: unknown): ConsultationFlowState["closingCycle"] | null {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.cycleId !== "string" || !value.cycleId.trim()) return null;
  if (value.endedAt !== undefined && typeof value.endedAt !== "string") return null;
  return { cycleId: value.cycleId, ...(value.endedAt ? { endedAt: value.endedAt } : {}) };
}

function isLineIndex(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 10_000;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function writeActiveConsultationFlow(flow: ConsultationFlowState) {
  try {
    window.localStorage.setItem(
      activeConsultationFlowStorageKey,
      JSON.stringify({ version: activeConsultationFlowVersion, ...flow })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearActiveConsultationFlow() {
  try {
    window.localStorage.removeItem(activeConsultationFlowStorageKey);
    return window.localStorage.getItem(activeConsultationFlowStorageKey) === null ? "cleared" : "still-present";
  } catch {
    return "unavailable";
  }
}
