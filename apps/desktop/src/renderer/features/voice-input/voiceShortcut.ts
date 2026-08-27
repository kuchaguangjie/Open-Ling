interface VoiceShortcutEvent {
  altKey: boolean;
  code?: string;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}

const keyLabels: Record<string, string> = {
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  Enter: "Enter",
  Space: "Space",
  Tab: "Tab"
};

export function voiceShortcutFromEvent(event: VoiceShortcutEvent): string | null {
  const key = normalizeShortcutKey(event);
  if (!key) return null;

  const modifiers = [
    event.metaKey ? "Meta" : "",
    event.ctrlKey ? "Control" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : ""
  ].filter(Boolean);
  const isFunctionKey = /^F(?:[1-9]|1[0-2])$/u.test(key);
  const hasCommandModifier = event.metaKey || event.ctrlKey || event.altKey;
  if (!isFunctionKey && !hasCommandModifier) return null;
  return [...modifiers, key].join("+");
}

export function matchesVoiceShortcut(event: VoiceShortcutEvent, shortcut: string): boolean {
  if (!shortcut) return false;
  return voiceShortcutFromEvent(event) === shortcut;
}

export function formatVoiceShortcut(shortcut: string, locale: SupportedLocale = "zh-CN"): string {
  if (!shortcut) return locale === "en-US" ? "Not set" : "未设置";
  return shortcut
    .split("+")
    .map((part) => {
      if (part === "Meta") return "⌘";
      if (part === "Control") return "⌃";
      if (part === "Alt") return "⌥";
      if (part === "Shift") return "⇧";
      return keyLabels[part] ?? part;
    })
    .join(" ");
}

function normalizeShortcutKey(event: VoiceShortcutEvent): string | null {
  if (["Alt", "Control", "Meta", "Shift"].includes(event.key)) return null;
  if (event.key === " ") return "Space";
  if (/^F(?:[1-9]|1[0-2])$/u.test(event.key)) return event.key;
  if (event.key.length === 1 && /[a-z0-9]/iu.test(event.key)) return event.key.toUpperCase();
  if (["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "Enter", "Tab"].includes(event.key)) {
    return event.key;
  }
  return event.code?.startsWith("Key") ? event.code.slice(3).toUpperCase() : null;
}
import type { SupportedLocale } from "@shared/index";
