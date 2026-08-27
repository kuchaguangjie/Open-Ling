import { useEffect, useRef } from "react";

export function SceneHotspot({
  ariaLabel,
  className,
  disabled,
  label,
  onClick,
  onIntent
}: {
  ariaLabel: string;
  className: string;
  disabled: boolean;
  label: string;
  onClick: () => void;
  onIntent?: () => void;
}) {
  const intentTimerRef = useRef<number | undefined>(undefined);
  const cancelDelayedIntent = () => {
    if (intentTimerRef.current !== undefined) window.clearTimeout(intentTimerRef.current);
    intentTimerRef.current = undefined;
  };
  const prepareAfterHover = () => {
    cancelDelayedIntent();
    intentTimerRef.current = window.setTimeout(() => {
      intentTimerRef.current = undefined;
      onIntent?.();
    }, 120);
  };
  const prepareNow = () => {
    cancelDelayedIntent();
    onIntent?.();
  };

  useEffect(() => cancelDelayedIntent, []);

  return (
    <button
      aria-label={ariaLabel}
      className={`lobby-hotspot ${className}`}
      data-hotspot-label={label}
      disabled={disabled}
      onFocus={prepareNow}
      onClick={onClick}
      onPointerDown={prepareNow}
      onPointerEnter={prepareAfterHover}
      onPointerLeave={cancelDelayedIntent}
      type="button"
    >
      <span aria-hidden="true" className="lobby-hotspot-beacon" />
      <span aria-hidden="true" className="lobby-hotspot-label">{label}</span>
    </button>
  );
}
