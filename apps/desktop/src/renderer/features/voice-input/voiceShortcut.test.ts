import { describe, expect, it } from "vitest";
import { formatVoiceShortcut, matchesVoiceShortcut, voiceShortcutFromEvent } from "./voiceShortcut";

function keyEvent(overrides: Partial<KeyboardEvent> = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    key: "v",
    metaKey: false,
    shiftKey: false,
    ...overrides
  } as KeyboardEvent;
}

describe("voice shortcut", () => {
  it("requires a command modifier for normal keys", () => {
    expect(voiceShortcutFromEvent(keyEvent())).toBeNull();
    expect(voiceShortcutFromEvent(keyEvent({ metaKey: true, shiftKey: true }))).toBe("Meta+Shift+V");
  });

  it("formats and matches a saved shortcut", () => {
    expect(formatVoiceShortcut("Meta+Shift+V")).toBe("⌘ ⇧ V");
    expect(matchesVoiceShortcut(keyEvent({ metaKey: true, shiftKey: true }), "Meta+Shift+V")).toBe(true);
  });

  it("accepts function keys without a modifier", () => {
    expect(voiceShortcutFromEvent(keyEvent({ key: "F8" }))).toBe("F8");
  });
});
