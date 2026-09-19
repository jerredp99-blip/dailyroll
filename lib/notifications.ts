// Browser Notification & Web Push utilities (Rolled back / Disabled)

export type NotificationPermissionState = NotificationPermission | "unsupported";

export function isNotificationSupported(): boolean {
  return false;
}

export function getNotificationPermission(): NotificationPermissionState {
  return "unsupported";
}

export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  return null;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  return "unsupported";
}

export function getCasinoNotificationPreferences(): Record<string, boolean> {
  return {};
}

export async function setCasinoNotificationPreference(
  _casinoId: string,
  _enabled: boolean,
  _userEmail?: string | null
): Promise<Record<string, boolean>> {
  return {};
}

export async function fetchServerNotificationPreferences(): Promise<Record<string, boolean>> {
  return {};
}

export async function sendCasinoReadyNotification(
  _casinoName: string,
  _bonusText?: string,
  _url?: string,
  _iconUrl?: string
): Promise<boolean> {
  return false;
}

export async function triggerTimerZeroNotification(
  _casinoName: string,
  _casinoLogo?: string,
  _bonusText?: string,
  _url?: string
): Promise<boolean> {
  return false;
}

export async function sendTestNotification(_casinoName: string = "DailyRoll"): Promise<boolean> {
  return false;
}
