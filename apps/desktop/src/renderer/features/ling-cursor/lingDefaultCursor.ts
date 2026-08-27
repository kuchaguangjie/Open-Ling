const CURSOR_CLASS_NAME = "ling-default-cursor";

function usesVirtualDefaultCursor(target: EventTarget | null) {
  return target instanceof Element && getComputedStyle(target).cursor === "none";
}

export function mountLingDefaultCursor(documentRoot: Document = document) {
  const cursor = documentRoot.createElement("div");
  cursor.className = CURSOR_CLASS_NAME;
  cursor.dataset.visible = "false";
  cursor.setAttribute("aria-hidden", "true");
  documentRoot.body.append(cursor);

  const hide = () => {
    cursor.dataset.visible = "false";
  };

  const update = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !usesVirtualDefaultCursor(event.target)) {
      hide();
      return;
    }

    // Match the 3px/3px hotspot used by the original native CSS cursor.
    cursor.style.transform = `translate3d(${event.clientX - 3}px, ${event.clientY - 3}px, 0)`;
    cursor.dataset.visible = "true";
  };

  const hideOutsideWindow = (event: MouseEvent) => {
    if (event.relatedTarget === null) hide();
  };

  documentRoot.addEventListener("pointermove", update, true);
  documentRoot.addEventListener("pointercancel", hide, true);
  documentRoot.defaultView?.addEventListener("blur", hide);
  documentRoot.defaultView?.addEventListener("mouseout", hideOutsideWindow);

  return () => {
    documentRoot.removeEventListener("pointermove", update, true);
    documentRoot.removeEventListener("pointercancel", hide, true);
    documentRoot.defaultView?.removeEventListener("blur", hide);
    documentRoot.defaultView?.removeEventListener("mouseout", hideOutsideWindow);
    cursor.remove();
  };
}
