import { type CSSProperties, useState } from "react";
import defaultPortrait from "../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-default-original-chair-clean-hair-gap-transparent-v7.png";
import listeningPortrait from "../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v4/zhouzhou-session-listening-original-chair-clean-hair-gap-transparent-v9.png";
import respondingPortrait from "../../../../../assets/runtime/counselor-portrait-motion/zhouzhou/user-selected-v2/zhouzhou-session-responding-hair-gap-transparent-v3.png";
import openingPortrait from "../../../../../assets/runtime/counselor-opening-portraits/zhouzhou/user-selected-v4/zhouzhou-opening-welcome-halfbody-neutral-transparent-v4.png";
import closingPortrait from "../../../../../assets/runtime/counselor-opening-portraits/zhouzhou/user-selected-v4/zhouzhou-closing-relaxed-halfbody-neutral-transparent-v4.png";
import openingRoomBackground from "../../../../../assets/runtime/counseling-room-backgrounds/v2/zhouzhou/opening/zhouzhou-opening-bright-structured-room-final-v1.png";
import sessionRoomBackground from "../../../../../assets/runtime/counseling-room-backgrounds/v2/zhouzhou/session/zhouzhou-session-one-chair-room-final-v1.png";
import { CounselingRoomSidebar } from "../pages/counseling-room/sidebar/CounselingRoomSidebar";
import { CounselingRoomHeader } from "../pages/counseling-room/conversation/CounselingRoomHeader";
import { RoomBackgroundLayer } from "../pages/counseling-room/stage/background/RoomBackgroundLayer";
import { CounselorPortraitFaceMotion } from "../components/counselor/CounselorPortraitFaceMotion";
import type { CounselorStatus } from "../stores/sessionStore";
import "../pages/counseling-room/sidebar/sidebar.css";
import "../pages/counseling-room/conversation/conversation.css";
import "../pages/counseling-room/stage/stage.css";
import "./portrait-cutout-qa.css";

type PortraitStateKey = "session-default" | "session-listening" | "session-responding" | "opening-mug" | "closing-relaxed";

const stateOrder: PortraitStateKey[] = [
  "session-default",
  "session-listening",
  "session-responding",
  "opening-mug",
  "closing-relaxed"
];

const stateLabel: Record<PortraitStateKey, string> = {
  "session-default": "默认",
  "session-listening": "倾听",
  "session-responding": "回应",
  "opening-mug": "开场半身",
  "closing-relaxed": "结束半身"
};

const stateVersion: Record<PortraitStateKey, string> = {
  "session-default": "正式 v7 · 原图完整座椅 · 清除颈侧发梢背景碎屑 · 含眨眼",
  "session-listening": "正式 v9 · 原图完整座椅 · 清除颈侧发梢背景碎屑 · 含眨眼",
  "session-responding": "正式 v3 · 清理右下发梢脏边 · 含眨眼与说话",
  "opening-mug": "正式 v4",
  "closing-relaxed": "正式 v4"
};

const portraitsByState: Record<PortraitStateKey, string> = {
  "session-default": defaultPortrait,
  "session-listening": listeningPortrait,
  "session-responding": respondingPortrait,
  "opening-mug": openingPortrait,
  "closing-relaxed": closingPortrait
};

const statusByState: Record<PortraitStateKey, CounselorStatus> = {
  "session-default": "idle",
  "session-listening": "listening",
  "session-responding": "streaming",
  "opening-mug": "idle",
  "closing-relaxed": "idle"
};

const backgroundByState: Record<PortraitStateKey, string> = {
  "session-default": sessionRoomBackground,
  "session-listening": sessionRoomBackground,
  "session-responding": sessionRoomBackground,
  "opening-mug": openingRoomBackground,
  "closing-relaxed": openingRoomBackground
};

function getInitialState(): PortraitStateKey {
  const value = new URLSearchParams(window.location.search).get("state");
  return stateOrder.includes(value as PortraitStateKey) ? (value as PortraitStateKey) : "session-responding";
}

