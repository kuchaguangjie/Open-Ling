import { useState } from "react";
import qunxinLogo from "../../../../../assets/runtime/lobby/waiting-room/redesign/logo/qunxin-boat-three-people-logo-transparent-v1.png";
import woodNavigationBase from "../../../../../assets/runtime/counseling-room/sidebar/wood-navigation-base-v1.png";
import chenglingSessionBackground from "../../../../../assets/runtime/counseling-room-backgrounds/v2/chengling/session/chengling-session-one-chair-room-final-v2.png";
import { getCounselorVisualAssets } from "../components/counselor/counselorPortraitAssets";
import "./sidebar-design-demo.css";

export type SidebarDemoVariant = "minimal" | "wood";

interface SidebarDesignDemoPageProps {
  variant: SidebarDemoVariant;
}

const navigationItems = [
  { icon: "＋", id: "new" },
  { icon: "◷", id: "history" },
  { icon: "⚙", id: "settings" },
  { icon: "›", id: "collapse" }
];
const utilityItems = [
  {
    description: "本次会谈会保留，稍后可继续。",
    icon: "↩",
    id: "return",
    label: "返回",
    title: "返回等待室"
  },
  {
    description: "会谈记录会保留，并收到咨询师的一封信。",
    icon: "◉",
    id: "end",
    label: "结束",
    title: "结束本次咨询"
  }
];

export function SidebarDesignDemoPage({ variant }: SidebarDesignDemoPageProps) {
  const assets = getCounselorVisualAssets("chengling");
  const title = variant === "minimal" ? "极简白框导航" : "木质底座导航";
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"overlay" | "push">("overlay");
  const [activeUtilityId, setActiveUtilityId] = useState<string | undefined>();
  const activeUtility = utilityItems.find((item) => item.id === activeUtilityId);

  return (
    <main
      className={`sidebar-design-demo${isHistoryOpen ? " history-open" : ""}${isHistoryOpen && drawerMode === "push" ? " history-push" : ""}`}
      style={{ "--demo-room-background": `url(${chenglingSessionBackground})` } as React.CSSProperties}
    >
      <aside
        className={`sidebar-demo-nav ${variant}`}
        aria-label={title}
        style={variant === "wood" ? { "--sidebar-demo-wood": `url(${woodNavigationBase})` } as React.CSSProperties : undefined}
      >
        <div className="sidebar-demo-sheet">
          <div className="sidebar-demo-logo"><img alt="群心" src={qunxinLogo} /></div>
          <div className="sidebar-demo-actions">
            {navigationItems.map((item) => (
              <button
                aria-label={item.id === "history" ? "会谈记录" : "导航演示"}
                className={item.id === "history" && isHistoryOpen ? "active" : undefined}
                key={item.id}
                onClick={() => item.id === "history" && setIsHistoryOpen((current) => !current)}
                type="button"
              >
                {item.icon}
              </button>
            ))}
          </div>
          <div className="sidebar-demo-utilities">
            {utilityItems.map((item) => (
              <button
                aria-label={item.title}
                key={item.id}
                onBlur={() => setActiveUtilityId(undefined)}
                onFocus={() => setActiveUtilityId(item.id)}
                onMouseEnter={() => setActiveUtilityId(item.id)}
                onMouseLeave={() => setActiveUtilityId(undefined)}
                type="button"
              >
                <span>{item.icon}</span>
                <small>{item.label}</small>
              </button>
            ))}
          </div>
        </div>
        <div className={`sidebar-demo-action-tooltip${activeUtility ? ` ${activeUtility.id}` : ""}`} aria-hidden={!activeUtility}>
          {activeUtility && <><strong>{activeUtility.title}</strong><span>{activeUtility.description}</span></>}
        </div>
      </aside>

      <aside className={`sidebar-demo-history${isHistoryOpen ? " open" : ""}`} aria-label="会谈记录抽屉">
        <header>
          <strong>会谈记录</strong>
          <button aria-label="关闭会谈记录" onClick={() => setIsHistoryOpen(false)} type="button">×</button>
        </header>
        <div className="sidebar-demo-layout-toggle" aria-label="抽屉布局">
          <button className={drawerMode === "overlay" ? "active" : undefined} onClick={() => setDrawerMode("overlay")} type="button">覆盖主区</button>
          <button className={drawerMode === "push" ? "active" : undefined} onClick={() => setDrawerMode("push")} type="button">推开主区</button>
        </div>
        <p className="sidebar-demo-history-group">最近会谈</p>
        <button className="sidebar-demo-session active" type="button"><span>与程灵的会谈</span><small>进行中</small></button>
        <button className="sidebar-demo-session" type="button"><span>与程灵的会谈</span><small>昨天</small></button>
        <p className="sidebar-demo-history-group">更早</p>
        <button className="sidebar-demo-session" type="button"><span>关于最近的疲惫</span><small>7 月 11 日</small></button>
      </aside>

      <section className="sidebar-demo-chat" aria-label="咨询对话展示">
        <div className="sidebar-demo-panel">
          <div className="sidebar-demo-caption">{title}</div>
          <div className="sidebar-demo-message assistant">我们可以慢慢说，不需要急着整理好。</div>
          <div className="sidebar-demo-message user">好，我想从今天发生的事开始。</div>
          <div className="sidebar-demo-composer">慢慢说，发生了什么？<span>发送</span></div>
        </div>
      </section>

      <img className="sidebar-demo-portrait" alt="程灵" src={assets.portrait} />
      <nav className="sidebar-demo-switcher" aria-label="侧栏方案切换">
        <a aria-current={variant === "minimal" ? "page" : undefined} href="?sidebar-demo=minimal">白框</a>
        <a aria-current={variant === "wood" ? "page" : undefined} href="?sidebar-demo=wood">木质</a>
      </nav>
    </main>
  );
}
