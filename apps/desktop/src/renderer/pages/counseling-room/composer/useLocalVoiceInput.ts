import { useCallback, useEffect, useRef, useState } from "react";
import type { VoiceInputRuntimeStatus, VoiceModelStatus, VoiceRecognitionEvent } from "@shared/index";
import { useLingua } from "../../../localization/useLingua";

type VoiceInputPhase =
  | "idle"
  | "install-prompt"
  | "installing"
  | "requesting-permission"
  | "listening"
  | "stopping"
  | "error";

interface UseLocalVoiceInputOptions {
  disabled: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
}

const initialModelStatus: VoiceModelStatus = {
  state: "not-installed",
  downloadedBytes: 0,
  totalBytes: 0
};
const initialRuntimeStatus: VoiceInputRuntimeStatus = {
  provider: "local",
  cloudConfigured: false,
  localModel: initialModelStatus
};

export function useLocalVoiceInput(options: UseLocalVoiceInputOptions) {
  const { locale, l } = useLingua();
  const [phase, setPhase] = useState<VoiceInputPhase>("idle");
  const [modelStatus, setModelStatus] = useState<VoiceModelStatus>(initialModelStatus);
  const [runtimeStatus, setRuntimeStatus] = useState<VoiceInputRuntimeStatus>(initialRuntimeStatus);
  const [message, setMessage] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const sessionIdRef = useRef("");
  const draftRef = useRef(options.draft);
  const baseDraftRef = useRef("");
  const committedSpeechRef = useRef("");
  const partialSpeechRef = useRef("");
  const partialTargetRef = useRef("");
  const partialAnimationTimerRef = useRef<number | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const acceptingEventsRef = useRef(false);
  const mountedRef = useRef(true);
  const lastLevelUpdateRef = useRef(0);
  const onDraftChangeRef = useRef(options.onDraftChange);

  draftRef.current = options.draft;
  onDraftChangeRef.current = options.onDraftChange;

  useEffect(() => {
    mountedRef.current = true;
    const voiceApi = window.lingDesktop?.voice;
    if (!voiceApi) return () => { mountedRef.current = false; };

    if (voiceApi.getRuntimeStatus) {
      void voiceApi.getRuntimeStatus().then((result) => {
        if (mountedRef.current && result.ok) {
          setRuntimeStatus(result.data);
          setModelStatus(result.data.localModel);
        }
      });
    } else {
      void voiceApi.getModelStatus().then((result) => {
        if (mountedRef.current && result.ok) setModelStatus(result.data);
      });
    }
    const unsubscribe = voiceApi.onModelProgress((status) => {
      if (mountedRef.current) setModelStatus(status);
    });
    return () => {
      mountedRef.current = false;
      unsubscribe();
      acceptingEventsRef.current = false;
      clearPartialAnimation();
      stopAudioCapture();
      const sessionId = sessionIdRef.current;
      if (sessionId) void voiceApi.stopRecognition(sessionId);
    };
  }, []);

  const applySpeechDraft = useCallback(() => {
    const speech = `${committedSpeechRef.current}${partialSpeechRef.current}`;
    onDraftChangeRef.current(joinDraftAndSpeech(baseDraftRef.current, speech));
  }, []);

  const animatePartialSpeech = useCallback((target: string) => {
    partialTargetRef.current = target;
    if (partialAnimationTimerRef.current !== null) return;

    const revealNext = () => {
      const current = partialSpeechRef.current;
      const latestTarget = partialTargetRef.current;
      if (current === latestTarget) {
        partialAnimationTimerRef.current = null;
        return;
      }

      if (latestTarget.startsWith(current)) {
        const remaining = latestTarget.length - current.length;
        const revealCount = remaining > 10 ? 3 : remaining > 5 ? 2 : 1;
        partialSpeechRef.current = latestTarget.slice(0, current.length + revealCount);
      } else {
        // Recognition corrections should replace stale text immediately.
        partialSpeechRef.current = latestTarget;
      }
      applySpeechDraft();
      partialAnimationTimerRef.current = window.setTimeout(revealNext, 32);
    };

    revealNext();
  }, [applySpeechDraft]);

  const handleRecognitionEvent = useCallback((event: VoiceRecognitionEvent) => {
    if (!acceptingEventsRef.current || event.sessionId !== sessionIdRef.current) return;
    if (event.type === "partial") {
      animatePartialSpeech(event.text);
      return;
    }
    if (event.type === "final") {
      clearPartialAnimation();
      committedSpeechRef.current = joinSpeechSegments(committedSpeechRef.current, event.text);
      partialSpeechRef.current = "";
      partialTargetRef.current = "";
      applySpeechDraft();
      return;
    }
    if (event.type === "error") {
      acceptingEventsRef.current = false;
      clearPartialAnimation();
      stopAudioCapture();
      sessionIdRef.current = "";
      setMessage(localizedVoiceErrorMessage(event.message, locale));
      setPhase("error");
      return;
    }
    if (event.type === "stopped") {
      acceptingEventsRef.current = false;
      clearPartialAnimation();
      stopAudioCapture();
      sessionIdRef.current = "";
      setAudioLevel(0);
      setPhase("idle");
      setMessage("");
    }
  }, [animatePartialSpeech, applySpeechDraft, locale]);

  const startListening = useCallback(async () => {
    const voiceApi = window.lingDesktop?.voice;
    if (!voiceApi) {
      setMessage(l("语音输入只能在 Ling 桌面 App 中使用。", "Voice input is available only in the Ling desktop app."));
      setPhase("error");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(l("当前系统无法访问麦克风。", "This system cannot access a microphone."));
      setPhase("error");
      return;
    }

    setMessage("");
    setPhase("requesting-permission");
    try {
      if (stopPromiseRef.current) await stopPromiseRef.current;
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      if (!mountedRef.current || options.disabled) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setPhase("idle");
        return;
      }

      const audioContext = new AudioContext();
      const sessionId = createVoiceSessionId();
      sessionIdRef.current = sessionId;
      baseDraftRef.current = draftRef.current;
      committedSpeechRef.current = "";
      partialSpeechRef.current = "";
      partialTargetRef.current = "";
      acceptingEventsRef.current = true;

      const startResult = await voiceApi.startRecognition({
        sessionId,
        sampleRate: audioContext.sampleRate
      }, handleRecognitionEvent);
      if (!startResult.ok) {
        acceptingEventsRef.current = false;
        mediaStream.getTracks().forEach((track) => track.stop());
        await audioContext.close();
        sessionIdRef.current = "";
        setMessage(localizedVoiceErrorMessage(startResult.error.message, locale));
        setPhase("error");
        return;
      }

      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      processor.onaudioprocess = (event) => {
        if (!acceptingEventsRef.current) return;
        const samples = new Float32Array(event.inputBuffer.getChannelData(0));
        voiceApi.sendAudio({ sessionId, samples });
        updateAudioLevel(samples);
      };
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      audioStreamRef.current = mediaStream;
      processorRef.current = processor;
      sourceRef.current = source;
      silentGainRef.current = silentGain;
      setPhase("listening");
    } catch (error) {
      acceptingEventsRef.current = false;
      stopAudioCapture();
      sessionIdRef.current = "";
      setMessage(microphoneErrorMessage(error, locale));
      setPhase("error");
    }
  }, [handleRecognitionEvent, l, locale, options.disabled]);

  const requestVoiceInput = useCallback(async () => {
    if (options.disabled) return;
    if (phase === "listening" || phase === "requesting-permission" || phase === "stopping") {
      void stopListening();
      return;
    }
    const statusResult = await window.lingDesktop?.voice?.getRuntimeStatus?.();
    const currentRuntime = statusResult?.ok ? statusResult.data : runtimeStatus;
    if (statusResult?.ok) {
      setRuntimeStatus(statusResult.data);
      setModelStatus(statusResult.data.localModel);
    }
    const explanationKey = `ling.voice.first-use.${currentRuntime.provider}.v1`;
    const needsExplanation = localStorage.getItem(explanationKey) !== "acknowledged";
    if (needsExplanation || (currentRuntime.provider === "local" && currentRuntime.localModel.state !== "ready")) {
      setMessage("");
      setPhase("install-prompt");
      return;
    }
    await startListening();
  }, [options.disabled, phase, runtimeStatus, startListening]);

  const installAndStart = useCallback(async () => {
    const voiceApi = window.lingDesktop?.voice;
    if (!voiceApi) {
      setMessage(l("语音输入只能在 Ling 桌面 App 中使用。", "Voice input is available only in the Ling desktop app."));
      setPhase("error");
      return;
    }
    setMessage("");
    setPhase("installing");
    try {
      localStorage.setItem(`ling.voice.first-use.${runtimeStatus.provider}.v1`, "acknowledged");
      if (runtimeStatus.provider === "local" && modelStatus.state !== "ready") {
        const result = await voiceApi.installModel();
        if (!result.ok) {
          setMessage(localizedVoiceErrorMessage(result.error.message, locale));
          setPhase("error");
          return;
        }
        setModelStatus(result.data);
      }
      await startListening();
    } catch {
      setMessage(runtimeStatus.provider === "local"
        ? l("本地语音组件准备失败，请重新安装 Ling 后重试。", "Local voice components could not be prepared. Reinstall Ling and try again.")
        : l("云端语音识别没有启动，请检查“设置 → 语音输入”中的服务商配置。", "Cloud speech recognition did not start. Check the provider configuration under Settings → Voice input."));
      setPhase("error");
    }
  }, [l, locale, modelStatus.state, runtimeStatus.provider, startListening]);

  const stopListening = useCallback(async () => {
    const voiceApi = window.lingDesktop?.voice;
    const sessionId = sessionIdRef.current;
    if (!voiceApi || !sessionId) {
      stopAudioCapture();
      setPhase("idle");
      return;
    }
    // Audio capture and the visible listening state stop immediately. Recognition
    // gets a short background window to settle its final partial without making
    // the composer look blocked.
    setPhase("idle");
    setMessage("");
    setAudioLevel(0);
    stopAudioCapture();
    const stopPromise = voiceApi.stopRecognition(sessionId).then((result) => {
      if (!result.ok && mountedRef.current && sessionIdRef.current === sessionId) {
        acceptingEventsRef.current = false;
        sessionIdRef.current = "";
        setMessage(localizedVoiceErrorMessage(result.error.message, locale));
        setPhase("error");
      }
    });
    stopPromiseRef.current = stopPromise;
    await stopPromise.finally(() => {
      if (stopPromiseRef.current === stopPromise) stopPromiseRef.current = null;
    });
  }, [locale]);

  const handleManualDraftChange = useCallback((value: string) => {
    if (
      phase === "listening" ||
      phase === "requesting-permission" ||
      phase === "stopping" ||
      (Boolean(sessionIdRef.current) && acceptingEventsRef.current)
    ) {
      acceptingEventsRef.current = false;
      baseDraftRef.current = value;
      committedSpeechRef.current = "";
      partialSpeechRef.current = "";
      partialTargetRef.current = "";
      clearPartialAnimation();
      if (phase !== "idle") void stopListening();
    }
    onDraftChangeRef.current(value);
  }, [phase, stopListening]);

  const sendAfterStopping = useCallback((send: () => void) => {
    if (phase !== "listening" && phase !== "requesting-permission" && phase !== "stopping") {
      send();
      return;
    }
    acceptingEventsRef.current = false;
    void stopListening().finally(send);
  }, [phase, stopListening]);

  const closePrompt = useCallback(() => {
    if (phase === "installing") return;
    setMessage("");
    setPhase("idle");
  }, [phase]);

  useEffect(() => {
    if (!options.disabled) return;
    if (phase === "listening" || phase === "requesting-permission" || phase === "stopping") {
      acceptingEventsRef.current = false;
      void stopListening();
    } else if (phase === "install-prompt") {
      setPhase("idle");
    }
  }, [options.disabled, phase, stopListening]);

  return {
    audioLevel,
    closePrompt,
    handleManualDraftChange,
    installAndStart,
    isActive: phase === "listening" || phase === "requesting-permission" || phase === "stopping",
    message,
    modelStatus,
    runtimeStatus,
    phase,
    requestVoiceInput,
    sendAfterStopping
  };

  function updateAudioLevel(samples: Float32Array) {
    const now = performance.now();
    if (now - lastLevelUpdateRef.current < 70) return;
    lastLevelUpdateRef.current = now;
    let sum = 0;
    for (const sample of samples) sum += sample * sample;
    const rms = Math.sqrt(sum / Math.max(samples.length, 1));
    setAudioLevel(Math.min(1, rms * 8));
  }

  function stopAudioCapture() {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    silentGainRef.current?.disconnect();
    silentGainRef.current = null;
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
  }

  function clearPartialAnimation() {
    if (partialAnimationTimerRef.current !== null) {
      window.clearTimeout(partialAnimationTimerRef.current);
      partialAnimationTimerRef.current = null;
    }
  }
}

