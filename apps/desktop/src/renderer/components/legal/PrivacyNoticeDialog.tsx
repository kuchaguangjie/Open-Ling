import { useEffect, useMemo, useRef, type ReactNode } from "react";
import privacyNoticeChinese from "../../../../../../PRIVACY.md?raw";
import privacyNoticeEnglish from "../../../../../../PRIVACY.en.md?raw";
import { useLingua } from "../../localization/useLingua";
import "./privacy-notice-dialog.css";

type PrivacyNoticeBlock =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "metadata"; text: string }
  | { type: "paragraph"; text: string };

function parsePrivacyNotice(markdown: string) {
  const lines = markdown.split(/\r?\n/u);
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim() ?? "Ling";
  const blocks: PrivacyNoticeBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line || line.startsWith("# ")) continue;
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push({ type: "metadata", text: line.slice(2).replace(/\s{2}$/u, "").trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while ((lines[index]?.trim() ?? "").startsWith("- ")) {
        items.push((lines[index]?.trim() ?? "").slice(2).trim());
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "list", items });
      continue;
    }
    blocks.push({ type: "paragraph", text: line });
  }

  return { blocks, title };
}

function renderBlock(block: PrivacyNoticeBlock, index: number): ReactNode {
  if (block.type === "heading") return <h3 key={`${block.text}-${index}`}>{block.text}</h3>;
  if (block.type === "list") {
    return <ul key={`privacy-list-${index}`}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
  }
  if (block.type === "metadata") return <p className="privacy-notice-metadata" key={`${block.text}-${index}`}>{block.text}</p>;
  return <p key={`${block.text}-${index}`}>{block.text}</p>;
}

export function PrivacyNoticeDialog({ onClose }: { onClose: () => void }) {
  const { locale, l } = useLingua();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const document = useMemo(
    () => parsePrivacyNotice(locale === "en-US" ? privacyNoticeEnglish : privacyNoticeChinese),
    [locale]
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="privacy-notice-backdrop" onMouseDown={onClose}>
      <article
        aria-labelledby="privacy-notice-title"
        aria-modal="true"
        className="privacy-notice-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <h2 id="privacy-notice-title">{document.title}</h2>
          <button aria-label={l("关闭隐私说明", "Close privacy notice")} onClick={onClose} ref={closeButtonRef} type="button">×</button>
        </header>
        <div className="privacy-notice-copy">
          {document.blocks.map(renderBlock)}
        </div>
        <footer>
          <button onClick={onClose} type="button">{l("我知道了", "Done")}</button>
        </footer>
      </article>
    </div>
  );
}
