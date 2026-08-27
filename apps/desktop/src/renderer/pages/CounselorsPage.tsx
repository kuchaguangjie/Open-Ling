import { getDefaultCounselors } from "@shared/index";
import { CounselorCard } from "../components/counselor/CounselorCard";
import { useLingua } from "../localization/useLingua";

export function CounselorsPage() {
  const { locale, l } = useLingua();
  const counselors = getDefaultCounselors(locale);
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">{l("内置咨询师", "Built-in counselors")}</p>
        <h1>{l("选择此刻更适合你的陪伴方式", "Choose the kind of support that fits this moment")}</h1>
        <p>{l("第一版先提供三个固定咨询师配置，不开放自定义 Prompt。", "This version includes three carefully defined counselors; custom prompts are not currently available.")}</p>
      </div>
      <div className="card-grid">
        {counselors.map((counselor) => (
          <CounselorCard counselor={counselor} key={counselor.id} />
        ))}
      </div>
    </section>
  );
}
