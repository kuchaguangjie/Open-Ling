export const welcomeStorageKey = "ling.lobby.hasSeenWelcome";
export const receptionDutyStorageKey = "ling.lobby.receptionDuty.v1";

export type ReceptionCounselorId = "chengling" | "zhouzhou" | "linleshui";

export interface ReceptionDutyState {
  version: 1;
  firstVisitDate: string;
  dutyDate: string;
  dutyCounselorId: ReceptionCounselorId;
  handoffFromCounselorId?: ReceptionCounselorId;
  handoffSessionId?: string;
  handoffShownSessionId?: string;
  recentSmallTalkTopicIds: string[];
  seenReceptionCounselorIds: ReceptionCounselorId[];
  smallTalkPrivacySeen?: boolean;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readReceptionDutyState(): ReceptionDutyState | null {
  try {
    const raw = window.localStorage.getItem(receptionDutyStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReceptionDutyState>;
    if (
      parsed.version !== 1 ||
      typeof parsed.firstVisitDate !== "string" ||
      typeof parsed.dutyDate !== "string" ||
      !isReceptionCounselorId(parsed.dutyCounselorId)
    ) {
      return null;
    }
    return {
      version: 1,
      firstVisitDate: parsed.firstVisitDate,
      dutyDate: parsed.dutyDate,
      dutyCounselorId: parsed.dutyCounselorId,
      handoffFromCounselorId: isReceptionCounselorId(parsed.handoffFromCounselorId)
        ? parsed.handoffFromCounselorId
        : undefined,
      handoffSessionId: typeof parsed.handoffSessionId === "string" ? parsed.handoffSessionId : undefined,
      handoffShownSessionId: typeof parsed.handoffShownSessionId === "string" ? parsed.handoffShownSessionId : undefined,
      recentSmallTalkTopicIds: Array.isArray(parsed.recentSmallTalkTopicIds)
        ? parsed.recentSmallTalkTopicIds.filter((id): id is string => typeof id === "string").slice(-5)
        : [],
      seenReceptionCounselorIds: Array.isArray(parsed.seenReceptionCounselorIds)
        ? parsed.seenReceptionCounselorIds.filter(isReceptionCounselorId)
        : [],
      smallTalkPrivacySeen: parsed.smallTalkPrivacySeen === true
    };
  } catch {
    return null;
  }
}

export function writeReceptionDutyState(state: ReceptionDutyState) {
  try {
    window.localStorage.setItem(receptionDutyStorageKey, JSON.stringify(state));
  } catch {
    // The reception remains usable when local storage is unavailable.
  }
}

export function markReceptionHandoffShown() {
  const state = readReceptionDutyState();
  if (!state?.handoffSessionId) return;
  writeReceptionDutyState({ ...state, handoffShownSessionId: state.handoffSessionId });
}

export function rememberSmallTalkTopic(topicId: string) {
  const state = readReceptionDutyState();
  if (!state) return;
  writeReceptionDutyState({
    ...state,
    recentSmallTalkTopicIds: [...state.recentSmallTalkTopicIds.filter((id) => id !== topicId), topicId].slice(-5)
  });
}

export function markSmallTalkPrivacySeen() {
  const state = readReceptionDutyState();
  if (!state) return;
  writeReceptionDutyState({ ...state, smallTalkPrivacySeen: true });
}

export function hasSeenReceptionCounselor(counselorId: ReceptionCounselorId) {
  return readReceptionDutyState()?.seenReceptionCounselorIds.includes(counselorId) ?? false;
}

export function markReceptionCounselorSeen(counselorId: ReceptionCounselorId) {
  const state = readReceptionDutyState();
  if (!state || state.seenReceptionCounselorIds.includes(counselorId)) return;
  writeReceptionDutyState({
    ...state,
    seenReceptionCounselorIds: [...state.seenReceptionCounselorIds, counselorId]
  });
}

export function isReceptionCounselorId(value: unknown): value is ReceptionCounselorId {
  return value === "chengling" || value === "zhouzhou" || value === "linleshui";
}

export function readWelcomeSeen() {
  try {
    return window.localStorage.getItem(welcomeStorageKey) === "true";
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    window.localStorage.setItem(welcomeStorageKey, "true");
  } catch {
    // The welcome flow still works when a browser blocks local storage.
  }
}
