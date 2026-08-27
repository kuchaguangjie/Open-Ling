import { useEffect, useRef } from "react";
import { StudioSignature } from "../shared/StudioSignature";
import { useLingua } from "../../../../localization/useLingua";
import type { StoryArticle } from "./storyContent";

export function StoryReader({ article, onBack }: { article: StoryArticle; onBack: () => void }) {
  const { l } = useLingua();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [article.id]);

  return (
    <article aria-label={article.title} className="story-reader ling-motion-surface-enter">
      <aside className="story-reader-cover">
        <figure className="story-reader-hero">
          <img alt={article.imageAlt} src={article.imageUrl} />
        </figure>
        <div className="story-reader-meta">
          <button className="story-reader-back" onClick={onBack} type="button">
            <span aria-hidden="true">←</span> {l("返回故事簿", "Back to stories")}
          </button>
          <span>{l(`约 ${article.readingMinutes} 分钟阅读`, `About ${article.readingMinutes} minutes`)}</span>
        </div>
        <div className="story-reader-cover-copy">
          <p className="story-reader-kicker">{l("群心故事簿 · 原创虚构", "Qunxin Stories · Original fiction")}</p>
          <h2 aria-hidden="true">{article.title}</h2>
          <p className="story-reader-lead">{article.excerpt}</p>
          <p className="story-reader-theme">{article.theme}</p>
          {article.sourceNote ? <p className="story-reader-source">{article.sourceNote}</p> : null}
        </div>
      </aside>
      <div className="story-reader-scroll" data-testid="story-reader-scroll-region">
        <div className="story-reader-sheet">
          <header className="story-reader-article-header">
            <p>{l("群心故事簿 · 原创虚构", "Qunxin Stories · Original fiction")}</p>
            <h2 ref={headingRef} tabIndex={-1}>{article.title}</h2>
            <span>{article.excerpt}</span>
          </header>
          <div className="story-reader-body">
            {article.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <p className="story-reader-byline">
            <strong>{article.byline.author}</strong>
            <span>{l(`${article.byline.season}，写于群心心理工作室 · ${article.byline.location}`, `${article.byline.season}, written at Qunxin Psychology Studio · ${article.byline.location}`)}</span>
          </p>
          <p className="story-reader-disclaimer">{l("人物、情节与对话均为虚构，不来自任何真实会谈。本文只是一篇故事，不能替代由专业人员提供的心理咨询、精神科诊疗或危机支持。", "All characters, events, and dialogue are fictional and do not come from any real session. This is a story, not a substitute for counseling, psychiatric care, or crisis support from qualified professionals.")}</p>
          <footer className="story-reader-footer">
            <StudioSignature label="STUDIO FICTION COLLECTION" />
          </footer>
        </div>
      </div>
    </article>
  );
}
