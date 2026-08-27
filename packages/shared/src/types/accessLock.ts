export interface AccessLockStatus {
  configured?: boolean;
  enabled: boolean;
  unlocked?: boolean;
  graceMinutes?: number;
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