export function PortraitCutoutQaPage() {
  const [portraitState, setPortraitState] = useState<PortraitStateKey>(getInitialState);
  const [showSideZoom, setShowSideZoom] = useState(false);
  const portraitSrc = portraitsByState[portraitState];
  const counselorStatus = statusByState[portraitState];
  const roomBackground = backgroundByState[portraitState];
  const motionState = portraitState.startsWith("session-") ? portraitState.replace("session-", "") : "default";
  const roomStyle = {
    "--room-theme-image": `url("${roomBackground}")`,
    "--portrait-backdrop-image": `url("${roomBackground}")`,
    "--portrait-backdrop-opacity": "0"
  } as CSSProperties;

  return (
    <main className="portrait-cutout-qa-page">
      <section
        aria-label="周舟咨询室立绘真实环境测试"
        className="room-layout room-layout-zhouzhou portrait-cutout-qa-room"
        style={roomStyle}
      >
        <CounselingRoomSidebar
          controls={{
            hasActiveSession: true,
            isBusy: false,
            isBusyInAnotherSession: false,
            isSessionEnded: false,
            onReturnToLobby: () => undefined,
            onToggleSessionEnded: () => undefined
          }}
          onOpenSettings={() => undefined}
          onRequestNewConsultation={() => undefined}
        />

        <section className="conversation-panel portrait-cutout-qa-conversation">
          <CounselingRoomHeader title="与周舟的咨询" />
          <div className="portrait-cutout-qa-message-stream">
            <article className="portrait-cutout-qa-message is-user">
              <strong>我</strong>
              <p>我总觉得自己必须立刻把所有事情想明白。</p>
            </article>
            <article className="portrait-cutout-qa-message is-counselor">
              <strong>周舟</strong>
              <p>我们可以先把它分成几个更小的部分，看看哪些是现在能处理的，哪些可以暂时放一放。</p>
            </article>
          </div>
          <div className="portrait-cutout-qa-composer" aria-label="消息输入区预览">
            <span>输入你想说的话……</span>
            <button type="button">发送</button>
          </div>
        </section>

        <aside className="context-panel" aria-label="周舟立绘预览">
          <section className="portrait-card">
            <RoomBackgroundLayer />
            <div
              className={`portrait-person portrait-motion-${motionState}`}
              data-counselor-id="zhouzhou"
              data-portrait-state={motionState}
            >
              <span className={`portrait-frame portrait-motion-${motionState} portrait-pose-${motionState} portrait-image-ready`}>
                <img
                  alt={`周舟${stateLabel[portraitState]}正式立绘`}
                  className="portrait-image-layer portrait-image-active portrait-image-ready"
                  decoding="async"
                  key={portraitSrc}
                  src={portraitSrc}
                />
                {portraitState.startsWith("session-") && (
                  <CounselorPortraitFaceMotion counselorId="zhouzhou" status={counselorStatus} />
                )}
              </span>
            </div>
          </section>
        </aside>
      </section>

      <section className="portrait-cutout-qa-controls" aria-label="立绘候选切换">
        <div>
          <p>周舟正式资源 QA · {stateLabel[portraitState]} · {stateVersion[portraitState]} · 真实背景预览</p>
          <small>当前正式映射；回应状态会持续播放说话口型</small>
        </div>
        <div className="portrait-cutout-qa-switch portrait-cutout-qa-state-switch" role="group" aria-label="立绘状态">
          {stateOrder.map((state) => (
            <button
              aria-pressed={portraitState === state}
              key={state}
              onClick={() => setPortraitState(state)}
              type="button"
            >
              {stateLabel[state]}
            </button>
          ))}
        </div>
        <button
          aria-pressed={showSideZoom}
          className="portrait-cutout-qa-zoom-toggle"
          onClick={() => setShowSideZoom((visible) => !visible)}
          type="button"
        >
          {showSideZoom ? "关闭两侧放大" : "查看两侧放大"}
        </button>
      </section>

      {showSideZoom && (
        <aside className="portrait-cutout-qa-side-zoom" aria-label="左右侧发约 2 倍放大检查">
          <div className="portrait-cutout-qa-side-zoom-grid">
            <figure>
              <div className="is-left" style={{ backgroundImage: `url("${portraitSrc}")` }} />
              <figcaption>左侧鬓发与下侧碎发</figcaption>
            </figure>
            <figure>
              <div className="is-right" style={{ backgroundImage: `url("${portraitSrc}")` }} />
              <figcaption>右侧鬓发与下侧碎发</figcaption>
            </figure>
          </div>
          <span>两侧约 2× · {stateLabel[portraitState]} · 正式资源</span>
        </aside>
      )}
    </main>
  );
}
