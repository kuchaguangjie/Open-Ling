import { type RefObject, useLayoutEffect, useState } from "react";

export function useViewportFitScale(
  ref: RefObject<HTMLElement | null>,
  { extraHeight = 0, extraWidth = 0, margin = 24, minimumScale = 0.58 } = {}
) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      const element = ref.current;
      if (!element) return;
      const requiredWidth = Math.max(element.offsetWidth, element.scrollWidth) + extraWidth;
      const requiredHeight = Math.max(element.offsetHeight, element.scrollHeight) + extraHeight;
      if (!requiredWidth || !requiredHeight) return;
      const nextScale = Math.min(
        1,
        (window.innerWidth - margin * 2) / requiredWidth,
        (window.innerHeight - margin * 2) / requiredHeight
      );
      setScale(Math.max(minimumScale, Number(nextScale.toFixed(3))));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScale);
    if (ref.current) observer?.observe(ref.current);
    return () => {
      window.removeEventListener("resize", updateScale);
      observer?.disconnect();
    };
  }, [extraHeight, extraWidth, margin, minimumScale, ref]);

  return scale;
}
