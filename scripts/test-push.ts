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

  // 5. Test Unsubscribe / Removal
  const removed = await removePushSubscription(dummyEndpoint);
  console.log("5. Unsubscribed successfully:", removed);

  const subsAfter = await getPushSubscriptions({ userId: "testuser@dailyroll.app" });
  const stillThere = subsAfter.find((s) => s.endpoint === dummyEndpoint);
  console.log("   Confirmed subscription cleaned up:", !stillThere);
  if (stillThere) throw new Error("Subscription was not removed");

  console.log("=== All Push Backend Tests Passed Successfully! ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
