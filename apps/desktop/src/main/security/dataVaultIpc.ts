import { ipcMain, safeStorage } from "electron";
import {
  IPC_CHANNELS,
  failure,
  ERROR_CODES,
  wrapIpcHandler
} from "../../../../../packages/shared/src/index.js";
import type { LingDatabase } from "../../../../../packages/database/src/index.js";
import {
  createDataVault,
  createDeviceProtectedDataVault,
  DataVault,
  isLegacyPin,
  loadDataVault,
  MIN_PIN_LENGTH,
  validatePin
} from "./dataVault.js";
import { validateRecoveryPhrase } from "./accessLock.js";

export interface DataVaultRuntime {
  databasePath: string;
  vaultPath: string;
  vault: DataVault | null;
  db: LingDatabase | null;
  dataKey: Buffer | null;
  skipAccessLock?: boolean;
  /**
   * Set when the last successful unlock used a password shorter than the
   * current floor. Held in memory only — it is re-derived on every unlock, so
   * it clears itself once the user changes their password.
   */
  pinUpgradeRecommended?: boolean;
  onUnlocked: (vault: DataVault, dataKey: Buffer) => Promise<void>;
  onLockRequested: () => Promise<void>;
}

export function registerDataVaultIpcHandlers(runtime: DataVaultRuntime) {
  let deviceInitialization: Promise<void> | null = null;
  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_STATUS, wrapIpcHandler(async () => {
    if (runtime.skipAccessLock) {
      return {
        configured: Boolean(runtime.vault),
        enabled: true,
        unlocked: true,
        graceMinutes: runtime.vault?.getGraceMinutes() ?? 5,
        pinUpgradeRecommended: Boolean(runtime.pinUpgradeRecommended)
      };
    }
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    runtime.vault = vault;
    return {
      configured: Boolean(vault),
      enabled: Boolean(vault && (vault.isPasswordEnabled() || !runtime.db)),
      unlocked: Boolean(runtime.db),
      graceMinutes: runtime.vault?.getGraceMinutes() ?? 5,
      pinUpgradeRecommended: Boolean(runtime.pinUpgradeRecommended)
    };
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_INITIALIZE_DEVICE, wrapIpcHandler(async () => {
    if (!deviceInitialization) {
      deviceInitialization = (async () => {
        const existingVault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
        if (existingVault) {
          const dataKey = runtime.dataKey ?? await existingVault.unlockWithDevice(safeStorage);
          runtime.vault = existingVault;
          await runtime.onUnlocked(existingVault, dataKey);
          return;
        }
        const created = await createDeviceProtectedDataVault({
          databasePath: runtime.databasePath,
          vaultPath: runtime.vaultPath,
          encryption: safeStorage
        });
        runtime.vault = created.vault;
        await runtime.onUnlocked(created.vault, created.dataKey);
      })().finally(() => {
        deviceInitialization = null;
      });
    }
    await deviceInitialization;
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_SETUP, wrapIpcHandler(async (_event, input: unknown) => {
    if (!isPinSetupInput(input)) return failure(ERROR_CODES.VALIDATION_ERROR, `请设置 ${MIN_PIN_LENGTH} 位以上的数字密码，并保存恢复码。`);
    const passwordError = validatePin(input.password);
    if (passwordError) return failure(ERROR_CODES.VALIDATION_ERROR, passwordError);
    const phraseError = validateRecoveryPhrase(input.recoveryPhrase);
    if (phraseError) return failure(ERROR_CODES.VALIDATION_ERROR, phraseError);
    const existingVault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (existingVault) {
      if (existingVault.isPasswordEnabled()) {
        return failure(ERROR_CODES.VALIDATION_ERROR, "本机资料已经加密，请直接输入密码解锁。");
      }
      try {
        const dataKey = runtime.dataKey ?? await existingVault.unlockWithDevice(safeStorage);
        await existingVault.enablePassword(dataKey, input.password, input.recoveryPhrase);
        runtime.vault = existingVault;
        runtime.pinUpgradeRecommended = false;
        await runtime.onUnlocked(existingVault, dataKey);
        return;
      } catch {
        return failure(ERROR_CODES.VALIDATION_ERROR, "没有成功开启密码保护，请稍后重试。");
      }
    }
    const vault = await createDataVault({
      databasePath: runtime.databasePath,
      vaultPath: runtime.vaultPath,
      password: input.password,
      recoveryPhrase: input.recoveryPhrase
    });
    const dataKey = await vault.unlock(input.password);
    runtime.vault = vault;
    runtime.pinUpgradeRecommended = false;
    await runtime.onUnlocked(vault, dataKey);
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_UNLOCK, wrapIpcHandler(async (_event, password: unknown) => {
    if (typeof password !== "string") return failure(ERROR_CODES.VALIDATION_ERROR, "请输入数字密码。");
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (!vault) return failure(ERROR_CODES.VALIDATION_ERROR, "还没有设置密码。");
    let dataKey: Buffer;
    try {
      // Deliberately no length check: a vault created before the current floor
      // holds a shorter password, and only a successful unwrap proves it right.
      dataKey = await vault.unlock(password);
    } catch {
      return failure(ERROR_CODES.VALIDATION_ERROR, "密码不正确，请重新输入。");
    }
    runtime.vault = vault;
    runtime.pinUpgradeRecommended = isLegacyPin(password);
    await runtime.onUnlocked(vault, dataKey);
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_RECOVER, wrapIpcHandler(async (_event, input: unknown) => {
    if (!isRecoveryInput(input)) return failure(ERROR_CODES.VALIDATION_ERROR, "请输入恢复码和新密码。");
    const passwordError = validatePin(input.newPassword);
    if (passwordError) return failure(ERROR_CODES.VALIDATION_ERROR, passwordError);
    const phraseError = validateRecoveryPhrase(input.recoveryPhrase);
    if (phraseError) return failure(ERROR_CODES.VALIDATION_ERROR, phraseError);
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (!vault) return failure(ERROR_CODES.VALIDATION_ERROR, "还没有设置密码。");
    try {
      const dataKey = await vault.recover(input.recoveryPhrase, input.newPassword);
      runtime.vault = vault;
      runtime.pinUpgradeRecommended = false;
      await runtime.onUnlocked(vault, dataKey);
    } catch {
      return failure(ERROR_CODES.VALIDATION_ERROR, "恢复码不正确，请按原样输入。");
    }
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_CHANGE_PASSWORD, wrapIpcHandler(async (_event, input: unknown) => {
    if (!isPasswordChangeInput(input)) return failure(ERROR_CODES.VALIDATION_ERROR, "请输入当前密码和新密码。");
    const passwordError = validatePin(input.newPassword);
    if (passwordError) return failure(ERROR_CODES.VALIDATION_ERROR, passwordError);
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (!vault) return failure(ERROR_CODES.VALIDATION_ERROR, "还没有设置密码。");
    try {
      await vault.changePassword(input.currentPassword, input.newPassword);
      runtime.vault = vault;
      runtime.pinUpgradeRecommended = false;
    } catch {
      return failure(ERROR_CODES.VALIDATION_ERROR, "当前密码不正确，请重新输入。");
    }
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_GRACE_SET, wrapIpcHandler(async (_event, minutes: unknown) => {
    if (minutes !== 0 && minutes !== 5 && minutes !== 15 && minutes !== 30) {
      return failure(ERROR_CODES.VALIDATION_ERROR, "免密窗口只能选择 0、5、15 或 30 分钟。");
    }
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (!vault) return failure(ERROR_CODES.VALIDATION_ERROR, "还没有设置密码。");
    await vault.setGraceMinutes(minutes);
    runtime.vault = vault;
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_DISABLE, wrapIpcHandler(async (_event, password: unknown) => {
    if (typeof password !== "string" || !password) {
      return failure(ERROR_CODES.VALIDATION_ERROR, "请输入当前密码。");
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return failure(ERROR_CODES.VALIDATION_ERROR, "当前系统安全存储不可用，无法关闭启动密码。");
    }
    const vault = runtime.vault ?? await loadDataVault(runtime.vaultPath, runtime.databasePath);
    if (!vault) return failure(ERROR_CODES.VALIDATION_ERROR, "还没有设置密码。");
    if (!vault.isPasswordEnabled()) return;
    try {
      const dataKey = await vault.disablePassword(password, safeStorage);
      runtime.vault = vault;
      runtime.pinUpgradeRecommended = false;
      await runtime.onUnlocked(vault, dataKey);
    } catch {
      return failure(ERROR_CODES.VALIDATION_ERROR, "当前密码不正确，请重新输入。");
    }
  }));

  ipcMain.handle(IPC_CHANNELS.ACCESS_LOCK_NOW, wrapIpcHandler(async () => {
    await runtime.onLockRequested();
  }));
}

function isPinSetupInput(value: unknown): value is { password: string; recoveryPhrase: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { password?: unknown }).password === "string" &&
    typeof (value as { recoveryPhrase?: unknown }).recoveryPhrase === "string"
  );
}

function isRecoveryInput(value: unknown): value is { recoveryPhrase: string; newPassword: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { recoveryPhrase?: unknown }).recoveryPhrase === "string" &&
    typeof (value as { newPassword?: unknown }).newPassword === "string"
  );
}

function isPasswordChangeInput(value: unknown): value is { currentPassword: string; newPassword: string } {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { currentPassword?: unknown }).currentPassword === "string" &&
    typeof (value as { newPassword?: unknown }).newPassword === "string"
  );
}
