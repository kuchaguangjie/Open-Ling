import { useState } from "react";
import chevronIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/chevron-transparent-v1.png";
import groupIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/group-transparent-v1.png";
import heartMarkerIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/heart-marker-transparent-v1.png";
import homeIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/home-transparent-v1.png";
import personIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/person-transparent-v1.png";
import phoneIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/phone-transparent-v1.png";
import shieldIconUrl from "../../../../../../../../assets/runtime/lobby/resource-table/crisis-support/icons/shield-transparent-v1.png";
import { useLingua } from "../../../../localization/useLingua";
import {
  getCrisisSupportContent,
  type CrisisSupportContact,
  type CrisisSupportSituation
} from "./crisisSupportContent";
import { ResourceDocumentReaderLayout } from "./ResourceDocumentReaderLayout";

const situationIconUrls: Record<CrisisSupportSituation["icon"], string> = {
  person: personIconUrl,
  shield: shieldIconUrl,
  home: homeIconUrl,
  group: groupIconUrl
};

function ContactRow({ contact }: { contact: CrisisSupportContact }) {
  return (
    <article
      aria-label={`${contact.numbers.join(" ")} ${contact.label}`}
      className="crisis-support-contact"
    >
      <span aria-hidden="true" className="crisis-support-contact-icon">
        <img alt="" src={phoneIconUrl} />
      </span>
      <div className={`crisis-support-contact-numbers${contact.numbers.length > 1 ? " crisis-support-contact-numbers-multiple" : ""}`}>
        {contact.numbers.map((number) => <strong key={number}>{number}</strong>)}
      </div>
      <div className="crisis-support-contact-copy">
        <h4>{contact.label}</h4>
        <p>{contact.description}</p>
        {contact.note && <small>{contact.note}</small>}
      </div>
    </article>
  );
}

export function CrisisSupportReader({ onBack }: { onBack: () => void }) {
  const { locale, t } = useLingua();
  const [activePage, setActivePage] = useState<"immediate" | "situations" | "contacts" | "limit">("immediate");
  const {
    emergencyContacts,
    hotlineContacts,
    situations,
    verification
  } = getCrisisSupportContent(locale);
  const navigationItems = [
    { id: "immediate" as const, number: "01", title: t("crisis.immediateTitle") },
    { id: "situations" as const, number: "02", title: t("crisis.situationsTitle") },
    { id: "contacts" as const, number: "03", title: t("crisis.contactsTitle") },
    { id: "limit" as const, number: "04", title: t("crisis.limitTitle") }
  ];
  const navigation = (
    <div className="crisis-support-navigation">
      <p>{t("crisis.directoryLabel")}</p>
      {navigationItems.map((item) => (
        <button
          aria-current={activePage === item.id ? "page" : undefined}
          aria-label={item.title}
          key={item.id}
          onClick={() => setActivePage(item.id)}
          type="button"
        >
          <span>{item.number}</span>
          <strong>{item.title}</strong>
        </button>
      ))}
    </div>
  );

  return (
    <ResourceDocumentReaderLayout
      ariaLabel={t("crisis.title")}
      contentKey={activePage}
      navigation={navigation}
      navigationLabel={t("crisis.directory")}
      onBack={onBack}
      title={t("crisis.title")}
      version="2026.07.31"
    >
      <div className="crisis-support-page">
        {activePage === "immediate" && (
          <section aria-labelledby="crisis-immediate-heading" className="crisis-support-immediate">
            <span aria-hidden="true" className="crisis-support-immediate-icon">
              <img alt="" src={phoneIconUrl} />
            </span>
            <div className="crisis-support-immediate-copy">
              <h3 id="crisis-immediate-heading">{t("crisis.immediateTitle")}</h3>
              <p>{t("crisis.immediateBody")}</p>
            </div>
            <div aria-label={t("crisis.emergencyNumbers")} className="crisis-support-immediate-numbers">
              {emergencyContacts.map((contact) => (
                <div aria-label={`${contact.numbers[0]} ${contact.label}`} key={contact.numbers[0]}>
                  <strong>{contact.numbers[0]}</strong>
                  <span>{contact.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "situations" && (
          <section aria-labelledby="crisis-situations-heading" className="crisis-support-situations">
            <div className="crisis-support-section-heading crisis-support-section-heading-with-icon">
              <img alt="" aria-hidden="true" src={heartMarkerIconUrl} />
              <h3 id="crisis-situations-heading">{t("crisis.situationsTitle")}</h3>
            </div>
            <p className="crisis-support-situations-intro">{t("crisis.situationsIntro")}</p>
            <div className="crisis-support-situation-list">
              {situations.map((situation) => (
                <details className="crisis-support-situation" key={situation.action}>
                  <summary>
                    <span aria-hidden="true" className="crisis-support-situation-icon">
                      <img alt="" src={situationIconUrls[situation.icon]} />
                    </span>
                    <div>
                      <h4>{situation.action}</h4>
                      <p>{situation.guidance}</p>
                    </div>
                    <img alt="" aria-hidden="true" className="crisis-support-situation-chevron" src={chevronIconUrl} />
                  </summary>
                  <div className="crisis-support-situation-details">
                    <p>{t("crisis.moreActions")}</p>
                    <ul>
                      {situation.details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {activePage === "contacts" && (
          <section aria-labelledby="crisis-contacts-heading" className="crisis-support-contacts">
            <div className="crisis-support-section-heading crisis-support-section-heading-with-icon crisis-support-contacts-heading">
              <img alt="" aria-hidden="true" src={phoneIconUrl} />
              <h3 id="crisis-contacts-heading">{t("crisis.contactsTitle")}</h3>
            </div>
            <p className="crisis-support-contact-note">{t("crisis.contactsNote")}</p>

            <aside className="crisis-support-escalation-note">
              <strong>{t("crisis.noAnswerTitle")}</strong>
              <p>{t("crisis.noAnswerBody")}</p>
            </aside>

            <aside className="crisis-support-contact-note">
              <strong>{t("crisis.otherRegionsTitle")}</strong>
              <p>{t("crisis.otherRegionsBody")}</p>
            </aside>

            <div className="crisis-support-contact-list">
              {[...emergencyContacts, ...hotlineContacts].map((contact) => (
                <ContactRow contact={contact} key={contact.numbers[0]} />
              ))}
            </div>

            <p className="crisis-support-verification">{verification}</p>
            <a
              className="crisis-support-source-link"
              href="https://www.nhc.gov.cn/yzygj/c100068/202412/49a1a65386cd4be582d4702fd0926ee8.shtml"
              rel="noreferrer"
              target="_blank"
            >
              {t("crisis.officialSource")}
            </a>
          </section>
        )}

        {activePage === "limit" && (
          <aside aria-labelledby="crisis-ling-limit-heading" className="crisis-support-limit">
            <span aria-hidden="true">i</span>
            <div>
              <h3 id="crisis-ling-limit-heading">{t("crisis.limitTitle")}</h3>
              <p>{t("crisis.limitBody")}</p>
              <p>{t("crisis.limitEmergencyBody")}</p>
            </div>
          </aside>
        )}
      </div>
    </ResourceDocumentReaderLayout>
  );
}
