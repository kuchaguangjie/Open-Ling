export function parseModelJson(raw: string): Record<string, unknown> {
  const text = stripMarkdownFence(raw);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    const repaired = escapeControlCharactersInsideStrings(text);
    try {
      return JSON.parse(repaired) as Record<string, unknown>;
    } catch {
      const closed = closeMissingFinalStringQuote(repaired);
      if (closed === repaired) throw error;
      return JSON.parse(closed) as Record<string, unknown>;
    }
  }
}

function closeMissingFinalStringQuote(text: string) {
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      escaped = true;
      continue;
    }
    if (character === '"') inString = !inString;
  }
  if (!inString) return text;
  const closingBraceIndex = text.search(/}\s*$/);
  if (closingBraceIndex < 0) return text;
  return `${text.slice(0, closingBraceIndex)}"${text.slice(closingBraceIndex)}`;
}

function stripMarkdownFence(raw: string) {
  const text = String(raw ?? "").trim();
  const fence = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n\s*```$/);
  if (fence) return fence[1].trim();

  // Some providers occasionally emit a valid JSON object after an opening
  // fence but omit the closing fence. Treat only a fence at the very start as
  // presentation syntax; genuinely truncated JSON still fails in JSON.parse.
  const withoutOpeningFence = text.replace(/^```(?:json)?\s*\n/i, "");
  return withoutOpeningFence.replace(/\n\s*```\s*$/, "").trim();
}

function escapeControlCharactersInsideStrings(text: string) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (const character of text) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && inString) {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      inString = !inString;
      result += character;
      continue;
    }
    if (inString && character.charCodeAt(0) <= 0x1f) {
      result += escapeControlCharacter(character);
      continue;
    }
    result += character;
  }
  return result;
}

function escapeControlCharacter(character: string) {
  if (character === "\n") return "\\n";
  if (character === "\r") return "\\r";
  if (character === "\t") return "\\t";
  if (character === "\b") return "\\b";
  if (character === "\f") return "\\f";
  return `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`;
}
