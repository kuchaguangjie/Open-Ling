import { type CSSProperties, useState } from "react";
import { getCounselorVisualAssets } from "../components/counselor/counselorPortraitAssets";
import { getCounselorFlowAssets } from "../flows/consultation/counselorFlowAssets";
import { ClosingChoiceMenu } from "../pages/counseling-room/transitions/ClosingChoiceMenu";
import { CounselorDialogueStage } from "../pages/counseling-room/transitions/CounselorDialogueStage";
import { CounselingRoomStage } from "../pages/counseling-room/stage/CounselingRoomStage";
import type { CounselorStatus } from "../stores/sessionStore";

export function DialogueStageDesignDemoPage({ phase }: { phase: "opening" | "closing" | "session" }) {
  const requestedCounselorId = new URLSearchParams(window.location.search).get("counselor");
  const counselorId = requestedCounselorId === "chengling" || requestedCounselorId === "linleshui"
    ? requestedCounselorId
    : "zhouzhou";
  const counselorName = counselorId === "chengling" ? "程灵" : counselorId === "linleshui" ? "林乐水" : "周舟";
  const assets = getCounselorFlowAssets(counselorId);
  const visualAssets = getCounselorVisualAssets(counselorId);
  const [lineIndex, setLineIndex] = useState(phase === "closing" ? 1 : 0);
  const [sessionStatus, setSessionStatus] = useState<CounselorStatus>("idle");

  if (!assets) return null;

  if (phase === "session") {
    const roomStyle = {
      "--room-theme-image": `url(${assets.sessionRoomBackground})`,
      "--portrait-backdrop-image": `url(${visualAssets.portraitBackdrop})`,
      "--portrait-backdrop-opacity": visualAssets.usesUnifiedRoomBackground ? "0" : "0.94"
    } as CSSProperties;
    const statusOptions: Array<{ label: string; status: CounselorStatus }> = [
      { label: "默认", status: "idle" },
      { label: "倾听", status: "listening" },
      { label: "回应", status: "streaming" }
    ];

    return (
      <section
        aria-label={`${counselorName}的咨询室立绘预览`}
        className={`room-layout room-layout-${counselorId}`}
        style={roomStyle}
      >
        <div aria-hidden="true" />
        <div aria-hidden="true" />
        <CounselingRoomStage
          counselorId={counselorId}
          counselorName={counselorName}
          status={sessionStatus}
          statusQuote=""
          statusText=""
        />
        <nav
          aria-label="咨询立绘状态"
          style={{
            background: "rgba(255, 252, 245, 0.92)",
            border: "1px solid rgba(104, 82, 56, 0.2)",
            borderRadius: 999,
            boxShadow: "0 8px 24px rgba(63, 45, 28, 0.12)",
            display: "flex",
            gap: 8,
            left: "50%",
            padding: 8,
            position: "fixed",
            top: 20,
            transform: "translateX(-50%)",
            zIndex: 20
          }}
        >
          {statusOptions.map((option) => (
            <button
              aria-pressed={sessionStatus === option.status}
              key={option.status}
              onClick={() => setSessionStatus(option.status)}
              style={{
                background: sessionStatus === option.status ? "#6e513b" : "transparent",
                border: 0,
                borderRadius: 999,
                color: sessionStatus === option.status ? "#fffaf1" : "#5b493b",
                cursor: "pointer",
                font: "inherit",
                padding: "9px 18px"
              }}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </nav>
      </section>
    );
  }

  const isOpening = phase === "opening";
  const lines = isOpening
    ? [`你好，我是${counselorName}。`, "第一次见面，欢迎你来到我的咨询室。"]
    : [
      "今天的谈话先到这里。",
        "咨询结束后，我想对你说的话，会写进一封会谈后的信里，留在等待室底栏的「咨询师的信」中；完整会谈仍可在沙发区的「历史记录」回看。"
      ];
  const isLastLine = lineIndex === lines.length - 1;
  return (
    <CounselorDialogueStage
      backgroundSrc={assets.openingRoomBackground}
      counselorName={counselorName}
      frames={isOpening ? assets.openingPortraitFrames : assets.closingPortraitFrames}
      overlays={isOpening ? assets.openingPortraitOverlays : assets.closingPortraitOverlays}
      phase={phase}
      primaryAction={isLastLine && !isOpening ? undefined : { label: "继续", onSelect: () => setLineIndex((index) => Math.min(index + 1, lines.length - 1)) }}
      text={lines[lineIndex]}
      topLeftAction={{ label: "返回等待室", onSelect: () => undefined }}
      topRightAction={{ label: isOpening ? "跳过开场" : "继续咨询", onSelect: () => undefined }}
    >
      {!isOpening && isLastLine && <ClosingChoiceMenu onLeave={() => undefined} onOpenHistory={() => undefined} onReadLetter={() => undefined} />}
    </CounselorDialogueStage>
  );
}
