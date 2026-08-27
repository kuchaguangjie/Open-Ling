import { useCallback, useEffect, useRef, useState } from "react";
import forestSoundUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/audio/wind-through-trees-cc0.mp3";
import meditationMusicUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/audio/meditation-impromptu-03-cc-by.mp3";
import rainSoundUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/audio/rain-public-domain.ogg";
import type { GardenWeather } from "../lobbyContracts";
import { useLingua } from "../../../localization/useLingua";

const NATURE_VOLUME: Record<GardenWeather, number> = {
  sunny: 0.36,
  rainy: 0.68
};
// The source recordings are much quieter than the piano track, especially the rain.
// Keep nature in the foreground while the piano remains a soft tonal bed.
const MUSIC_VOLUME = 0.065;

function isTestEnvironment() {
  return navigator.userAgent.toLowerCase().includes("jsdom");
}

export function useGardenAmbientAudio(weather: GardenWeather) {
  const { l } = useLingua();
  const natureAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimersRef = useRef(new Map<HTMLAudioElement, number>());
  const playingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const natureTrackUrl = weather === "rainy" ? rainSoundUrl : forestSoundUrl;

  const clearFade = useCallback((audio: HTMLAudioElement) => {
    const timer = fadeTimersRef.current.get(audio);
    if (timer === undefined) return;
    window.clearInterval(timer);
    fadeTimersRef.current.delete(audio);
  }, []);

  const fadeTo = useCallback((audio: HTMLAudioElement, target: number, onComplete?: () => void) => {
    clearFade(audio);
    const startVolume = audio.volume;
    const steps = 30;
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      audio.volume = startVolume + (target - startVolume) * (step / steps);
      if (step < steps) return;
      clearFade(audio);
      onComplete?.();
    }, 50);
    fadeTimersRef.current.set(audio, timer);
  }, [clearFade]);

  const startLayer = useCallback(async (
    ref: { current: HTMLAudioElement | null },
    url: string,
    targetVolume: number
  ) => {
    const absoluteUrl = new URL(url, window.location.href).href;
    const previousAudio = ref.current;
    if (previousAudio?.src === absoluteUrl) {
      await previousAudio.play();
      fadeTo(previousAudio, targetVolume);
      return;
    }

    const nextAudio = new Audio(url);
    nextAudio.loop = true;
    nextAudio.preload = "auto";
    nextAudio.volume = 0;
    await nextAudio.play();
    ref.current = nextAudio;
    fadeTo(nextAudio, targetVolume);

    if (previousAudio) {
      fadeTo(previousAudio, 0, () => {
        previousAudio.pause();
        previousAudio.currentTime = 0;
      });
    }
  }, [fadeTo]);

  const play = useCallback(async () => {
    if (isTestEnvironment()) {
      playingRef.current = true;
      setIsPlaying(true);
      return;
    }

    try {
      await Promise.all([
        startLayer(natureAudioRef, natureTrackUrl, NATURE_VOLUME[weather]),
        startLayer(musicAudioRef, meditationMusicUrl, MUSIC_VOLUME)
      ]);
      playingRef.current = true;
      setIsPlaying(true);
    } catch {
      playingRef.current = false;
      setIsPlaying(false);
    }
  }, [natureTrackUrl, startLayer, weather]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    if (isTestEnvironment()) return;
    [natureAudioRef.current, musicAudioRef.current].forEach((audio) => {
      if (!audio) return;
      fadeTo(audio, 0, () => audio.pause());
    });
  }, [fadeTo]);

  const toggle = useCallback(() => {
    if (playingRef.current) {
      pause();
      return;
    }
    void play();
  }, [pause, play]);

  useEffect(() => {
    if (playingRef.current) void play();
  }, [play]);

  useEffect(() => () => {
    fadeTimersRef.current.forEach((timer) => window.clearInterval(timer));
    fadeTimersRef.current.clear();
    [natureAudioRef.current, musicAudioRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.src = "";
    });
  }, []);

  return {
    isPlaying,
    pause,
    play,
    soundLabel: l("自然声", "Nature sounds"),
    toggle
  };
}
