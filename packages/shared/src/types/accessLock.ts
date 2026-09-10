export interface AccessLockStatus {
  configured?: boolean;
  enabled: boolean;
  unlocked?: boolean;
  graceMinutes?: number;
  /**
   * True when the password used at the last successful unlock satisfied an
   * older, shorter minimum. Surfaced so Settings can invite an upgrade; never
   * used to block anyone, and recomputed on every unlock.
   */
  pinUpgradeRecommended?: boolean;
}

export interface AccessLockSetupInput {
  password: string;
  recoveryPhrase: string;
}

export interface AccessLockPasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export interface AccessLockRecoveryInput {
  recoveryPhrase: string;
  newPassword: string;
}
