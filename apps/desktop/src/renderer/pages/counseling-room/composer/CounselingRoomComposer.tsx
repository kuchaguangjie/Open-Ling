import { useEffect, useRef, type ClipboardEvent, type RefObject } from "react";
import { ArrowUp, Microphone, Plus, Stop } from "@phosphor-icons/react";
import { formatVoiceShortcut, matchesVoiceShortcut } from "../../../features/voice-input/voiceShortcut";
import { useSettingsStore } from "../../../stores/settingsStore";
import { useLingua } from "../../../localization/useLingua";
import "./composer.css";
import { useLocalVoiceInput } from "./useLocalVoiceInput";

export interface PendingAttachmentView {
  id: string;
  name: string;
  size: number;
}

export interface CounselingRoomComposerProps {
  attachmentAcceptValue: string;
  attachmentError: string;
  attachmentNotice: string;
  draft: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  hasActiveSession: boolean;
  isBusyInAnotherSession: boolean;
  isComposerDisabled: boolean;
  isSendDisabled: boolean;
  isActiveSessionStreaming: boolean;
  isSessionEnded: boolean;
  pendingAttachments: PendingAttachmentView[];
  onAttachmentChange: (files: FileList | null) => void;
  onCancelStreaming: () => void;
  onDraftBlur: () => void;
  onDraftChange: (value: string) => void;
  onDraftFocus: () => void;
  onDraftPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSend: () => void;
}

