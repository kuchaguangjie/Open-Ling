import { app, BrowserWindow, Menu, protocol, safeStorage, type MenuItemConstructorOptions } from "electron";
import { createHash } from "node:crypto";
import { chmod, mkdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { createSecretRepository } from "../../../../packages/database/src/index.js";
import { IPC_CHANNELS } from "../../../../packages/shared/src/index.js";
import { LING_APP_NAME } from "./appIdentity.js";
import { showAboutWindow } from "./aboutWindow.js";
import { createMainWindow } from "./window.js";
import { createIpcRepositories, createLazyIpcRepositories, registerIpcHandlers, type IpcRepositories } from "./ipc/index.js";
import { createLocalBackup, restoreLocalBackup } from "./data/localDataBackup.js";
import { registerVoiceIpcHandlers, stopAllVoiceRecognition } from "./voice/voiceIpc.js";
import { createSystemSecretRepository } from "./security/systemSecretStore.js";
import {
  loadDataVault,
  openOrMigrateEncryptedDatabase,
  type DataVault
} from "./security/dataVault.js";
import {
  clearGraceSession,
  readGraceSession,
  writeGraceSession
} from "./security/graceSession.js";
import {
  registerDataVaultIpcHandlers,
  type DataVaultRuntime
} from "./security/dataVaultIpc.js";
import { loadInstalledCounselorPackages } from "./counselors/installedCounselorPackages.js";
import {
  COUNSELOR_PACKAGE_RESOURCE_SCHEME,
  registerCounselorPackageProtocol
} from "./counselors/counselorPackageProtocol.js";
import { AppUpdateNoticeService, registerAppUpdateNoticeIpc } from "./updates/appUpdateNoticeService.js";

let mainWindow: BrowserWindow | null = null;
const isSmokeTest = process.argv.includes("--smoke-test");
const repositoriesHolder: { current: IpcRepositories | null } = { current: null };
const lazyRepositories = createLazyIpcRepositories(repositoriesHolder);
const dataVaultRuntime: DataVaultRuntime = {
  databasePath: "",
  vaultPath: "",
  vault: null,
  db: null,
  dataKey: null,
  onUnlocked: unlockRuntime,
  onLockRequested: lockRuntime
};

protocol.registerSchemesAsPrivileged([{
  scheme: COUNSELOR_PACKAGE_RESOURCE_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

// Must run before Electron finishes initializing; otherwise macOS keeps its default “Electron” menu-bar name.
const initialUserDataPath = app.getPath("userData");
const isPackagedDevApp = app.isPackaged && basename(process.execPath) === "Ling Dev";
const appUpdateNoticeService = new AppUpdateNoticeService({
  enabled: app.isPackaged && !isPackagedDevApp && ["win32", "darwin", "linux"].includes(process.platform)
});
app.setName(LING_APP_NAME);
if (isPackagedDevApp) {
  app.setPath("userData", join(dirname(initialUserDataPath), "Ling Dev"));
}
const allowParallelDevInstance =
  !app.isPackaged && process.env.LING_ALLOW_MULTIPLE_INSTANCES === "1";
const devUserDataSuffix = process.env.LING_USER_DATA_SUFFIX?.trim();
if (
  allowParallelDevInstance &&
  devUserDataSuffix &&
  /^[a-zA-Z0-9_-]{1,48}$/.test(devUserDataSuffix)
) {
  app.setPath("userData", `${app.getPath("userData")}-${devUserDataSuffix}`);
}
const isPrimaryInstance =
  allowParallelDevInstance || app.requestSingleInstanceLock();

async function unlockRuntime(vault: DataVault, dataKey: Buffer) {
  if (dataVaultRuntime.db) dataVaultRuntime.db.close();
  dataVaultRuntime.db = await openOrMigrateEncryptedDatabase(vault.databasePath, dataKey);
  dataVaultRuntime.dataKey = dataKey;
  dataVaultRuntime.vault = vault;
  const secrets = createSystemSecretRepository({
    credentialPath: join(app.getPath("userData"), "credentials", "api-key.safe"),
    encryption: safeStorage,
    legacy: createSecretRepository(dataVaultRuntime.db)
  });
  await secrets.migrateLegacyApiKey().catch((error: unknown) => {
    console.error("Ling could not migrate the legacy API credential.", error instanceof Error ? error.message : "Unknown error");
  });
  repositoriesHolder.current = createIpcRepositories(dataVaultRuntime.db, secrets);
  await writeGraceSession(
    join(app.getPath("userData"), "security", "grace-session.json"),
    dataKey,
    safeStorage,
    (dataVaultRuntime.vault?.getGraceMinutes() ?? 5) * 60 * 1000
  ).catch(() => undefined);
}

async function lockRuntime() {
  if (dataVaultRuntime.db) dataVaultRuntime.db.close();
  dataVaultRuntime.db = null;
  dataVaultRuntime.dataKey = null;
  repositoriesHolder.current = null;
  await clearGraceSession(join(app.getPath("userData"), "security", "grace-session.json")).catch(() => undefined);
}

async function bootstrap() {
  // The packaged smoke test only verifies that the renderer can mount. Loading
  // the real vault and credential store here can block an unattended refresh
  // behind an OS prompt and also needlessly touches the user's local data.
  if (isSmokeTest) {
    mainWindow = await createMainWindow();
    app.exit(0);
    return;
  }

  const userDataDirectory = app.getPath("userData");
  await mkdir(userDataDirectory, { recursive: true, mode: 0o700 });
  await chmod(userDataDirectory, 0o700);

  const counselorPackageScan = loadInstalledCounselorPackages(
    join(app.getPath("userData"), "counselor-packages")
  );
  for (const diagnostic of counselorPackageScan.diagnostics) {
    console.warn(
      `Ling skipped counselor package "${diagnostic.directoryName}": ${diagnostic.message}`
    );
  }
  registerCounselorPackageProtocol();

  const databasePath = join(app.getPath("userData"), "ling.sqlite");
  const vaultPath = join(app.getPath("userData"), "security", "vault.json");
  dataVaultRuntime.databasePath = databasePath;
  dataVaultRuntime.vaultPath = vaultPath;
  dataVaultRuntime.vault = await loadDataVault(vaultPath, databasePath);
  const skipDevAccessLock = !app.isPackaged && process.env.LING_DEV_SKIP_ACCESS_LOCK === "1";
  if (skipDevAccessLock && !dataVaultRuntime.vault) {
    const devKey = createHash("sha256").update("ling-dev-skip-access-lock").digest();
    const db = await openOrMigrateEncryptedDatabase(databasePath, devKey);
    dataVaultRuntime.db = db;
    dataVaultRuntime.dataKey = devKey;
    dataVaultRuntime.skipAccessLock = true;
    repositoriesHolder.current = createIpcRepositories(
      db,
      createSystemSecretRepository({
        credentialPath: join(app.getPath("userData"), "credentials", "api-key.safe"),
        encryption: safeStorage,
        legacy: createSecretRepository(db)
      })
    );
  }
  if (dataVaultRuntime.vault) {
    if (!dataVaultRuntime.vault.isPasswordEnabled()) {
      const deviceDataKey = await dataVaultRuntime.vault.unlockWithDevice(safeStorage).catch((error: unknown) => {
        console.error("Ling could not unlock local data with system secure storage.", error instanceof Error ? error.message : "Unknown error");
        return null;
      });
      if (deviceDataKey) await unlockRuntime(dataVaultRuntime.vault, deviceDataKey);
    } else {
      const graceDataKey = await readGraceSession(
        join(app.getPath("userData"), "security", "grace-session.json"),
        safeStorage
      ).catch(() => null);
      if (graceDataKey) {
        await unlockRuntime(dataVaultRuntime.vault, graceDataKey);
      }
    }
  }

  registerDataVaultIpcHandlers(dataVaultRuntime);
  registerVoiceIpcHandlers(lazyRepositories);
  registerAppUpdateNoticeIpc(appUpdateNoticeService);
  registerIpcHandlers(lazyRepositories, {
    create: async (filePath) => {
      const currentDatabase = dataVaultRuntime.db;
      const dataKey = dataVaultRuntime.dataKey;
      if (!currentDatabase || !dataKey) throw new Error("本地资料尚未解锁");
      return createLocalBackup(
        currentDatabase,
        filePath,
        dataKey,
        dataVaultRuntime.vault?.getRecoveryRecord()
      );
    },
    restore: async (filePath, recoveryPhrase) => {
      const currentDatabase = dataVaultRuntime.db;
      if (!currentDatabase) throw new Error("本地数据库不可用");
      const dataKey = dataVaultRuntime.dataKey;
      if (!dataKey) throw new Error("本地资料尚未解锁");
      const fileName = await restoreLocalBackup({
        sourcePath: filePath,
        databasePath,
        dataKey,
        recoveryPhrase,
        closeDatabase: () => currentDatabase.close()
      });
      dataVaultRuntime.db = null;
      dataVaultRuntime.dataKey = null;
      repositoriesHolder.current = null;
      app.relaunch();
      setTimeout(() => app.exit(0), 120);
      return fileName;
    }
  });
  mainWindow = await createMainWindow();
  installApplicationMenu();
  appUpdateNoticeService.startAutomaticChecks();
}

if (!isPrimaryInstance) {
  app.quit();
} else {
  app.whenReady().then(bootstrap).catch((error) => {
    console.error("Ling failed to start.", error);
    app.exit(1);
  });

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow();
    }
  });

  app.on("window-all-closed", () => {
    mainWindow = null;
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    appUpdateNoticeService.stopAutomaticChecks();
    void stopAllVoiceRecognition();
    dataVaultRuntime.db?.close();
    dataVaultRuntime.db = null;
  });
}

function installApplicationMenu() {
  // Windows and Linux do not need a browser-style application menu. Keeping it
  // also takes vertical space from the renderer on smaller or scaled displays.
  // macOS retains its conventional menu bar and About/Quit commands.
  if (process.platform !== "darwin") {
    Menu.setApplicationMenu(null);
    return;
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: "关于 Ling",
          click: () => void showAboutWindow(BrowserWindow.getFocusedWindow() ?? mainWindow)
        },
        { type: "separator" as const },
        { role: "hide" as const },
        { role: "hideOthers" as const },
        { role: "unhide" as const },
        { type: "separator" as const },
        { role: "quit" as const }
      ]
    },
    {
      label: "File",
      submenu: [
        {
          label: "新建会谈",
          accelerator: "CommandOrControl+N",
          click: () => {
            const target = BrowserWindow.getFocusedWindow() ?? mainWindow;
            target?.webContents.send(IPC_CHANNELS.APP_NEW_SESSION);
          }
        },
        { type: "separator" },
        { role: "close" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
