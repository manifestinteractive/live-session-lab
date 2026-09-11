"use client";

import { useEffect, useRef, useState } from "react";

function isolateStage(element: HTMLElement) {
  const siblings = new Map<HTMLElement, boolean>();
  for (
    let current: HTMLElement | null = element;
    current?.parentElement;
    current = current.parentElement
  ) {
    for (const sibling of current.parentElement.children) {
      if (sibling !== current && sibling instanceof HTMLElement) {
        siblings.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
  }
  return siblings;
}

export function useVideoFullscreen() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!element) return;
    const changed = () => setExpanded(document.fullscreenElement === element);
    const cancelPending = () => {
      generation.current++;
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      cancelPending();
      document.removeEventListener("fullscreenchange", changed);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    };
  }, [element]);

  useEffect(() => {
    if (!expanded || !element) return;
    const siblings = isolateStage(element);
    const button = toggleRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    button?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Base UI owns focus and Escape while a menu or confirmation is open.
      if (
        element.querySelector('[data-slot="popover-content"], [data-slot="alert-dialog-content"]')
      )
        return;
      if (event.key === "Escape" && !document.fullscreenElement) {
        event.preventDefault();
        generation.current++;
        setExpanded(false);
      }
      if (event.key === "Tab") {
        const controls = [
          ...element.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]'),
        ].filter((control) => !control.matches(":disabled") && control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      for (const [sibling, inert] of siblings) sibling.inert = inert;
      document.body.style.overflow = overflow;
      button?.focus({ preventScroll: true });
    };
  }, [expanded, element]);

  async function toggle() {
    if (!element) return;
    const operation = ++generation.current;
    if (expanded) {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen().catch(() => {});
      } else {
        setExpanded(false);
      }
      return;
    }
    setExpanded(true);
    if (element.requestFullscreen && document.fullscreenEnabled) {
      try {
        await element.requestFullscreen();
        if (generation.current !== operation && document.fullscreenElement === element) {
          await document.exitFullscreen();
        }
      } catch {
        // The expanded page view also works when native fullscreen is unavailable or denied.
      }
    }
  }

  return { element, setElement, expanded, toggle, toggleRef };
}
