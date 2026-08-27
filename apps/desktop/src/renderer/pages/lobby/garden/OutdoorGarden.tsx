import type { GardenWeather } from "../lobbyContracts";
import { GardenBreathingPractice } from "./GardenBreathingPractice";
import { GardenSceneLayers } from "./GardenSceneLayers";
import { useGardenAmbientAudio } from "./useGardenAmbientAudio";
import { useGardenBreathingExercise } from "./useGardenBreathingExercise";
import "./outdoor-garden.css";
import { useLingua } from "../../../localization/useLingua";

export function OutdoorGarden({ onBack, onToggleWeather, weather }: { onBack: () => void; onToggleWeather: () => void; weather: GardenWeather }) {
  const { t } = useLingua();
  const isRainy = weather === "rainy";
  const exercise = useGardenBreathingExercise();
  const ambientAudio = useGardenAmbientAudio(weather);
  const isPracticing = exercise.status !== "idle";

  const startPractice = () => {
    exercise.start();
    void ambientAudio.play();
  };

  const exitPractice = () => {
    ambientAudio.pause();
    exercise.reset();
  };

  return (
    <section
      aria-label={t("garden.title")}
      className={`lobby-garden lobby-garden-${weather}${isPracticing ? " lobby-garden-practicing" : ""} ling-motion-page-enter`}
    >
      <GardenSceneLayers weather={weather} />
      <div className="lobby-garden-toolbar">
        <button onClick={onBack} type="button">{t("garden.back")}</button>
        <button aria-label={t(isRainy ? "garden.switchSunny" : "garden.switchRainy")} onClick={onToggleWeather} type="button">
          {t(isRainy ? "garden.sunny" : "garden.rainy")}
        </button>
      </div>
      {isPracticing ? (
        <GardenBreathingPractice
          exercise={exercise}
          musicPlaying={ambientAudio.isPlaying}
          onExit={exitPractice}
          onMusicToggle={ambientAudio.toggle}
          soundLabel={ambientAudio.soundLabel}
        />
      ) : (
        <div className="lobby-garden-copy ling-motion-content-swap">
          <p>{t("garden.title")}</p>
          <h1>{t(isRainy ? "garden.rainHeading" : "garden.sunHeading")}</h1>
          <span>{t("garden.breathingIntro")}</span>
          <div className="lobby-garden-entry">
            <button onClick={startPractice} type="button">{t("garden.startBreathing")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
