import type { Counselor } from "@shared/index";

interface CounselorCardProps {
  counselor: Counselor;
  compact?: boolean;
}

export function CounselorCard({ counselor, compact = false }: CounselorCardProps) {
  return (
    <article className={compact ? "counselor-card compact" : "counselor-card"}>
      <div className="portrait-placeholder" aria-hidden="true">
        {counselor.name.slice(0, 1)}
      </div>
      <div>
        <p className="eyebrow">{counselor.title}</p>
        <h3>{counselor.name}</h3>
        <p>{counselor.description}</p>
        {!compact && (
          <div className="tag-row">
            {counselor.strengths.map((strength) => (
              <span className="soft-tag" key={strength}>
                {strength}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
