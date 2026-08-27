import { getDefaultCounselors } from "@shared/index";
import { LobbyFeatureSurface } from "./features/lobbyFeatureRegistry";
import { InformedConsentPage } from "./features/consent/InformedConsentPage";
import { ConsultationModelConnectionPage } from "./features/model-connection/ConsultationModelConnectionPage";
import { ConsultationBookingProgress } from "./features/booking/ConsultationBookingProgress";
import { LobbyFeatureFrame } from "./features/LobbyFeatureFrame";
import { OutdoorGarden } from "./garden/OutdoorGarden";
import { useLobbyController } from "./hooks/useLobbyController";
import { ReceptionDialogue } from "./reception/ReceptionDialogue";
import { LobbyStage } from "./shell/LobbyStage";
import { useLingua } from "../../localization/useLingua";
import { LaunchSecurityScreen } from "../../features/launch-onboarding/LaunchSecurityScreen";
import "../../features/launch-onboarding/launch-onboarding.css";

export function LobbyPage({
  consentPreview = false,
  onSecuritySetupComplete,
  requiresSecuritySetup = false
}: {
  consentPreview?: boolean;
  onSecuritySetupComplete?: () => void;
  requiresSecuritySetup?: boolean;
}) {
  const { locale, t } = useLingua();
  const lobby = useLobbyController({ onSecuritySetupComplete, requiresSecuritySetup });
  const receptionCounselor = getDefaultCounselors(locale).find((item) => item.id === lobby.receptionCounselorId);

  if (lobby.inGarden) {
    return <OutdoorGarden onBack={lobby.closeGarden} onToggleWeather={lobby.toggleWeather} weather={lobby.weather} />;
  }

  if (consentPreview) {
    return (
      <LobbyStage
        dialogueActive
        onOpenDialogue={lobby.openDialogue}
        onOpenFeature={lobby.openFeature}
        onOpenGarden={lobby.openGarden}
        onOpenSettings={lobby.openSettings}
        showReceptionPortrait={false}
      >
        <LobbyFeatureFrame
          archiveLabel={t("lobby.consentArchive")}
          className="lobby-overlay-consent"
          closeLabel={t("lobby.closeConsentPreview")}
          title={t("lobby.consentTitle")}
          unifiedStudioSurface
        >
          <InformedConsentPage onCancel={() => undefined} onConfirm={() => undefined} />
        </LobbyFeatureFrame>
      </LobbyStage>
    );
  }

  const dialogueActive = Boolean(
    lobby.dialogueFlow || lobby.activeFeatureId || lobby.showSecuritySetup || lobby.showModelConnection || lobby.showInformedConsent || lobby.isBooking
  );
  const receptionState = lobby.dialogueFlow
    ? lobby.showDialogueChoices ? "choosing" : "speaking"
    : "default";

  return (
    <LobbyStage
      dialogueActive={dialogueActive}
      onOpenDialogue={lobby.openDialogue}
      onOpenFeature={lobby.openFeature}
      onOpenGarden={lobby.openGarden}
      onOpenSettings={lobby.openSettings}
      receptionCounselorId={lobby.receptionCounselorId}
      receptionCounselorName={receptionCounselor?.name ?? t("common.counselor")}
      receptionState={receptionState}
      showReceptionPortrait={!dialogueActive || Boolean(lobby.dialogueFlow)}
    >
      {lobby.dialogueFlow && (
        <ReceptionDialogue
          autoAdvanceOnComplete={lobby.dialogueFlow === "firstVisit"}
          counselorId={lobby.receptionCounselorId}
          counselorName={receptionCounselor?.name ?? t("common.counselor")}
          onAdvance={lobby.advanceDialogue}
          options={lobby.dialogueOptions}
          showChoices={lobby.showDialogueChoices}
          text={lobby.dialogueText}
        />
      )}
      {lobby.activeFeatureId && (
        <LobbyFeatureSurface
          errorMessage={lobby.bookingError}
          featureId={lobby.activeFeatureId}
          isBooking={lobby.isBooking}
          onBook={lobby.bookAndEnterRoom}
          onClose={lobby.closeFeature}
          onCounselorChange={lobby.setSelectedCounselorId}
          onOpenLatestEnded={lobby.openLatestEndedConsultation}
          selectedCounselorId={lobby.selectedCounselorId}
        />
      )}
      {lobby.showInformedConsent && (
        <LobbyFeatureFrame
          archiveLabel={t("lobby.consentKeyPoints")}
          className="lobby-overlay-consent"
          closeLabel={t("lobby.closeConsent")}
          onClose={lobby.cancelInformedConsent}
          title={t("lobby.consentTitle")}
          unifiedStudioSurface
        >
          <InformedConsentPage
            onCancel={lobby.cancelInformedConsent}
            onConfirm={lobby.confirmInformedConsent}
          />
        </LobbyFeatureFrame>
      )}
      {lobby.showSecuritySetup && (
        <LobbyFeatureFrame
          archiveLabel={t("lobby.consentKeyPoints")}
          className="lobby-overlay-consent lobby-overlay-security-setup"
          closeLabel={t("lobby.notStart")}
          onClose={lobby.cancelSecuritySetup}
          title={t("launch.security.kicker")}
          unifiedStudioSurface
        >
          <LaunchSecurityScreen
            onBack={lobby.cancelSecuritySetup}
            onComplete={lobby.completeSecuritySetup}
            onSkip={lobby.skipSecuritySetup}
            presentation="embedded"
          />
        </LobbyFeatureFrame>
      )}
      {lobby.showModelConnection && (
        <LobbyFeatureFrame
          archiveLabel={t("lobby.modelArchive")}
          className="lobby-overlay-consultation-model"
          closeLabel={t("lobby.notStart")}
          onClose={lobby.cancelModelConnection}
          title={t("launch.model.title")}
          unifiedStudioSurface
        >
          <ConsultationModelConnectionPage
            onCancel={lobby.cancelModelConnection}
            onConnected={lobby.completeModelConnection}
          />
        </LobbyFeatureFrame>
      )}
      {lobby.isBooking && !lobby.dialogueFlow && !lobby.activeFeatureId && !lobby.showSecuritySetup && !lobby.showModelConnection && !lobby.showInformedConsent && (
        <LobbyFeatureFrame
          archiveLabel={t("lobby.bookingArchive")}
          className="lobby-overlay-booking-progress"
          closeLabel={t("lobby.closePreparation")}
          title={t("booking.preparing")}
        >
          <ConsultationBookingProgress
            counselorName={
              getDefaultCounselors(locale).find((item) => item.id === lobby.selectedCounselorId)?.name ??
              t("common.counselor")
            }
          />
        </LobbyFeatureFrame>
      )}
    </LobbyStage>
  );
}
