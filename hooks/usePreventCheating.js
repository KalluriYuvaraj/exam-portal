"use client";

import { useEffect } from "react";

/**
 * Blocks copy, cut, paste, right-click context menu, text selection,
 * and common devtools/view-source keyboard shortcuts while active.
 * Not foolproof — raises the effort bar for casual cheating.
 */
export function usePreventCheating(active = true) {
  useEffect(() => {
    if (!active) return;

    const preventAction = (e) => e.preventDefault();

    const preventKeyCombos = (e) => {
      const key = e.key?.toLowerCase();
      const blockedCombo =
        (e.ctrlKey && ["c", "v", "x", "u", "s", "p"].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        key === "f12";

      if (blockedCombo) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", preventAction);
    document.addEventListener("cut", preventAction);
    document.addEventListener("paste", preventAction);
    document.addEventListener("contextmenu", preventAction);
    document.addEventListener("keydown", preventKeyCombos);

    // Discourage text selection/drag too
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("copy", preventAction);
      document.removeEventListener("cut", preventAction);
      document.removeEventListener("paste", preventAction);
      document.removeEventListener("contextmenu", preventAction);
      document.removeEventListener("keydown", preventKeyCombos);
      document.body.style.userSelect = prevUserSelect;
    };
  }, [active]);
}
