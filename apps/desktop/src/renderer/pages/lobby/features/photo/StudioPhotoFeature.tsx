import { useState } from "react";
import overheadTablePhotoUrl from "../../../../../../../../assets/runtime/lobby/waiting-room/counselor-team-photo-overhead-table-v1.png";
import shoulderHuddlePhotoUrl from "../../../../../../../../assets/runtime/lobby/waiting-room/counselor-team-photo-shoulder-huddle-v1.png";
import teaCandidPhotoUrl from "../../../../../../../../assets/runtime/lobby/waiting-room/counselor-team-photo-tea-candid-v1.png";
import { StudioSignature } from "../shared/StudioSignature";
import "./studio-photo.css";
import { useLingua } from "../../../../localization/useLingua";

const teamPhotos = [
  {
    altKey: "photo.altOverhead",
    objectPosition: "50% 0%",
    selectorKey: "photo.showOverhead",
    src: overheadTablePhotoUrl
  },
  {
    altKey: "photo.altTea",
    objectPosition: "50% 10%",
    selectorKey: "photo.showTea",
    src: teaCandidPhotoUrl
  },
  {
    altKey: "photo.altHuddle",
    objectPosition: "50% 0%",
    selectorKey: "photo.showHuddle",
    src: shoulderHuddlePhotoUrl
  }
] as const;

export function StudioPhotoFeature() {
  const { t } = useLingua();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const showPreviousPhoto = () => {
    setActivePhotoIndex((current) => (current - 1 + teamPhotos.length) % teamPhotos.length);
  };

  const showNextPhoto = () => {
    setActivePhotoIndex((current) => (current + 1) % teamPhotos.length);
  };

  return (
    <section aria-labelledby="studio-photo-title" className="studio-photo-shell">
      <header className="studio-photo-header">
        <h2 id="studio-photo-title">{t("photo.heading")}</h2>
        <p>{t("photo.subheading")}</p>
      </header>

      <div className="studio-photo-content">
        <figure className="studio-photo-frame">
          <div className="studio-photo-stage">
            {teamPhotos.map((photo, index) => (
              <img
                alt={index === activePhotoIndex ? t(photo.altKey) : ""}
                aria-hidden={index !== activePhotoIndex}
                className={`lobby-team-selfie${index === activePhotoIndex ? " is-active" : ""}`}
                key={photo.src}
                src={photo.src}
                style={{ objectPosition: photo.objectPosition }}
              />
            ))}
            <button
              aria-label={t("photo.previous")}
              className="studio-photo-nav studio-photo-nav-previous"
              onClick={showPreviousPhoto}
              type="button"
            >
              <span aria-hidden="true">&#8592;</span>
            </button>
            <button
              aria-label={t("photo.next")}
              className="studio-photo-nav studio-photo-nav-next"
              onClick={showNextPhoto}
              type="button"
            >
              <span aria-hidden="true">&#8594;</span>
            </button>
          </div>
          <figcaption>
            <span>{t("photo.caption")}</span>
            <span aria-live="polite" className="studio-photo-count">
              {t("photo.current")} {activePhotoIndex + 1} / {teamPhotos.length}
            </span>
            <span aria-label={t("photo.selectorLabel")} className="studio-photo-pagination" role="group">
              {teamPhotos.map((photo, index) => (
                <button
                  aria-current={index === activePhotoIndex ? "true" : undefined}
                  aria-label={t(photo.selectorKey)}
                  className={index === activePhotoIndex ? "is-active" : undefined}
                  key={photo.src}
                  onClick={() => setActivePhotoIndex(index)}
                  type="button"
                />
              ))}
            </span>
          </figcaption>
        </figure>

        <aside className="studio-photo-copy" aria-label={t("photo.descriptionLabel")}>
          <p className="studio-photo-kicker">{t("photo.kicker")}</p>
          <h3>{t("photo.copyTitle")}</h3>
          <p>{t("photo.copy1")}</p>
          <p>{t("photo.copy2")}</p>
        </aside>
      </div>

      <footer className="studio-photo-footer">
        <StudioSignature label="STUDIO PHOTO ARCHIVE" />
        <p>{t("photo.footer")}</p>
      </footer>
    </section>
  );
}
