import { useRef, useState } from "react";
import { useLingua } from "../../../../localization/useLingua";
import { ResourceDocumentReaderLayout } from "./ResourceDocumentReaderLayout";
import {
  defaultUserGuideTopicId,
  findUserGuideTopic,
  getUserGuideGroups
} from "./userGuideContent";

export function UserGuideReader({ onBack }: { onBack: () => void }) {
  const { locale, t } = useLingua();
  const [activeTopicId, setActiveTopicId] = useState(defaultUserGuideTopicId);
  const navigationRef = useRef<HTMLDivElement>(null);
  const userGuideGroups = getUserGuideGroups(locale);
  const activeTopic = findUserGuideTopic(activeTopicId, locale);

  function returnToGuideDirectory() {
    navigationRef.current?.focus();
    navigationRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  const navigation = (
    <div className="resource-help-navigation-groups" ref={navigationRef} tabIndex={-1}>
      {userGuideGroups.map((group, groupIndex) => (
        <section key={group.id}>
          <h3><span aria-hidden="true">0{groupIndex + 1}</span>{group.label}</h3>
          <div>
            {group.topics.map((topic) => (
              <button
                aria-current={activeTopic.id === topic.id ? "page" : undefined}
                key={topic.id}
                onClick={() => setActiveTopicId(topic.id)}
                type="button"
              >
                {topic.navigationLabel}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <ResourceDocumentReaderLayout
      ariaLabel={t("guide.title")}
      contentKey={activeTopic.id}
      navigation={navigation}
      navigationLabel={t("guide.directory")}
      onBack={onBack}
      title={t("guide.title")}
      version="2026.09.07"
    >
      <div className="resource-help-topic" key={activeTopic.id}>
        <p className="resource-help-topic-label">{t("guide.topicLabel")}</p>
        <h3>{activeTopic.title}</h3>
        <p className="resource-help-lead">{activeTopic.lead}</p>

        {activeTopic.comparison && (
          <div className="resource-help-comparison">
            {activeTopic.comparison.map((item) => (
              <article key={item.action}>
                <span aria-hidden="true" className="resource-help-marker">{item.marker}</span>
                <strong>{item.action}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        )}

        {activeTopic.points && (
          <ul className="resource-help-points">
            {activeTopic.points.map((point) => (
              <li key={`${point.label ?? "point"}-${point.text}`}>
                {point.label && <strong>{point.label}</strong>}
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        )}

        {activeTopic.steps && (
          <ol className="resource-help-steps">
            {activeTopic.steps.map((step, index) => (
              <li key={step}><span aria-hidden="true">{index + 1}</span><p>{step}</p></li>
            ))}
          </ol>
        )}

        {activeTopic.note && <aside className="resource-help-note"><strong>{t("guide.note")}</strong><p>{activeTopic.note}</p></aside>}

        <button className="resource-help-directory-return" onClick={returnToGuideDirectory} type="button">
          <span aria-hidden="true">↑</span> {t("guide.return")}
        </button>
      </div>
    </ResourceDocumentReaderLayout>
  );
}
