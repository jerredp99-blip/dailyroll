import webpush from "web-push";
import { redis } from "@/lib/redis";

const VAPID_STORAGE_KEY = "system:vapid_keys";

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/**
 * Returns VAPID keys from environment variables, or automatically loads / generates
 * and persists them in Upstash Redis so it works seamlessly out-of-the-box.
 */
export async function getOrGenerateVapidKeys(): Promise<VapidKeys> {
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate };
  }

  // Check if previously stored in Redis
  try {
    const stored = await redis.get<VapidKeys | string>(VAPID_STORAGE_KEY);
    if (stored) {
      const parsed: VapidKeys = typeof stored === "string" ? JSON.parse(stored) : stored;
      if (parsed?.publicKey && parsed?.privateKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[DailyRoll] Could not retrieve VAPID keys from Redis:", err);
  }

  // Generate new standard VAPID keypair
  const newKeys = webpush.generateVAPIDKeys();
  try {
    await redis.set(VAPID_STORAGE_KEY, JSON.stringify(newKeys));
    console.log("[DailyRoll] Generated and stored new VAPID keypair in Redis");
  } catch (err) {
    console.warn("[DailyRoll] Could not save generated VAPID keys to Redis:", err);
  }

  return newKeys;
}

/**
 * Configures web-push with current VAPID details and returns the public key.
 */
export async function configureWebPush(): Promise<string> {
  const keys = await getOrGenerateVapidKeys();
  const contactEmail = process.env.VAPID_CONTACT_EMAIL || "mailto:support@dailyroll.app";

  webpush.setVapidDetails(contactEmail, keys.publicKey, keys.privateKey);
  return keys.publicKey;
}

export { webpush };