export function CounselingRoomComposer(props: CounselingRoomComposerProps) {
  const { locale, t } = useLingua();
  const voiceShortcut = useSettingsStore((state) => state.voiceInput.shortcut);
  const voice = useLocalVoiceInput({
    disabled: props.isComposerDisabled || props.isActiveSessionStreaming,
    draft: props.draft,
    onDraftChange: props.onDraftChange
  });
  const handlePrimaryAction = () => {
    if (props.isActiveSessionStreaming) {
      props.onCancelStreaming();
      return;
    }
    voice.sendAfterStopping(props.onSend);
  };

  useEffect(() => {
    if (!voiceShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing || !matchesVoiceShortcut(event, voiceShortcut)) return;
      event.preventDefault();
      void voice.requestVoiceInput();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [voice.requestVoiceInput, voiceShortcut]);

  return (
    <div className={`input-area${voice.isActive ? " voice-active" : ""}`}>
      {props.pendingAttachments.length > 0 && (
        <div className="attachment-list" aria-label={t("composer.pendingAttachments")}>
          {props.pendingAttachments.map((attachment) => (
            <div className="attachment-chip" key={attachment.id}>
              <span>{attachment.name}</span><small>{formatAttachmentSize(attachment.size)}</small>
              <button type="button" aria-label={t("composer.removeAttachment").replace("{name}", attachment.name)} onClick={() => props.onRemoveAttachment(attachment.id)}>×</button>
            </div>
          ))}
        </div>
      )}
      {props.attachmentError && <p className="attachment-error" role="alert">{props.attachmentError}</p>}
      {props.attachmentNotice && <p className="attachment-notice" role="status">{props.attachmentNotice}</p>}
      <input
        accept={props.attachmentAcceptValue}
        aria-label={t("composer.chooseFile")}
        className="composer-file-input"
        disabled={props.isComposerDisabled}
        multiple
        onChange={(event) => { props.onAttachmentChange(event.target.files); event.target.value = ""; }}
        ref={props.fileInputRef}
        type="file"
      />
      <div className="composer-tools">
        <span className="composer-tool">
          <button className="composer-icon" type="button" aria-label={t("composer.addAttachment")} aria-describedby="composer-attachment-tip" disabled={props.isComposerDisabled} onClick={() => props.fileInputRef.current?.click()}>
            <Plus aria-hidden="true" weight="light" />
          </button>
          <span className="composer-tooltip" id="composer-attachment-tip" role="tooltip">
            <strong>{t("composer.addAttachment")}</strong>
            <small>{t("composer.attachmentHelp")}</small>
          </span>
        </span>
        <span className="composer-tool">
          <button
            className={`composer-icon voice-trigger${voice.isActive ? " is-listening" : ""}`}
            type="button"
            aria-label={t(voice.isActive ? "composer.voice.stopInput" : "composer.voice.startInput")}
            aria-describedby="composer-voice-tip"
            aria-pressed={voice.isActive}
            disabled={props.isComposerDisabled || props.isActiveSessionStreaming || voice.phase === "installing"}
            onClick={voice.requestVoiceInput}
          >
            {voice.isActive
              ? <Stop aria-hidden="true" weight="fill" />
              : <Microphone aria-hidden="true" weight="light" />}
          </button>
          <span className="composer-tooltip" id="composer-voice-tip" role="tooltip">
            <strong>{t(voice.isActive ? "composer.voice.stopDictation" : "composer.voice.title")}</strong>
            <small>{voiceShortcut
              ? t("composer.voice.shortcutHint").replace("{shortcut}", formatVoiceShortcut(voiceShortcut, locale))
              : t("composer.voice.clickHint")}</small>
          </span>
        </span>
      </div>
      <textarea
        aria-label={t("composer.input")}
        onBlur={props.onDraftBlur}
        onChange={(event) => voice.handleManualDraftChange(event.target.value)}
        onFocus={props.onDraftFocus}
        onPaste={props.onDraftPaste}
        onKeyDown={(event) => {
          if (props.isComposerDisabled) return;
          if (event.key === "Enter" && !event.shiftKey && !event.altKey) { event.preventDefault(); handlePrimaryAction(); }
        }}
        placeholder={!props.hasActiveSession ? "" : props.isSessionEnded ? t("composer.endedPlaceholder") : t("composer.placeholder")}
        disabled={props.isComposerDisabled}
        value={props.draft}
      />
      <VoiceInputStatus voice={voice} />
      <button
        className={`primary-action${!props.isSessionEnded && !props.isBusyInAnotherSession ? " primary-action-icon" : ""}`}
        type="button"
        aria-label={t(props.isActiveSessionStreaming ? "composer.stop" : "composer.send")}
        disabled={props.isSendDisabled}
        onClick={handlePrimaryAction}
      >
        {props.isSessionEnded
          ? t("composer.ended")
          : props.isBusyInAnotherSession
            ? t("composer.wait")
            : props.isActiveSessionStreaming
              ? <Stop aria-hidden="true" weight="fill" />
              : <ArrowUp aria-hidden="true" weight="bold" />}
      </button>
    </div>
  );
}

function VoiceInputStatus({
  voice
}: {
  voice: ReturnType<typeof useLocalVoiceInput>;
}) {
  const { locale, l } = useLingua();
  if (voice.phase === "idle") return <div className="voice-status-slot" aria-hidden="true" />;

  if (voice.phase === "install-prompt") {
    const isCloud = voice.runtimeStatus.provider !== "local";
    const providerName = getVoiceProviderName(voice.runtimeStatus.provider, locale);
    return (
      <div className="voice-status voice-install-prompt" role="status">
        <span>
          <strong>{isCloud
            ? l(`使用${providerName}语音识别`, `Use ${providerName} speech recognition`)
            : l("启用本地语音输入", "Enable local voice input")}</strong>
          <small>{isCloud
            ? l(`语音会实时发送给${providerName}并按你的账号计费，识别文字需确认后发送`, `Audio is sent to ${providerName} in real time and may be billed to your account. You can review recognized text before sending.`)
            : l("模型已随 Ling 安装；首次准备需要几秒，录音不会上传", "The model is included with Ling. Initial preparation may take a few seconds, and recordings are not uploaded.")}</small>
        </span>
        <button type="button" onClick={() => void voice.installAndStart()}>
          {isCloud ? l("同意并开始", "Agree and begin") : l("知道了，开始", "Got it, begin")}
        </button>
        <button className="voice-status-close" type="button" aria-label={l("关闭", "Close")} onClick={voice.closePrompt}>×</button>
      </div>
    );
  }

  if (voice.phase === "installing") {
    const progress = voice.modelStatus.totalBytes > 0
      ? Math.min(100, Math.round(voice.modelStatus.downloadedBytes / voice.modelStatus.totalBytes * 100))
      : 0;
    return (
      <div className="voice-status voice-download-status" role="status" aria-live="polite">
        <span>{voice.runtimeStatus.provider === "local"
          ? l(`正在准备本地语音组件… ${progress}%`, `Preparing local voice components… ${progress}%`)
          : l(`正在连接${getVoiceProviderName(voice.runtimeStatus.provider, locale)}…`, `Connecting to ${getVoiceProviderName(voice.runtimeStatus.provider, locale)}…`)}</span>
        <span className="voice-progress-track" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
      </div>
    );
  }

  if (voice.phase === "error") {
    return (
      <div className="voice-status voice-error-status" role="alert">
        <span>{voice.message}</span>
        <button className="voice-status-close" type="button" aria-label={l("关闭", "Close")} onClick={voice.closePrompt}>×</button>
      </div>
    );
  }

  const statusText = voice.phase === "requesting-permission"
    ? l("正在连接麦克风", "Connecting to the microphone")
    : l("正在听写", "Listening");
  return (
    <div className="voice-status voice-listening-status" role="status" aria-live="polite">
      <VoiceWaveform level={voice.audioLevel} />
      <span>{statusText}</span>
    </div>
  );
}

function getVoiceProviderName(
  provider: ReturnType<typeof useLocalVoiceInput>["runtimeStatus"]["provider"],
  locale: "zh-CN" | "en-US"
) {
  if (provider === "volcengine") return locale === "en-US" ? "Volcengine" : "火山引擎";
  if (provider === "tencent") return locale === "en-US" ? "Tencent Cloud" : "腾讯云";
  if (provider === "aliyun") return locale === "en-US" ? "Alibaba Cloud Model Studio" : "阿里云百炼";
  return locale === "en-US" ? "local model" : "本地模型";
}

function VoiceWaveform({ level }: { level: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  useEffect(() => {
    let animationFrame = 0;
    let displayedLevel = 0;
    const startedAt = performance.now();
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const density = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * density) || canvas.height !== Math.round(height * density)) {
        canvas.width = Math.round(width * density);
        canvas.height = Math.round(height * density);
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(density, 0, 0, density, 0, 0);
      context.clearRect(0, 0, width, height);
      displayedLevel += (levelRef.current - displayedLevel) * 0.16;
      const elapsed = (performance.now() - startedAt) / 1000;
      const barCount = 55;
      const gap = 4;
      const barWidth = 2;
      const totalWidth = barCount * barWidth + (barCount - 1) * gap;
      const startX = (width - totalWidth) / 2;
      context.fillStyle = "rgba(113, 151, 139, 0.66)";
      for (let index = 0; index < barCount; index += 1) {
        const distance = Math.abs(index - (barCount - 1) / 2) / ((barCount - 1) / 2);
        const envelope = Math.pow(1 - distance, 1.65);
        const motion = 0.72 + 0.28 * Math.sin(elapsed * 4.1 + index * 0.58);
        const barHeight = Math.max(2.6, 2.6 + displayedLevel * 18 * envelope * motion);
        const x = startX + index * (barWidth + gap);
        const y = (height - barHeight) / 2;
        context.beginPath();
        context.roundRect(x, y, barWidth, barHeight, 1);
        context.fill();
      }
      animationFrame = window.requestAnimationFrame(draw);
    };
    draw();
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return <canvas aria-hidden="true" className="voice-waveform-canvas" ref={canvasRef} />;
}

function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${Math.ceil(bytes / 1024 / 1024)} MB`;
}
