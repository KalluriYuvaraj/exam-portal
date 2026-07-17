"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Detects when the student switches tabs / minimizes the window.
 * Logs each violation to the backend and triggers onMaxExceeded()
 * once the warning count passes maxWarnings.
 */
export function useTabSwitchDetection({ examId, token, maxWarnings, onMaxExceeded, active }) {
  const [warningCount, setWarningCount] = useState(0);
  const exceededRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        try {
          const res = await fetch("/api/submissions/log-violation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ examId, type: "tab_switch" }),
          });
          const data = await res.json();
          const count = data.violationCount ?? 0;
          setWarningCount(count);

          if (count >= maxWarnings && !exceededRef.current) {
            exceededRef.current = true;
            onMaxExceeded();
          }
        } catch (err) {
          console.error("Failed to log violation", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [active, examId, token, maxWarnings, onMaxExceeded]);

  return warningCount;
}
