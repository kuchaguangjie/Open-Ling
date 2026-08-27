import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(repositoryRoot, "docs/design/localization/source-manifest.json");
const updateHashes = process.argv.includes("--update");
const hanPattern = /\p{Script=Han}/u;

const registeredHanRendererFiles = new Set([
  "apps/desktop/src/renderer/content/counselorResponseActivity.ts",
  "apps/desktop/src/renderer/content/counselorStatusQuotes.ts",
  "apps/desktop/src/renderer/features/access-lock/recoveryPhrase.ts",
  "apps/desktop/src/renderer/features/settings/memory/SettingsMemoryPage.tsx",
  "apps/desktop/src/renderer/features/settings/extensions/CounselorExtensionsSettings.tsx",
  "apps/desktop/src/renderer/features/settings/system/SettingsSystemPage.tsx",
  "apps/desktop/src/renderer/features/settings/system/UsageSettings.tsx",
  "apps/desktop/src/renderer/features/launch-onboarding/LaunchModelConnectionScreen.tsx",
  "apps/desktop/src/renderer/features/launch-onboarding/LaunchPrivacyScreen.tsx",
  "apps/desktop/src/renderer/features/launch-onboarding/LaunchSecurityScreen.tsx",
  "apps/desktop/src/renderer/features/startup-loading/startupLoadingContent.ts",
  "apps/desktop/src/renderer/features/voice-input/voiceShortcut.ts",
  "apps/desktop/src/renderer/flows/consultation/consultationFlowStore.ts",
  "apps/desktop/src/renderer/flows/consultation/counselorFlowContent.ts",
  "apps/desktop/src/renderer/localization/catalogs/en-US.ts",
  "apps/desktop/src/renderer/localization/catalogs/zh-CN.ts",
  "apps/desktop/src/renderer/pages/CounselorsPage.tsx",
  "apps/desktop/src/renderer/pages/MemoryPage.tsx",
  "apps/desktop/src/renderer/pages/counseling-room/composer/CounselingRoomComposer.tsx",
  "apps/desktop/src/renderer/pages/counseling-room/composer/useLocalVoiceInput.ts",
  "apps/desktop/src/renderer/pages/counseling-room/overlays/session-letter/SessionLetterReader.tsx",
  "apps/desktop/src/renderer/pages/counseling-room/transitions/ConsultationArrivalStage.tsx",
  "apps/desktop/src/renderer/pages/lobby/content/dialogueContent.ts",
  "apps/desktop/src/renderer/pages/lobby/content/smallTalkContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/bookcase/BookcaseFeature.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/bookcase/StoryCard.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/bookcase/StoryReader.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/bookcase/additionalStoryArticles.ts",
  "apps/desktop/src/renderer/pages/lobby/features/bookcase/storyContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/consent/InformedConsentPage.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/counselors/CounselorIntroductionFeature.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/counselors/counselorIntroductionContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/model-connection/ConsultationModelConnectionPage.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/resources/InformedConsentReader.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/resources/crisisSupportContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/resources/informedConsentContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/resources/resourceContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/resources/userGuideContent.ts",
  "apps/desktop/src/renderer/pages/lobby/features/sofa-letters/SofaLettersFeature.tsx",
  "apps/desktop/src/renderer/pages/lobby/features/sofa-records/ConsultationRecordsFeature.tsx",
  "apps/desktop/src/renderer/pages/lobby/garden/GardenBreathingPractice.tsx",
  "apps/desktop/src/renderer/pages/lobby/garden/useGardenAmbientAudio.ts",
  "apps/desktop/src/renderer/pages/lobby/garden/useGardenBreathingExercise.ts",
  "apps/desktop/src/renderer/pages/lobby/lobbyFeatureAssets.ts",
  "apps/desktop/src/renderer/pages/lobby/reception/RenxinDialoguePortrait.tsx",
  "apps/desktop/src/renderer/components/legal/PrivacyNoticeDialog.tsx",
  "apps/desktop/src/renderer/pages/lobby/shell/RenxinScenePortrait.tsx",
  "apps/desktop/src/renderer/stores/session/messageUtils.ts",
  "apps/desktop/src/renderer/stores/session/presentation.ts",
  "apps/desktop/src/renderer/stores/sessionStore.ts",
  "apps/desktop/src/renderer/stores/settingsStore.ts"
]);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

