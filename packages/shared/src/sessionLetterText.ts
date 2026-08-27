export function normalizeSessionLetterMarkdown(markdown: string) {
  return markdown.replace(/\\r\\n|\\n|\\r/g, "\n");
}

export function isSessionLetterSalutation(paragraph: string) {
  const text = paragraph.trim();
  return /^(?:亲爱的)?(?:你|[\p{L}\p{N}_·・\- ]{1,30})[：:]$/u.test(text)
    || /^给你[：:]$/u.test(text)
    || /^Dear\s+[^\n,]{1,40},$/iu.test(text);
}

export function formatSessionLetterMarkdown(
  markdown: string,
  clientDisplayName: string | undefined,
  locale: "zh-CN" | "en-US"
) {
  const paragraphs = normalizeSessionLetterMarkdown(markdown)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/^#+\s*/, "").trim())
    .filter(Boolean);
  if (paragraphs[0] && isSessionLetterSalutation(paragraphs[0])) paragraphs.shift();

  const displayName = clientDisplayName?.trim();
  if (displayName) paragraphs.unshift(locale === "en-US" ? `${displayName},` : `${displayName}：`);
  return paragraphs.join("\n\n");
}

export function splitSessionLetterParagraphs(
  markdown: string,
  clientDisplayName: string | undefined,
  locale: "zh-CN" | "en-US"
) {
  return formatSessionLetterMarkdown(markdown, clientDisplayName, locale).split(/\n{2,}/).filter(Boolean);
}
