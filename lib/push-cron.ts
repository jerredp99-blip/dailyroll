import {
  readStore,
  queueMutation,
  casinoKey,
  type StoredPushSubscription,
} from "./store";
import { sendPushNotification, type PushNotificationPayload } from "./web-push";
import { getCasinoTargetResetTimestamp } from "./timer-calculations";
import type { Casino } from "@/types/casino";

export interface CronDispatchResult {
  checked: number;
  sent: number;
  pruned: number;
  details: Array<{ user: string; casino: string; status: string }>;
}

/**
 * Evaluates all user casino timers on the server.
 * Dispatches web push notifications to users whose timers have reached zero / expired,
 * even when the app is closed, backgrounded, or their device is sleeping.
 *
 * Automatically tracks lastNotifiedTimestamps to avoid sending duplicate alerts for the same cooldown cycle.
 */
export async function checkAndDispatchDueBonusNotifications(
  now: number = Date.now()
): Promise<CronDispatchResult> {
  const store = await readStore();
  const subscriptions = store.pushSubscriptions || [];

  if (subscriptions.length === 0) {
    return { checked: 0, sent: 0, pruned: 0, details: [] };
  }

  let checked = 0;
  let sent = 0;
  let pruned = 0;
  const details: Array<{ user: string; casino: string; status: string }> = [];
  const updatedSubscriptions: StoredPushSubscription[] = [];
  let hasChanges = false;

  for (const sub of subscriptions) {
    const currentSub = { ...sub };
    const userEmail = currentSub.userId ? casinoKey(currentSub.userId) : null;

    if (!userEmail) {
      updatedSubscriptions.push(currentSub);
      continue;
    }

    const userCasinos: Casino[] = store.casinos?.[userEmail] || [];
    const enabledCasinos = currentSub.enabledCasinos || [];

    if (userCasinos.length === 0 || enabledCasinos.length === 0) {
      updatedSubscriptions.push(currentSub);
      continue;
    }

    for (const casino of userCasinos) {
      // Check if user explicitly enabled notifications for this casino ID or name
      const isEnabled =
        enabledCasinos.includes(casino.id) || enabledCasinos.includes(casino.name);

      if (!isEnabled) {
        continue;
      }

      checked++;
      const targetReset = getCasinoTargetResetTimestamp(casino, now);

      // Must have had an active cooldown
      if (!casino.lastClaimedAt && !casino.targetResetTimestamp && !casino.snoozedUntil) {
        continue;
      }

      // Check if timer has expired (targetReset <= now)
      if (targetReset !== null && targetReset <= now) {
        const lastNotified = currentSub.lastNotifiedTimestamps?.[casino.id];

        // If we already sent an alert for this cooldown cycle, do not duplicate
        if (lastNotified && lastNotified >= targetReset) {
          continue;
        }

        // Send Push Notification
        const bonusText = casino.dailyBonus || "Daily Bonus";
        const payload: PushNotificationPayload = {
          title: `dailyroll | ${casino.name} Bonus Ready! 🎰`,
          body: `Cooldown reset! Your ${bonusText} at ${casino.name} is ready to claim now.`,
          icon: "/icon-192.png",
          badge: "/favicon-32x32.png",
          data: {
            url: "/tracker",
            casinoId: casino.id,
            casinoName: casino.name,
          },
          tag: `casino-reset-${casino.id}`,
          renotify: true,
        };

        const result = await sendPushNotification(currentSub, payload);

        if (result.success) {
          sent++;
          details.push({ user: userEmail, casino: casino.name, status: "sent" });

          if (!currentSub.lastNotifiedTimestamps) {
            currentSub.lastNotifiedTimestamps = {};
          }
          currentSub.lastNotifiedTimestamps[casino.id] = targetReset;
          currentSub.updatedAt = new Date().toISOString();
          hasChanges = true;
        } else {
          details.push({
            user: userEmail,
            casino: casino.name,
            status: `failed: ${result.error}`,
          });
          if (result.expired) {
            pruned++;
          }
        }
      }
    }

    updatedSubscriptions.push(currentSub);
  }

  // Persist updated notification timestamp state if any alerts were dispatched
  if (hasChanges) {
    await queueMutation((s) => {
      // Update matching pushSubscriptions with new lastNotifiedTimestamps
      for (const updated of updatedSubscriptions) {
        const idx = s.pushSubscriptions?.findIndex(
          (item) => item.endpoint === updated.endpoint
        );
        if (idx !== undefined && idx >= 0 && s.pushSubscriptions) {
          s.pushSubscriptions[idx] = updated;
        }
      }
    });
  }

  return { checked, sent, pruned, details };
}
