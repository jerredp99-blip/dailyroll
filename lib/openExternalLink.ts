/**
 * Utility to open external links cleanly without trapping users in an installed Android PWA.
 *
 * Problem:
 * On Android standalone PWA (installed to home screen), opening external casino links
 * using standard window.open() or raw <a target="_blank"> often opens them within
 * an in-app WebView or Custom Tab, locking users inside the PWA shell and causing
 * navigation / auth issues.
 *
 * Solution:
 * Detect Android running in standalone mode (display-mode: standalone) and route
 * the link through an Android Chrome Intent:
 * intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;
 * This instructs Android OS to launch the external Google Chrome browser application.
 *
 * For all other environments (iOS PWA, desktop, or standard browser tabs), it falls
 * back to window.open(url, '_blank', 'noopener,noreferrer').
 */

export function isAndroidStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const isAndroid = /android/i.test(navigator.userAgent || navigator.vendor || "");
  const isStandalone = Boolean(
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone
  );
  return isAndroid && isStandalone;
}

export function openInExternalBrowser(url: string): Window | null | void {
  if (!url || typeof window === "undefined") return;

  const trimmed = url.trim();
  const isAndroid =
    typeof navigator !== "undefined" &&
    /android/i.test(navigator.userAgent || navigator.vendor || "");

  const isStandalone = Boolean(
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (typeof navigator !== "undefined" &&
        (navigator as unknown as { standalone?: boolean }).standalone)
  );

  if (isAndroid && isStandalone) {
    const cleanUrl = trimmed.replace(/^https?:\/\//, "");
    const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
    window.location.href = intentUrl;
    return;
  }

  const fallbackUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return window.open(fallbackUrl, "_blank", "noopener,noreferrer");
}
