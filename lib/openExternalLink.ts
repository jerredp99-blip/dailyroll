/**
 * Utility to open external links cleanly and safely across all platforms:
 * Android PWA / WebAPK, iOS Safari / PWA, Desktop Chrome / Edge.
 *
 * Prevents navigation errors ("This page couldn't load") by using standard,
 * clean HTTPS targets in new windows/tabs and avoiding unsupported or broken
 * private intent schemes.
 */

export function isAndroid(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return /android/i.test(navigator.userAgent || navigator.vendor || "");
}

export function isAndroidStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const isAndr = isAndroid();
  const isStandalone = Boolean(
    (window.matchMedia &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches)) ||
      (navigator as unknown as { standalone?: boolean }).standalone ||
      (typeof document !== "undefined" && document.referrer.includes("android-app://"))
  );
  return isAndr && isStandalone;
}

export function isValidHttpUrl(stringUrl?: string | null): boolean {
  if (!stringUrl) return false;
  try {
    const trimmed = stringUrl.trim();
    if (!trimmed) return false;
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function openInExternalBrowser(url: string): Window | null | void {
  if (!url || typeof window === "undefined") return;

  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) return;
  const targetUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  // 1. Try standard window.open in a new browsing context
  try {
    const win = window.open(targetUrl, "_blank", "noopener,noreferrer");
    if (win) {
      try {
        win.focus?.();
      } catch {
        // ignore
      }
      return win;
    }
    // By HTML specification, window.open with 'noopener' returns null on success.
    // Return immediately so we do NOT trigger a duplicate tab via anchor click!
    return;
  } catch {
    // Fall back to anchor navigation only if window.open threw an exception
    try {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch {
          // ignore
        }
      }, 300);
    } catch {
      // Final fallback
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  }
}
