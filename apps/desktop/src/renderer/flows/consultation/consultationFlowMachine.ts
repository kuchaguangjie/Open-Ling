import type { SessionStatus } from "@shared/index";

export type ConsultationFlowSurface =
  | { kind: "arrival" }
  | { kind: "opening"; lineIndex: number }
  | { kind: "starting"; lineIndex: number }
  | { kind: "cancelling"; lineIndex: number }
  | { kind: "session" }
  | { kind: "ending" }
  | { kind: "closing"; lineIndex: number }
  | { kind: "closing-menu" }
  | { kind: "closing-notice"; reason: "letter-pending" | "letter-failed" | "letter-unknown" }
  | { kind: "history"; origin: "closing" | "archive" }
  | { kind: "letter"; origin: "closing" | "archive" };

/**
 * Screens a client can be on, with a session already ended, where "continue
 * this session" is a legitimate move. Kept next to the surface union so adding
 * a closing-family screen forces a look at this list.
 */
export const RESUMABLE_SURFACE_KINDS = ["closing", "closing-menu", "closing-notice", "history"] as const satisfies readonly ConsultationFlowSurface["kind"][];

export function isResumableSurface(surface: ConsultationFlowSurface) {
  return (RESUMABLE_SURFACE_KINDS as readonly string[]).includes(surface.kind);
}

export type ConsultationOpeningScript = "first" | "second" | "returning";

export interface ConsultationFlowState {
  counselorId: string;
  sessionId: string;
  script: ConsultationOpeningScript;
  surface: ConsultationFlowSurface;
  closingCycle?: { cycleId: string; endedAt?: string };
}

export type ConsultationFlowEvent =
  | { type: "ARRIVAL_FINISHED" }
  | { type: "OPENING_NEXT"; lineCount: number }
  | { type: "OPENING_SKIP" }
  | { type: "START_SUCCEEDED" }
  | { type: "START_FAILED" }
  | { type: "END_REQUESTED"; cycleId: string }
  | { type: "END_SUCCEEDED"; endedAt: string }
  | { type: "END_FAILED" }
  | { type: "CLOSING_NEXT"; lineCount: number }
  | { type: "CLOSING_SKIP" }
  | { type: "OPEN_HISTORY" }
  | { type: "RETURN_TO_CLOSING" }
  | { type: "OPEN_LETTER_READY" }
  | { type: "SHOW_LETTER_PENDING" }
  | { type: "SHOW_LETTER_FAILED" }
  | { type: "SHOW_LETTER_UNKNOWN" }
  | { type: "NOTICE_FINISHED" }
  | { type: "CLOSE_LETTER" };

export function createOpeningFlow(input: {
  counselorId: string;
  sessionId: string;
  script: ConsultationOpeningScript;
}): ConsultationFlowState {
  return { ...input, surface: { kind: "arrival" } };
}

