import { FormEvent, useState } from "react";
import { PrivacyNoticeDialog } from "../../components/legal/PrivacyNoticeDialog";
import { useLingua } from "../../localization/useLingua";
import { createRecoveryPhrase } from "../access-lock/recoveryPhrase";
import { LaunchWelcomeShell } from "../launch-welcome";

interface LaunchSecurityScreenProps {
  onBack: () => void;
  onComplete: () => void;
  onSkip?: () => void;
  presentation?: "launch" | "embedded";
}

export function LaunchSecurityScreen({ onBack, onComplete, onSkip, presentation = "launch" }: LaunchSecurityScreenProps) {
  const { locale, l, t } = useLingua();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryCode, setRecoveryCode] = useState(() => createRecoveryPhrase());
  const [hasStoredPhrase, setHasStoredPhrase] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isPrivacyNoticeOpen, setIsPrivacyNoticeOpen] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (pin !== confirmPin) {
      setFeedback(l("两次输入的数字密码不一致。", "The two PINs do not match."));
      return;
    }
    if (!hasStoredPhrase) {
      setFeedback(l("请先保存恢复码，并确认不会把它发给别人。", "Save the recovery code first, and confirm that you will not share it with anyone."));
      return;
    }
    if (!window.lingDesktop?.accessLock) {
      setFeedback(l("当前是网页预览，不能在这台设备上开启密码加密。请使用 Ling 桌面版。", "This web preview cannot enable password encryption on this device. Please use the Ling desktop app."));
      return;
    }
    setIsBusy(true);
    try {
      const result = await window.lingDesktop.accessLock.setup({ password: pin, recoveryPhrase: recoveryCode });
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }
      onComplete();
    } catch {
      setFeedback(l("没有成功设置密码，请稍后重试。", "The password could not be set. Please try again."));
    } finally {
      setIsBusy(false);
    }
  }

  const canSubmit = /^\d{6,}$/u.test(pin) && pin === confirmPin && hasStoredPhrase && !isBusy;

  const content = (
    <div className={`launch-onboarding-page launch-security-page${presentation === "embedded" ? " is-embedded" : ""}`}>
      <header className="launch-onboarding-heading">
        <p className="launch-onboarding-kicker">{t("launch.security.kicker")}</p>
        <h1 id="launch-security-title">{l("为你的本地资料设置一把锁", "Lock your local information")}</h1>
        <p>{l("设置密码后，你的会谈、来信、记忆和设置会在本机加密保存。每次打开 Ling，都要输入密码才能解锁。", "After you set a password, your sessions, letters, memories, and settings are encrypted on this device. Each time you open Ling, you will unlock them with this password.")}</p>
      </header>

      <form className="launch-security-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="launch-security-fields">
            <label>
              <span>{l("数字密码", "PIN")}</span>
              <input autoComplete="new-password" autoFocus inputMode="numeric" onChange={(event) => setPin(event.target.value.replace(/\D/gu, ""))} pattern="[0-9]*" placeholder={l("至少 6 位数字", "At least 6 digits")} type="password" value={pin} />
            </label>
            <label>
              <span>{l("再次输入", "Enter it again")}</span>
              <input autoComplete="new-password" inputMode="numeric" onChange={(event) => setConfirmPin(event.target.value.replace(/\D/gu, ""))} pattern="[0-9]*" placeholder={l("再输入一次", "Type it again")} type="password" value={confirmPin} />
            </label>
          </div>

          <div className="launch-recovery-card">
            <span>{l("恢复码", "Recovery code")}</span>
            <code>{recoveryCode}</code>
            <button onClick={() => { setRecoveryCode(createRecoveryPhrase()); setHasStoredPhrase(false); }} type="button">{l("换一个", "Choose another")}</button>
            <p>{l("忘记密码、换新电脑或恢复备份时，都需要这个恢复码。请把它抄写或保存到安全的地方，不要发给别人。Ling 不会保存原文，也无法帮你找回。", "You will need this recovery code to reset your password, move to a new device, or restore a backup. Save it somewhere safe, and do not share it. Ling cannot retrieve it for you.")}</p>
            <label className="launch-recovery-confirm">
              <input checked={hasStoredPhrase} onChange={(event) => setHasStoredPhrase(event.target.checked)} type="checkbox" />
              <span>{l("我已保存恢复码，并且不会把它发给别人。", "I saved the recovery code, and I will not share it with anyone.")}</span>
            </label>
          </div>

          {feedback && <p className="launch-security-feedback" role="alert">{feedback}</p>}

          <div aria-label={t("launch.security.actionsLabel")} className="launch-onboarding-actions" role="group">
            <button className="launch-welcome-button is-primary" disabled={!canSubmit} type="submit">
              {isBusy ? l("正在设置……", "Setting up…") : l("设置完成，进入工作室", "Finish setup and enter the studio")}
            </button>
            {onSkip && (
              <button className="launch-security-skip" disabled={isBusy} onClick={onSkip} type="button">
                {l("稍后设置，先进工作室看看", "Set up later and visit the studio")}
              </button>
            )}
            <button className="launch-onboarding-back" disabled={isBusy} onClick={() => setIsPrivacyNoticeOpen(true)} type="button">
              {l("查看隐私说明", "View privacy notice")}
            </button>
            <button className="launch-onboarding-back" disabled={isBusy} onClick={onBack} type="button">{t("common.back")}</button>
          </div>
      </form>
      {isPrivacyNoticeOpen && <PrivacyNoticeDialog onClose={() => setIsPrivacyNoticeOpen(false)} />}
    </div>
  );

  if (presentation === "embedded") return content;

  return (
    <LaunchWelcomeShell
      footer={<span className="launch-welcome-progress" aria-label={t("launch.security.progressLabel")}>03 / 03</span>}
      labelledBy="launch-security-title"
    >
      {content}
    </LaunchWelcomeShell>
  );
}
