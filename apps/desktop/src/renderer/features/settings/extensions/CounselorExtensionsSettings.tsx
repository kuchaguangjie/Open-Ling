import { useEffect, useState } from "react";
import type { CounselorPackageManifest } from "@shared/index";
import { useLingua } from "../../../localization/useLingua";
import { useAppStore } from "../../../stores/appStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import {
  getHostedCounselorVisualUrl,
  registerHostedCounselorPackages,
  unregisterHostedCounselorPackage
} from "../../../counselors/hostedCounselorPackages";
import "./counselor-extensions.css";

export function CounselorExtensionsSettings() {
  const { locale, l } = useLingua();
  const requestConsultation = useAppStore((state) => state.requestConsultation);
  const disabledCounselorIds = useSettingsStore((state) => state.disabledCounselorIds);
  const updateDisabledCounselors = useSettingsStore((state) => state.updateDisabledCounselors);
  const [packages, setPackages] = useState<CounselorPackageManifest[]>([]);
  const [preview, setPreview] = useState<{
    currentVersion?: string;
    manifest: CounselorPackageManifest;
    token: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string }>();

  useEffect(() => {
    let cancelled = false;
    void window.lingDesktop?.counselorPackages?.list().then((result) => {
      if (!cancelled && result.ok) setPackages(sortPackages(result.data));
    });
    return () => { cancelled = true; };
  }, []);

  async function choosePackage() {
    const api = window.lingDesktop?.counselorPackages;
    if (!api) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await api.install();
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error.message });
      } else if (result.data.status === "preview") {
        setPreview({
          currentVersion: result.data.currentVersion,
          manifest: result.data.manifest,
          token: result.data.previewToken
        });
      }
    } catch {
      setMessage({ kind: "error", text: l("无法读取咨询师包。", "The counselor package could not be read.") });
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    const api = window.lingDesktop?.counselorPackages;
    if (!api || !preview) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await api.install(preview.token);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error.message });
      } else if (result.data.status === "installed" || result.data.status === "updated") {
        const manifest = result.data.manifest;
        if (result.data.status === "updated") unregisterHostedCounselorPackage(manifest.id);
        registerHostedCounselorPackages([manifest]);
        setPackages((current) => sortPackages([
          ...current.filter(({ id }) => id !== manifest.id),
          manifest
        ]));
        setPreview(undefined);
        setMessage({
          kind: "success",
          text: result.data.status === "updated"
            ? l(
                `咨询师已从 v${result.data.previousVersion} 更新到 v${manifest.version}。旧会谈继续使用原有 Prompt 快照，新咨询使用新版。`,
                `The counselor was updated from v${result.data.previousVersion} to v${manifest.version}. Existing sessions keep their prompt snapshots; new consultations use the update.`
              )
            : l("第三方 AI 咨询角色包已导入，现在可以直接使用。", "The third-party AI counselor character package was imported and is ready to use.")
        });
      }
    } catch {
      setMessage({ kind: "error", text: l("无法导入咨询师包。", "The counselor package could not be imported.") });
    } finally {
      setBusy(false);
    }
  }

  async function setPackageEnabled(packageId: string, enabled: boolean) {
    setBusy(true);
    setMessage(undefined);
    const nextIds = enabled
      ? disabledCounselorIds.filter((id) => id !== packageId)
      : [...disabledCounselorIds, packageId];
    const saved = await updateDisabledCounselors(nextIds);
    setMessage(saved
      ? {
          kind: "success",
          text: enabled
            ? l("咨询师已重新启用。", "The counselor was enabled again.")
            : l("咨询师已停用，不再出现在新的咨询选择中；历史会谈和会后材料仍然保留。", "The counselor is disabled for new consultations. Historical sessions and post-session materials remain available.")
        }
      : { kind: "error", text: l("无法保存咨询师状态。", "The counselor status could not be saved.") });
    setBusy(false);
  }

  async function removePackage(packageId: string) {
    const api = window.lingDesktop?.counselorPackages;
    if (!api) return;
    setBusy(true);
    setMessage(undefined);
    try {
      const result = await api.remove(packageId);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error.message });
      } else if (result.data.status === "removed") {
        unregisterHostedCounselorPackage(packageId);
        if (disabledCounselorIds.includes(packageId)) {
          await updateDisabledCounselors(disabledCounselorIds.filter((id) => id !== packageId));
        }
        setPackages((current) => current.filter(({ id }) => id !== packageId));
        setMessage({ kind: "success", text: l("本地导入的咨询师包已移除。", "The locally imported counselor package was removed.") });
      }
    } catch {
      setMessage({ kind: "error", text: l("无法移除咨询师包。", "The counselor package could not be removed.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="system-simple-page counselor-extensions-page">
      <header className="system-content-header">
        <h1>{l("咨询师扩展", "Counselor extensions")}</h1>
        <p>{l(
          "在这里导入由第三方发布者制作的 AI 咨询角色包。Ling 不在 App 内生成或编辑角色设定。",
          "Import AI counselor character packages created by third-party publishers. Ling does not generate or edit character definitions inside the app."
        )}</p>
      </header>

      <section className="setting-section-card counselor-extension-install">
        <div>
          <h2>{l("导入咨询师包", "Import a counselor package")}</h2>
          <p>{l(
            "选择包含 manifest.json 的文件夹。Ling 会先校验并展示来源、取向和许可信息，确认后再导入。",
            "Choose a folder containing manifest.json. Ling validates and previews its source, approach, and licenses before import."
          )}</p>
        </div>
        <button className="system-primary-button" disabled={busy} onClick={choosePackage} type="button">
          {busy ? l("正在处理…", "Working…") : l("选择并预览", "Choose and preview")}
        </button>
      </section>

      <aside aria-label={l("本地导入风险说明", "Local import risk notice")} className="counselor-extension-risk">
        <strong>{l("导入前请了解", "Before importing")}</strong>
        <p>{l(
          "本地导入的咨询师仍会接入 Ling 的基础安全、记忆和会后流程，但其 Prompt 和专业内容未必经过与官方咨询师同等的测试；回应效果和安全表现也可能不及官方咨询师，请确认来源后使用。",
          "Locally imported counselors still use Ling's core safety, memory, and post-session workflow, but their prompts and professional content may not receive the same testing as official counselors. Response quality and safety performance may not match official counselors, so verify the source before use."
        )}</p>
        <p>{l(
          "咨询师角色扩展规范与示例将在公开仓库开放后提供。",
          "The counselor-extension specification and examples will be available when the public repository opens."
        )}</p>
      </aside>

      {preview && (
        <section aria-label={l("导入前预览", "Pre-import preview")} className="setting-section-card counselor-extension-preview">
          <div>
            <span className="counselor-extension-source">{l("本地导入 · 未经 Ling 官方审核", "Local import · not officially reviewed by Ling")}</span>
            <h2>{preview.manifest.localizations[locale].name}</h2>
            <p>{preview.manifest.localizations[locale].title}</p>
            <p>{preview.manifest.localizations[locale].description}</p>
            <dl>
              <div><dt>{l("发布者", "Publisher")}</dt><dd>{preview.manifest.publisher.name}</dd></div>
              {preview.currentVersion && <div><dt>{l("当前版本", "Current version")}</dt><dd>{preview.currentVersion}</dd></div>}
              <div><dt>{preview.currentVersion ? l("新版本", "New version") : l("版本", "Version")}</dt><dd>{preview.manifest.version}</dd></div>
              <div><dt>{l("理论取向", "Approach")}</dt><dd>{preview.manifest.approach}</dd></div>
              <div><dt>{l("Prompt 许可", "Prompt license")}</dt><dd>{preview.manifest.license.prompts}</dd></div>
              <div><dt>{l("图片许可", "Asset license")}</dt><dd>{preview.manifest.license.assets}</dd></div>
            </dl>
            <p className="counselor-extension-review-note">{l(
              "本地导入表示该文件通过了结构、版本、资源路径和 Ling 安全基线兼容检查，不代表 Ling 对发布者资质或专业内容作出认证。",
              "A local import has passed structure, version, resource-path, and Ling safety-baseline compatibility checks. It does not mean Ling certifies the publisher or professional content."
            )}</p>
          </div>
          <div className="counselor-extension-actions">
            <button className="system-primary-button" disabled={busy} onClick={confirmImport} type="button">
              {preview.currentVersion ? l("确认更新", "Confirm update") : l("确认导入", "Confirm import")}
            </button>
            <button className="system-secondary-button" disabled={busy} onClick={() => setPreview(undefined)} type="button">{l("取消", "Cancel")}</button>
          </div>
        </section>
      )}

      {message && <p className={`counselor-extension-message ${message.kind}`} role="status">{message.text}</p>}

      <section className="counselor-extension-list" aria-label={l("已导入的 AI 咨询角色", "Imported AI counselor characters")}>
        <header>
          <h2>{l("已导入", "Imported")}</h2>
          <span>{packages.length}</span>
        </header>
        {packages.length === 0 ? (
          <p className="counselor-extension-empty">{l("尚未导入其他咨询师。三位 Ling 官方咨询师内置于应用，不会显示在这里。", "No additional counselors have been imported. Ling's three official counselors are built into the app and are not shown here.")}</p>
        ) : packages.map((manifest) => {
          const copy = manifest.localizations[locale];
          const disabled = disabledCounselorIds.includes(manifest.id);
          return (
            <article className={`counselor-extension-item${disabled ? " disabled" : ""}`} key={`${manifest.id}@${manifest.version}`}>
              <img alt="" src={getHostedCounselorVisualUrl(manifest.id, "avatar")} />
              <div>
                <span className="counselor-extension-source">{disabled ? l("已停用", "Disabled") : l("本地导入", "Local import")}</span>
                <h3>{copy.name}</h3>
                <p>{copy.title}</p>
                <small>{manifest.publisher.name} · v{manifest.version} · {manifest.license.prompts}</small>
              </div>
              <div className="counselor-extension-actions">
                <button className="system-primary-button" disabled={busy || disabled} onClick={() => requestConsultation(manifest.id)} type="button">
                  {l("开始咨询", "Start counseling")}
                </button>
                <button className="system-secondary-button" disabled={busy} onClick={() => setPackageEnabled(manifest.id, disabled)} type="button">
                  {disabled ? l("重新启用", "Enable") : l("停用", "Disable")}
                </button>
                <button className="system-secondary-button" disabled={busy} onClick={() => removePackage(manifest.id)} type="button">
                  {l("移除", "Remove")}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}

function sortPackages(packages: CounselorPackageManifest[]) {
  return [...packages].sort((left, right) => left.id.localeCompare(right.id));
}