export function transitionConsultationFlow(
  state: ConsultationFlowState,
  event: ConsultationFlowEvent
): ConsultationFlowState {
  switch (event.type) {
    case "ARRIVAL_FINISHED":
      return state.surface.kind === "arrival"
        ? { ...state, surface: { kind: "opening", lineIndex: 0 } }
        : state;
    case "OPENING_NEXT":
      if (state.surface.kind !== "opening") return state;
      if (state.surface.lineIndex < event.lineCount - 1) {
        return { ...state, surface: { kind: "opening", lineIndex: state.surface.lineIndex + 1 } };
      }
      return { ...state, surface: { kind: "starting", lineIndex: state.surface.lineIndex } };
    case "OPENING_SKIP":
      if (state.surface.kind !== "opening") return state;
      return { ...state, surface: { kind: "starting", lineIndex: state.surface.lineIndex } };
    case "START_SUCCEEDED":
      return state.surface.kind === "starting" ? { ...state, surface: { kind: "session" } } : state;
    case "START_FAILED":
      return state.surface.kind === "starting"
        ? { ...state, surface: { kind: "opening", lineIndex: state.surface.lineIndex } }
        : state;
    case "END_REQUESTED":
      if (state.surface.kind !== "session") return state;
      return { ...state, surface: { kind: "ending" }, closingCycle: { cycleId: event.cycleId } };
    case "END_SUCCEEDED":
      if (state.surface.kind !== "ending" || !state.closingCycle) return state;
      return {
        ...state,
        surface: { kind: "closing", lineIndex: 0 },
        closingCycle: { ...state.closingCycle, endedAt: event.endedAt }
      };
    case "END_FAILED":
      return state.surface.kind === "ending" ? { ...state, surface: { kind: "session" }, closingCycle: undefined } : state;
    case "CLOSING_NEXT":
      if (state.surface.kind !== "closing") return state;
      if (state.surface.lineIndex < event.lineCount - 1) {
        return { ...state, surface: { kind: "closing", lineIndex: state.surface.lineIndex + 1 } };
      }
      return { ...state, surface: { kind: "closing-menu" } };
    case "CLOSING_SKIP":
      return state.surface.kind === "closing" ? { ...state, surface: { kind: "closing-menu" } } : state;
    case "OPEN_HISTORY":
      return state.surface.kind === "closing-menu" || state.surface.kind === "closing" || state.surface.kind === "closing-notice"
        ? { ...state, surface: { kind: "history", origin: "closing" } }
        : state;
    case "RETURN_TO_CLOSING":
      return state.surface.kind === "history" && state.surface.origin === "closing"
        ? { ...state, surface: { kind: "closing-menu" } }
        : state;
    case "OPEN_LETTER_READY":
      return state.surface.kind === "closing-menu" || state.surface.kind === "closing-notice"
        ? { ...state, surface: { kind: "letter", origin: "closing" } }
        : state;
    case "SHOW_LETTER_PENDING":
      return state.surface.kind === "closing-menu" || state.surface.kind === "closing-notice"
        ? { ...state, surface: { kind: "closing-notice", reason: "letter-pending" } }
        : state;
    case "SHOW_LETTER_FAILED":
      return state.surface.kind === "closing-menu" || state.surface.kind === "closing-notice"
        ? { ...state, surface: { kind: "closing-notice", reason: "letter-failed" } }
        : state;
    case "SHOW_LETTER_UNKNOWN":
      return state.surface.kind === "closing-menu" || state.surface.kind === "closing-notice"
        ? { ...state, surface: { kind: "closing-notice", reason: "letter-unknown" } }
        : state;
    case "NOTICE_FINISHED":
      return state.surface.kind === "closing-notice" ? { ...state, surface: { kind: "closing-menu" } } : state;
    case "CLOSE_LETTER":
      return state.surface.kind === "letter"
        ? { ...state, surface: state.surface.origin === "closing" ? { kind: "closing-menu" } : { kind: "history", origin: "archive" } }
        : state;
  }
}

export function reconcileConsultationFlow(
  state: ConsultationFlowState,
  session: { status: SessionStatus; endedAt?: string }
): ConsultationFlowState {
  if (session.status === "draft") {
    if (state.surface.kind === "arrival" || state.surface.kind === "opening") return state;
    const lineIndex = "lineIndex" in state.surface ? state.surface.lineIndex : 0;
    return { ...state, surface: { kind: "opening", lineIndex }, closingCycle: undefined };
  }
  if (session.status === "active") {
    return { ...state, surface: { kind: "session" }, closingCycle: undefined };
  }
  const cycleMatches = Boolean(
    state.closingCycle?.endedAt && session.endedAt && state.closingCycle.endedAt === session.endedAt
  );
  if (state.surface.kind === "ending" || cycleMatches) {
    return {
      ...state,
      surface: state.surface.kind === "ending" ? { kind: "closing", lineIndex: 0 } : state.surface,
      closingCycle: state.closingCycle
        ? { ...state.closingCycle, endedAt: session.endedAt ?? state.closingCycle.endedAt }
        : undefined
    };
  }
  return { ...state, surface: { kind: "history", origin: "archive" }, closingCycle: undefined };
}
