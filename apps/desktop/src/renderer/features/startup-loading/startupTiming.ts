export const STARTUP_MINIMUM_VISIBLE_MS = 3_000;
export const STARTUP_PHASE_MIN_VISIBLE_MS = 1_000;
export const STARTUP_READY_HOLD_MS = 1_000;
export const STARTUP_DESTINATION_MOUNT_DELAY_MS = 120;
// Keep the unmount just behind the 160ms CSS fade. A long invisible tail makes
// startup feel blocked even though the destination is already visible.
export const STARTUP_EXIT_DURATION_MS = 180;
export const STARTUP_ASSET_PRELOAD_TIMEOUT_MS = 1_200;

export function getStartupDelayBeforeReady(startedAt: number, now = Date.now()) {
  return Math.max(0, STARTUP_MINIMUM_VISIBLE_MS - STARTUP_READY_HOLD_MS - (now - startedAt));
}
