"use client";

import { useRef, useEffect } from "react";
import { triggerTimerZeroNotification } from "@/lib/notifications";

export function useCasinoCountdown(
  casinoId: string,
  casinoName: string,
  casinoLogo: string | undefined,
  targetTimestamp: number | null, // epoch ms when cooldown expires
  notifyEnabled: boolean
) {
  const firedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!targetTimestamp) {
      firedRef.current = false;
      return;
    }

    // Reset fired status whenever a new future cooldown is assigned
    if (targetTimestamp > Date.now()) {
      firedRef.current = false;
    }

    const checkExpiration = () => {
      const remainingMs = targetTimestamp - Date.now();

      // Check if timer expired (<= 0) and has not yet triggered an alert
      if (remainingMs <= 0 && !firedRef.current) {
        firedRef.current = true;

        if (notifyEnabled) {
          triggerTimerZeroNotification(casinoName, casinoLogo);
        }
      }
    };

    // Check immediately on mount/update (catches wake-from-sleep events)
    checkExpiration();

    const intervalId = setInterval(checkExpiration, 1000);

    // Re-check when window regains visibility after being backgrounded/locked
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkExpiration();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [targetTimestamp, notifyEnabled, casinoName, casinoLogo]);
}

export default useCasinoCountdown;

