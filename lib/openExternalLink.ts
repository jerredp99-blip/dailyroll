/**
 * Utility to open external links cleanly without trapping users in an installed Android PWA.
 *
 * Problem:
 * On Android standalone PWA / WebAPK (installed to home screen), opening external casino links
 * using standard window.open() or raw <a target="_blank"> often opens them within
 * an in-app Chrome Custom Tab (CCT with the 'X' button) or trapped WebView, locking users
 * inside the PWA shell and causing navigation / auth issues.
 *
 * Solution:
 * Detect Android environments and route the link through an Android Chrome Intent:
 * - action=android.intent.action.VIEW & category=android.intent.category.BROWSABLE
 * - package=com.android.chrome & component=com.android.chrome/com.google.android.apps.chrome.Main
 * - launchFlags=0x10000000 (FLAG_ACTIVITY_NEW_TASK to spawn a new task outside WebAPK)
 * - B.org.chromium.chrome.browser.customtabs.EXTRA_OPEN_IN_BROWSER=true (bypasses Custom Tab)
 * - S.browser_fallback_url to gracefully fall back if Chrome package is missing.
 *
 * For all other environments (iOS PWA, desktop, or standard browser tabs), it falls
 * back to window.open(url, '_blank', 'noopener,noreferrer').
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
  const isAndr = isAndroid();

  if (isAndr) {
    const scheme = targetUrl.startsWith("http://") ? "http" : "https";
    // Encode any '#' inside path/query as '%23' so Android's Intent.parseUri doesn't truncate before #Intent;
    const cleanUrl = targetUrl.replace(/^https?:\/\//i, "").replace(/#/g, "%23");

    const intentUrl =
      `intent://${cleanUrl}#Intent;` +
      `scheme=${scheme};` +
      `action=android.intent.action.VIEW;` +
      `category=android.intent.category.BROWSABLE;` +
      `package=com.android.chrome;` +
      `component=com.android.chrome/com.google.android.apps.chrome.Main;` +
      `launchFlags=0x10000000;` +
      `B.org.chromium.chrome.browser.customtabs.EXTRA_OPEN_IN_BROWSER=true;` +
      `S.com.android.browser.application_id=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(targetUrl)};` +
      `end;`;

    try {
      const a = document.createElement("a");
      a.href = intentUrl;
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
      }, 500);
      return;
    } catch {
      window.location.assign(intentUrl);
      return;
    }
  }

  // Fallback for desktop browsers, iOS Safari / iOS PWA
  return window.open(targetUrl, "_blank", "noopener,noreferrer");
}
