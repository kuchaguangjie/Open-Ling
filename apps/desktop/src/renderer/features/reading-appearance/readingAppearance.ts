import type { ReadingAppearanceSettings, ReadingLineSpacing, ReadingTextSize } from "@shared/index";

const textSizeVariables: Record<ReadingTextSize, Record<string, string>> = {
  small: {
    "--reading-body-font-size": "15px",
    "--reading-copy-font-size": "14px",
    "--reading-message-font-size": "15px",
    "--reading-letter-font-size": "15px",
    "--reading-letter-reader-font-size": "16px"
  },
  standard: {
    "--reading-body-font-size": "16px",
    "--reading-copy-font-size": "15px",
    "--reading-message-font-size": "16px",
    "--reading-letter-font-size": "16px",
    "--reading-letter-reader-font-size": "17px"
  },
  large: {
    "--reading-body-font-size": "17.25px",
    "--reading-copy-font-size": "16.25px",
    "--reading-message-font-size": "17.25px",
    "--reading-letter-font-size": "17.25px",
    "--reading-letter-reader-font-size": "18.25px"
  }
};

const lineSpacingVariables: Record<ReadingLineSpacing, Record<string, string>> = {
  compact: {
    "--reading-body-line-height": "1.58",
    "--reading-message-line-height": "1.58",
    "--reading-letter-line-height": "1.74",
    "--reading-letter-reader-line-height": "1.78"
  },
  standard: {
    "--reading-body-line-height": "1.7",
    "--reading-message-line-height": "1.72",
    "--reading-letter-line-height": "1.92",
    "--reading-letter-reader-line-height": "1.95"
  },
  relaxed: {
    "--reading-body-line-height": "1.86",
    "--reading-message-line-height": "1.9",
    "--reading-letter-line-height": "2.08",
    "--reading-letter-reader-line-height": "2.12"
  }
};

export function applyReadingAppearance(
  appearance: ReadingAppearanceSettings,
  root: HTMLElement = document.documentElement
) {
  const variables = {
    ...textSizeVariables[appearance.textSize],
    ...lineSpacingVariables[appearance.lineSpacing]
  };
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  root.dataset.readingTextSize = appearance.textSize;
  root.dataset.readingLineSpacing = appearance.lineSpacing;
  root.dataset.lingCursorTheme = appearance.cursorTheme ?? "d";
}

export function getReadingPreviewStyle(appearance: ReadingAppearanceSettings) {
  return {
    fontSize: textSizeVariables[appearance.textSize]["--reading-letter-font-size"],
    lineHeight: lineSpacingVariables[appearance.lineSpacing]["--reading-letter-line-height"]
  };
}