export function joinDraftAndSpeech(draft: string, speech: string) {
  if (!speech) return draft;
  if (!draft) return speech;
  if (/\s$/u.test(draft)) return `${draft}${speech}`;
  const needsSpace = /[a-zA-Z0-9]$/u.test(draft) && /^[a-zA-Z0-9]/u.test(speech);
  return `${draft}${needsSpace ? " " : ""}${speech}`;
}

export function joinSpeechSegments(current: string, next: string) {
  if (!current) return next;
  if (!next) return current;
  const needsSpace = /[a-zA-Z0-9]$/u.test(current) && /^[a-zA-Z0-9]/u.test(next);
  return `${current}${needsSpace ? " " : ""}${next}`;
}

function createVoiceSessionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function microphoneErrorMessage(error: unknown, locale: "zh-CN" | "en-US") {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return locale === "en-US"
      ? "Ling does not have microphone permission. Allow microphone access in System Settings."
      : "没有获得麦克风权限。请在系统设置中允许 Ling 使用麦克风。";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return locale === "en-US" ? "No available microphone was found." : "没有找到可用的麦克风。";
  }
  return locale === "en-US"
    ? "Voice input could not start. Check the microphone and try again."
    : "无法开始语音输入，请检查麦克风后重试。";
}

function localizedVoiceErrorMessage(message: string, locale: "zh-CN" | "en-US") {
  if (locale !== "en-US") return message;
  if (/火山引擎/u.test(message)) {
    return "Volcengine speech recognition could not start. Check the App ID, Access Token, and enabled resources under Settings → Voice input.";
  }
  if (/腾讯云/u.test(message)) {
    return "Tencent Cloud speech recognition could not start. Check the AppID, SecretID, and SecretKey under Settings → Voice input.";
  }
  if (/阿里云|百炼/u.test(message)) {
    return "Alibaba Cloud Model Studio speech recognition could not start. Check the API key, region, and workspace under Settings → Voice input.";
  }
  if (/本地语音/u.test(message)) {
    return "Local speech recognition could not start. Reinstall Ling if the problem continues.";
  }
  if (/会话无效/u.test(message)) return "The voice-recognition session is no longer valid.";
  if (/正在进行语音输入/u.test(message)) return "Voice input is already active.";
  return "Voice input could not start. Check Settings → Voice input and try again.";
}
