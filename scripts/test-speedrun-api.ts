import {
  getSpeedRunSessionStore,
  saveSpeedRunSessionStore,
  deleteSpeedRunSessionStore,
} from "../lib/store";
import type { SpeedRunSessionState } from "../types/casino";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function testApiPersistence() {
  console.log("Testing Speed Run server-side cross-browser persistence...");

  const testState: SpeedRunSessionState = {
    queueIds: ["c1", "c2", "c3"],
    currentIndex: 1,
    currentStep: 2,
    sessionLootSc: 2.5,
    sessionLootGc: 10000,
    claimedIds: ["c1"],
    snoozedIds: { c2: new Date(Date.now() + 3600000).toISOString() },
    skippedIds: [],
    startedAt: new Date().toISOString(),
    completed: false,
  };

  const key = "timber420@gmail.com";

  // 1. Save session to store
  const saved = await saveSpeedRunSessionStore(key, testState);
  assert(saved.currentIndex === 1, "Saved session index matches");
  assert(saved.currentStep === 2, "Saved session step matches");
  assert(saved.sessionLootSc === 2.5, "Saved session loot matches");

  // 2. Read back
  const retrieved = await getSpeedRunSessionStore(key);
  assert(retrieved !== null, "Retrieved session exists");
  assert(retrieved?.currentIndex === 1, "Retrieved index matches 1");
  assert(retrieved?.currentStep === 2, "Retrieved step matches 2");
  assert(retrieved?.claimedIds[0] === "c1", "Claimed ID matches c1");
  assert(Boolean(retrieved?.snoozedIds["c2"]), "Snoozed ID matches c2");

  // 3. Delete session
  await deleteSpeedRunSessionStore(key);
  const afterDelete = await getSpeedRunSessionStore(key);
  assert(afterDelete === null, "Deleted session returns null");

  console.log("✓ Server-side cross-browser session persistence tests passed! 🎉");
}

testApiPersistence().catch((e) => {
  console.error(e);
  process.exit(1);
});

