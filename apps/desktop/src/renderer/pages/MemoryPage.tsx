import { useLingua } from "../localization/useLingua";

export function MemoryPage() {
  const { l } = useLingua();
  const memoryTypes = [
    { type: "profile", title: l("长期背景", "Long-term background"), description: l("例如长期关系、成长背景、稳定的生活状态。", "For example, enduring relationships, formative background, and stable life circumstances.") },
    { type: "theme", title: l("反复主题", "Recurring themes"), description: l("反复出现的心理主题、情绪模式或关系模式。", "Psychological themes, emotional patterns, or relational patterns that recur over time.") },
    { type: "event", title: l("重要事件", "Significant events"), description: l("用户确认后记录的重要生活事件。", "Important life events recorded only after you confirm them.") },
    { type: "preference", title: l("咨询偏好", "Counseling preferences"), description: l("用户偏好的回应方式、节奏和边界。", "Your preferred response style, pace, and boundaries.") }
  ];
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">{l("本地记忆", "Local memory")}</p>
        <h1>{l("记忆只在你确认后写入", "Memories are saved only after you confirm them")}</h1>
        <p>{l("第一阶段先展示记忆类型和空状态，自动提取会在后续任务里单独设计。", "This first version shows memory categories and empty states. Automatic extraction will be designed separately.")}</p>
      </div>
      <div className="memory-grid">
        {memoryTypes.map((memory) => (
          <article className="memory-card" key={memory.type}>
            <span className="soft-tag">{memory.type}</span>
            <h3>{memory.title}</h3>
            <p>{memory.description}</p>
            <button className="secondary-action" type="button">
              {l("新增记忆", "Add memory")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
