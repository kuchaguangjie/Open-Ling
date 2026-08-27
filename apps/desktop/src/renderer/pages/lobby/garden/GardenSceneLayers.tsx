import rainyCanopyLeftUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/redesign/garden-rainy-canopy-local-motion-v1.png";
import rainyGardenUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/redesign/garden-rainy-hybrid-motion-base-v1.png";
import sunnyCanopyLeftUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/redesign/garden-sunny-canopy-local-motion-v1.png";
import sunnyGardenUrl from "../../../../../../../assets/runtime/lobby/outdoor-garden/redesign/garden-sunny-hybrid-motion-base-v1.png";
import type { GardenWeather } from "../lobbyContracts";

export function GardenSceneLayers({ weather }: { weather: GardenWeather }) {
  const isRainy = weather === "rainy";
  const canopyLeftUrl = isRainy ? rainyCanopyLeftUrl : sunnyCanopyLeftUrl;
  const gardenUrl = isRainy ? rainyGardenUrl : sunnyGardenUrl;

  return (
    <div aria-hidden="true" className="garden-scene-layers" data-testid="garden-scene-layers" data-weather={weather}>
      <img alt="" className="garden-scene-background" data-testid="garden-scene-background" src={gardenUrl} />
      <img alt="" className="garden-canopy garden-canopy-local-breeze" data-testid="garden-canopy-single" src={canopyLeftUrl} />
      {!isRainy ? (
        <div className="garden-dapple" />
      ) : null}
    </div>
  );
}
