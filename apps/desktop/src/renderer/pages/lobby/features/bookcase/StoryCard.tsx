import type { StoryArticle } from "./storyContent";
import { useLingua } from "../../../../localization/useLingua";

export function StoryCard({
  article,
  featured,
  onOpen
}: {
  article: StoryArticle;
  featured: boolean;
  onOpen: (articleId: string) => void;
}) {
  const { l } = useLingua();
  return (
    <button
      aria-label={l(`打开《${article.title}》`, `Open “${article.title}”`)}
      className={featured ? "story-card story-card-featured" : "story-card"}
      data-story-id={article.id}
      onClick={() => onOpen(article.id)}
      type="button"
    >
      <span className="story-card-image-wrap">
        <img alt={article.imageAlt} loading="lazy" src={article.imageUrl} />
      </span>
      <span className="story-card-copy">
        <span className="story-card-meta">{l(`原创虚构 · 约 ${article.readingMinutes} 分钟`, `Original fiction · About ${article.readingMinutes} minutes`)}</span>
        <strong>{article.title}</strong>
        <span className="story-card-theme">{article.theme}</span>
        <span className="story-card-excerpt">{article.excerpt}</span>
        <span className="story-card-action">{l("阅读故事", "Read story")}</span>
      </span>
    </button>
  );
}
