import { FormEvent, useState } from "react";
import "./access-lock.css";
import { useLingua } from "../../localization/useLingua";

type AccessMode = "password" | "recovery";

export function AccessLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const { t } = useLingua();
  const [mode, setMode] = useState<AccessMode>("password");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.lingDesktop?.accessLock) return;
    setIsBusy(true);
    setFeedback("");
    try {
      const result = await window.lingDesktop.accessLock.unlock(password);
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }
      onUnlocked();
    } catch {
      setFeedback(t("lock.verifyError"));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.lingDesktop?.accessLock) return;
    if (newPassword !== confirmPassword) {
      setFeedback(t("lock.passwordMismatch"));
      return;
    }
    setIsBusy(true);
    setFeedback("");
    try {
      const result = await window.lingDesktop.accessLock.recover({
        recoveryPhrase: recoveryCode.trim(),
        newPassword
      });
      if (!result.ok) {
        setFeedback(result.error.message);
        return;
      }
      onUnlocked();
    } catch {
      setFeedback(t("lock.recoveryError"));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section aria-label={t("lock.aria")} className="access-lock-screen">
      <div className="access-lock-dialogue" role="dialog" aria-modal="true" aria-labelledby="access-lock-title">
        <header className="access-lock-dialogue-heading">
          <p>{t("brand.studio")}</p>
          <h1 id="access-lock-title">{t(mode === "password" ? "lock.welcome" : "lock.resetTitle")}</h1>
          <span aria-hidden="true" />
        </header>

        {mode === "password" ? (
          <form className="access-lock-form" onSubmit={(event) => void handlePasswordSubmit(event)}>
            <p>{t("lock.passwordBody")}</p>
            <label>
              <span>{t("lock.password")}</span>
              <input autoComplete="current-password" autoFocus inputMode="numeric" onChange={(event) => setPassword(event.target.value.replace(/\D/gu, ""))} pattern="[0-9]*" type="password" value={password} />
            </label>
            <button className="access-lock-primary" disabled={isBusy || !password} type="submit">
              {t(isBusy ? "lock.opening" : "lock.enter")}
            </button>
            <button className="access-lock-link" disabled={isBusy} onClick={() => { setFeedback(""); setMode("recovery"); }} type="button">
              {t("lock.forgot")}
            </button>
          </form>
        ) : (
          <form className="access-lock-form" onSubmit={(event) => void handleRecoverySubmit(event)}>
            <p>{t("lock.recoveryBody")}</p>
            <label>
              <span>{t("lock.recoveryCode")}</span>
              <input autoComplete="off" onChange={(event) => setRecoveryCode(event.target.value)} placeholder={t("lock.recoveryCodePlaceholder")} value={recoveryCode} />
            </label>
            <label>
              <span>{t("lock.newPassword")}</span>
              <input autoComplete="new-password" inputMode="numeric" onChange={(event) => setNewPassword(event.target.value.replace(/\D/gu, ""))} pattern="[0-9]*" type="password" value={newPassword} />
            </label>
            <label>
              <span>{t("lock.confirmPassword")}</span>
              <input autoComplete="new-password" inputMode="numeric" onChange={(event) => setConfirmPassword(event.target.value.replace(/\D/gu, ""))} pattern="[0-9]*" type="password" value={confirmPassword} />
            </label>
            <button className="access-lock-primary" disabled={isBusy || !recoveryCode || !newPassword || !confirmPassword} type="submit">
              {t(isBusy ? "lock.checking" : "lock.verifyAndSet")}
            </button>
            <button className="access-lock-link" disabled={isBusy} onClick={() => { setFeedback(""); setMode("password"); }} type="button">
              {t("lock.back")}
            </button>
          </form>
        )}
        {feedback && <p className="access-lock-feedback" role="alert">{feedback}</p>}
      </div>
    </section>
  );
}
