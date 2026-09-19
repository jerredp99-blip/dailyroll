import { getVapidPublicKey, sendPushNotification, type PushNotificationPayload } from "../lib/web-push";
import {
  savePushSubscription,
  removePushSubscription,
  getPushSubscriptions,
} from "../lib/store";
import webpush from "web-push";

async function main() {
  console.log("=== Testing Web Push Infrastructure ===");

  // 1. Verify VAPID Key Retrieval
  const publicKey = getVapidPublicKey();
  console.log("1. Public VAPID Key:", publicKey ? "EXISTS (" + publicKey.slice(0, 10) + "...)" : "MISSING");
  if (!publicKey) throw new Error("Public VAPID key missing");

  // 2. Test Storing a Push Subscription
  const dummyEndpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-" + Date.now();
  const dummyKeys = {
    p256dh: "BMV_mock_p256dh_key_data_for_verification_testing",
    auth: "mock_auth_secret",
  };

  const stored = await savePushSubscription({
    endpoint: dummyEndpoint,
    keys: dummyKeys,
    userId: "testuser@dailyroll.app",
    casinoId: "1",
  });
  console.log("2. Stored subscription successfully, ID:", stored.id);

  // 3. Verify Subscription Retrieval
  const subs = await getPushSubscriptions({ userId: "testuser@dailyroll.app" });
  const found = subs.find((s) => s.endpoint === dummyEndpoint);
  console.log("3. Found subscription in store:", Boolean(found));
  if (!found) throw new Error("Subscription not found after save");

  // 3b. Verify Notifications are Disabled by Default for un-enrolled casinos
  const defaultSubEndpoint = "https://fcm.googleapis.com/fcm/send/default-sub-" + Date.now();
  await savePushSubscription({
    endpoint: defaultSubEndpoint,
    keys: dummyKeys,
    userId: "defaultuser@dailyroll.app",
  });
  const defaultSubsForCasino = await getPushSubscriptions({ casinoId: "stake" });
  const unEnrolledMatches = defaultSubsForCasino.find((s) => s.endpoint === defaultSubEndpoint);
  console.log("3b. Casino alert disabled by default for fresh subscription:", !unEnrolledMatches);
  if (unEnrolledMatches) throw new Error("Subscription was erroneously enrolled in casino alerts by default");
  await removePushSubscription(defaultSubEndpoint);

  // 4. Test Error Handling on Dead/Invalid Endpoint (410/404 handling)
  console.log("4. Testing dispatch to simulated endpoint (expecting graceful error and prune)...");
  const dummyPayload: PushNotificationPayload = {
    title: "dailyroll | Test Bonus",
    body: "Cooldown reset test notification",
    data: { url: "/tracker", casinoId: "1" },
  };

  const result = await sendPushNotification(
    {
      endpoint: dummyEndpoint,
      keys: dummyKeys,
    },
    dummyPayload
  );

  console.log("   Send result:", result);
  // FCM will return an error or 400/404/410 because the dummy token isn't registered on Google FCM
  console.log("   Handled gracefully without crashing:", result.success === false);

  // 4b. Test 410 Gone / 404 Not Found auto-pruning logic
  console.log("4b. Testing 410 Gone auto-prune logic...");
  const pruneTestEndpoint = "https://example.com/expired-subscription-" + Date.now();
  await savePushSubscription({
    endpoint: pruneTestEndpoint,
    keys: dummyKeys,
    userId: "testuser@dailyroll.app",
  });

  const originalSend = webpush.sendNotification;
  (webpush as any).sendNotification = async () => {
    const error: any = new Error("Subscription expired or gone");
    error.statusCode = 410;
    throw error;
  };

  const pruneResult = await sendPushNotification(
    { endpoint: pruneTestEndpoint, keys: dummyKeys },
    dummyPayload
  );
  (webpush as any).sendNotification = originalSend;

  console.log("   Prune result indicates expired:", pruneResult.expired === true);
  const remainingSubs = await getPushSubscriptions();
  const prunedSub = remainingSubs.find((s) => s.endpoint === pruneTestEndpoint);
  console.log("   Subscription was automatically deleted on 410:", !prunedSub);
  if (prunedSub) throw new Error("Subscription was not auto-pruned on 410 Gone");

  // 6. Test Background Cron Timer Expiration Checker
  console.log("6. Testing background cron bonus timer evaluation (even when app is closed)...");
  const { checkAndDispatchDueBonusNotifications } = await import("../lib/push-cron");
  const { saveCasinos } = await import("../lib/store");

  const cronUserEndpoint = "https://example.com/cron-test-endpoint-" + Date.now();
  await savePushSubscription({
    endpoint: cronUserEndpoint,
    keys: dummyKeys,
    userId: "cronuser@dailyroll.app",
    casinoId: "test-casino-due",
  });

  // Save a casino with an expired timer (targetResetTimestamp in the past)
  await saveCasinos("cronuser@dailyroll.app", [
    {
      id: "test-casino-due",
      name: "Due Casino",
      dailyBonus: "1.00 SC",
      intervalHours: 24,
      lastClaimedAt: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
      targetResetTimestamp: Date.now() - 10000, // Expired 10 seconds ago
      hidden: false,
    },
  ]);

  // Mock sendNotification to capture the call
  let capturedPayload: any = null;
  const origSend = webpush.sendNotification;
  (webpush as any).sendNotification = async (_sub: any, payload: string) => {
    capturedPayload = JSON.parse(payload);
    return { statusCode: 201 };
  };

  const cronResult = await checkAndDispatchDueBonusNotifications(Date.now());
  (webpush as any).sendNotification = origSend;

  console.log("   Cron checked count:", cronResult.checked);
  console.log("   Cron sent count:", cronResult.sent);
  console.log("   Captured notification title:", capturedPayload?.title);
  if (cronResult.sent < 1 || !capturedPayload?.title?.includes("Due Casino")) {
    throw new Error("Cron did not trigger notification for expired timer");
  }

  // Verify second run does NOT resend (avoids duplicates)
  const secondRun = await checkAndDispatchDueBonusNotifications(Date.now());
  console.log("   Second run (duplicate prevention) sent count:", secondRun.sent);
  if (secondRun.sent !== 0) {
    throw new Error("Cron sent duplicate notification for the same timer expiration");
  }

  await removePushSubscription(cronUserEndpoint);

  console.log("=== All Push Backend Tests Passed Successfully! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