for (const entry of manifest.sources) {
  const sourcePath = join(repositoryRoot, entry.source);
  const translationPath = join(repositoryRoot, entry.translation);
  const [source, translation] = await Promise.all([
    readFile(sourcePath),
    readFile(translationPath, "utf8")
  ]).catch((error) => {
    errors.push(`${entry.id}: missing source or translation (${error.message})`);
    return [Buffer.from(""), ""];
  });
  if (!source.length || !translation.trim()) {
    errors.push(`${entry.id}: source or English translation is empty`);
    continue;
  }
  // Git may check text files out with CRLF on Windows. Hash normalized text so
  // the localization review gate reflects content changes, not checkout style.
  const hash = createHash("sha256")
    .update(source.toString("utf8").replaceAll("\r\n", "\n"), "utf8")
    .digest("hex");
  if (updateHashes) entry.sourceHash = hash;
  else if (hash !== entry.sourceHash) {
    errors.push(`${entry.id}: Chinese source changed; review ${entry.translation}, then run npm run localization:update-hashes`);
  }
  if (hanPattern.test(translation)) {
    errors.push(`${entry.id}: English translation still contains Han characters (${entry.translation})`);
  }
}

if (updateHashes && errors.length === 0) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

await verifyCatalogKeys(errors);
await verifyPromptMirror(errors);
await verifyNewRendererChinese(errors);

if (errors.length > 0) {
  console.error("Localization verification failed:\n");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(updateHashes
    ? `Localization source hashes updated (${manifest.sources.length} registered sources).`
    : `Localization verified (${manifest.sources.length} registered sources).`);
}

async function verifyCatalogKeys(target) {
  const zhPath = join(repositoryRoot, "apps/desktop/src/renderer/localization/catalogs/zh-CN.ts");
  const enPath = join(repositoryRoot, "apps/desktop/src/renderer/localization/catalogs/en-US.ts");
  const [zh, en] = await Promise.all([readFile(zhPath, "utf8"), readFile(enPath, "utf8")]);
  const keyPattern = /^\s*"([^"]+)":/gm;
  const keys = (text) => new Set([...text.matchAll(keyPattern)].map((match) => match[1]));
  const zhKeys = keys(zh);
  const enKeys = keys(en);
  for (const key of zhKeys) if (!enKeys.has(key)) target.push(`catalog: en-US is missing key ${key}`);
  for (const key of enKeys) if (!zhKeys.has(key)) target.push(`catalog: en-US has unknown key ${key}`);
}

async function verifyPromptMirror(target) {
  const directories = ["counselor-cores", "policies", "shared", "supervisor-cores", "tasks"];
  for (const directory of directories) {
    const zhDirectory = join(repositoryRoot, "packages/core/src/prompts", directory);
    const enDirectory = join(repositoryRoot, "packages/core/src/prompts/en-US", directory);
    const fileNames = async (path) => (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
    const [zhFiles, enFiles] = await Promise.all([fileNames(zhDirectory), fileNames(enDirectory)]);
    for (const file of zhFiles) if (!enFiles.includes(file)) target.push(`prompt mirror: en-US/${directory}/${file} is missing`);
    for (const file of enFiles) if (!zhFiles.includes(file)) target.push(`prompt mirror: en-US/${directory}/${file} has no Chinese source`);
  }
}

async function verifyNewRendererChinese(target) {
  const rendererRoot = join(repositoryRoot, "apps/desktop/src/renderer");
  const files = await walk(rendererRoot);
  for (const absolutePath of files) {
    if (!/\.(ts|tsx)$/.test(absolutePath) || /\.test\.(ts|tsx)$/.test(absolutePath)) continue;
    const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    if (path.includes("/devtools/") || path.endsWith("/stores/devCounselingStream.ts")) continue;
    const content = await readFile(absolutePath, "utf8");
    if (hanPattern.test(content) && !registeredHanRendererFiles.has(path)) {
      target.push(`unregistered Chinese product copy: ${path}`);
    }
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if ((await stat(path)).isFile()) files.push(path);
  }
  return files;
}
