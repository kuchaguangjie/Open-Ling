/**
 * Unified success / failure contract for all IPC handlers.
 *
 * Every handler MUST return either IpcSuccess<T> or IpcFailure.
 * Renderer callers should check `result.ok` before accessing `.data`.
 * The error body never includes API keys, raw message content, or stack traces.
 */

export interface IpcSuccess<T = unknown> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: IpcErrorPayload;
}

export interface IpcErrorPayload {
  /** Machine-readable error code (e.g. "VALIDATION_ERROR", "NOT_FOUND") */
  code: string;
  /** Human-readable Chinese summary — safe to display in UI */
  message: string;
}

/**
 * Standardised machine-readable error codes.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BUSY: "BUSY",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Wrap a value in a success envelope.
 */
export function success<T>(data: T): IpcSuccess<T> {
  return { ok: true, data };
}

/**
 * Create a failure envelope with a code and a human-readable message.
 */
export function failure(code: string, message: string): IpcFailure {
  return { ok: false, error: { code, message } };
}

export type IpcHandlerResult<T> = T | IpcFailure;

export function isIpcFailure(value: unknown): value is IpcFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false &&
    typeof (value as { error?: { code?: unknown } }).error?.code === "string" &&
    typeof (value as { error?: { message?: unknown } }).error?.message === "string"
  );
}

export function wrapIpcHandler<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<IpcHandlerResult<T>>
): (...args: Args) => Promise<IpcSuccess<T> | IpcFailure> {
  return async (...args: Args) => {
    try {
      const result = await fn(...args);
      return isIpcFailure(result) ? result : success(result);
    } catch {
      return failure(ERROR_CODES.INTERNAL_ERROR, "服务器内部错误，请稍后重试");
    }
  };
}

/**
 * Redact sensitive fields from an arbitrary payload before it could
 * be included in an error message or log.
 *
 * Fields that get redacted: apiKey, content, stack
 * (The rules are conservative — only fields explicitly listed are redacted.)
 */
export function sanitizeErrorPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const SENSITIVE_KEYS = new Set(["apiKey", "content", "stack"]);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    cleaned[key] = SENSITIVE_KEYS.has(key) ? "[redacted]" : value;
  }
  return cleaned;
}
