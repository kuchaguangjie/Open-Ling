import type { ReactNode } from "react";
import { BookcaseFeature } from "./bookcase/BookcaseFeature";
import { CounselorIntroductionFeature } from "./counselors/CounselorIntroductionFeature";
import { LobbyFeatureFrame } from "./LobbyFeatureFrame";
import { StudioPhotoFeature } from "./photo/StudioPhotoFeature";
import { ResourceTableFeature } from "./resources/ResourceTableFeature";
import { ConsultationRecordsFeature } from "./sofa-records/ConsultationRecordsFeature";
import { SofaLettersFeature } from "./sofa-letters/SofaLettersFeature";
import { useLingua } from "../../../localization/useLingua";
import type { TranslationKey } from "../../../localization/catalogs/zh-CN";

interface LobbyFeatureContext {
  errorMessage?: string | null;
  isBooking?: boolean;
  onBook: (counselorId: string) => void;
  onCounselorChange: (counselorId: string) => void;
  onOpenLatestEnded?: (counselorId: string) => void;
  selectedCounselorId: string;
}

interface LobbyFeatureDefinition {
  archiveLabel: TranslationKey;
  closeLabel: TranslationKey;
  render: (context: LobbyFeatureContext) => ReactNode;
  title: TranslationKey;
}

export const lobbyFeatureRegistry = {
  bookcase: {
    archiveLabel: "features.bookcase.archive",
    closeLabel: "features.bookcase.close",
    title: "features.bookcase.title",
    render: () => <BookcaseFeature />
  },
  resources: {
    archiveLabel: "features.resources.archive",
    closeLabel: "features.resources.close",
    title: "features.resources.title",
    render: () => <ResourceTableFeature />
  },
  photo: {
    archiveLabel: "features.photo.archive",
    closeLabel: "features.photo.close",
    title: "features.photo.title",
    render: () => <StudioPhotoFeature />
  },
  counselors: {
    archiveLabel: "features.counselors.archive",
    closeLabel: "features.counselors.close",
    title: "features.counselors.title",
    render: (context) => <CounselorIntroductionFeature mode="introduction" {...context} />
  },
  booking: {
    archiveLabel: "features.counselors.archive",
    closeLabel: "features.counselors.close",
    title: "features.booking.title",
    render: (context) => <CounselorIntroductionFeature mode="booking" {...context} />
  },
  letters: {
    archiveLabel: "features.letters.archive",
    closeLabel: "features.letters.close",
    title: "features.letters.title",
    render: () => <SofaLettersFeature />
  },
  records: {
    archiveLabel: "features.records.archive",
    closeLabel: "features.records.close",
    title: "features.records.title",
    render: () => <ConsultationRecordsFeature />
  }
} satisfies Record<string, LobbyFeatureDefinition>;

export type LobbyFeatureId = keyof typeof lobbyFeatureRegistry;

export function LobbyFeatureSurface({
  errorMessage,
  featureId,
  isBooking,
  onBook,
  onClose,
  onCounselorChange,
  onOpenLatestEnded,
  selectedCounselorId
}: LobbyFeatureContext & { featureId: LobbyFeatureId; onClose: () => void }) {
  const { t } = useLingua();
  const definition = lobbyFeatureRegistry[featureId];
  return (
    <LobbyFeatureFrame
      archiveLabel={t(definition.archiveLabel)}
      className={`lobby-overlay-${featureId}`}
      closeLabel={t(definition.closeLabel)}
      onClose={onClose}
      title={t(definition.title)}
      unifiedStudioSurface={featureId === "letters" || featureId === "records" || featureId === "resources" || featureId === "bookcase" || featureId === "photo"}
    >
      {definition.render({ errorMessage, isBooking, onBook, onCounselorChange, onOpenLatestEnded, selectedCounselorId })}
    </LobbyFeatureFrame>
  );
}
