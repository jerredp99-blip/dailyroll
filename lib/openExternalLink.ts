/**
 * Utility to open external links cleanly without trapping users in an installed Android PWA.
 *
 * Problem:
 * On Android standalone PWA / WebAPK (installed to home screen), opening external casino links
 * using standard window.open() or raw <a target="_blank"> can open them within
 * an in-app Chrome Custom Tab or trapped WebView, locking users inside the PWA shell.
 *
 * Solution:
 * Detect Android standalone PWA environments and route the link through a valid Android Chrome Intent:
 * - scheme=https/http
 * - package=com.android.chrome
 * - S.browser_fallback_url for graceful fallback
 * - target="_blank" so the PWA host page is never navigated away or replaced with an error screen.
 *
 * For all other environments (standard browser tabs on Android/iOS/Desktop, iOS Safari/PWA),
 * standard window.open(url, '_blank', 'noopener,noreferrer') is used.
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

export function openInExternalBrowser(url: string): Window | null | void {
  if (!url || typeof window === "undefined") return;

  const trimmed = url.trim();
  const targetUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const isStandalone = isAndroidStandalone();

  if (isStandalone) {
    const scheme = targetUrl.startsWith("http://") ? "http" : "https";
    // Encode any '#' inside path/query as '%23' so Android's Intent.parseUri doesn't truncate before #Intent;
    const cleanUrl = targetUrl.replace(/^https?:\/\//i, "").replace(/#/g, "%23");

    // Standard valid Android Chrome Intent without unexported private activities
    const intentUrl =
      `intent://${cleanUrl}#Intent;` +
      `scheme=${scheme};` +
      `package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(targetUrl)};` +
      `end;`;

    try {
      const a = document.createElement("a");
      a.href = intentUrl;
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
      return;
    } catch {
      // Graceful fallback to window.open
      return window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
  }

  // Standard safe execution for browser tabs (Android Chrome, iOS Safari, Desktop)
  return window.open(targetUrl, "_blank", "noopener,noreferrer");
}
