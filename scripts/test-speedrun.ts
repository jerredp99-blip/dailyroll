import {
  sortSpeedRunQueue,
  parseScReward,
  parseGcReward,
  getCasinoProvider,
  getCasinoMicroInstruction,
} from "../lib/speedRunStorage";
import type { Casino } from "../types/casino";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log("Running Speed Run V2 tests...");

  // 1. Test SC and GC parsing
  assert(parseScReward("$1.00 SC") === 1.0, "parseScReward $1.00 SC");
  assert(parseScReward("1 SC + 10,000 GC") === 1.0, "parseScReward 1 SC + 10,000 GC");
  assert(parseScReward("0.20 SC") === 0.2, "parseScReward 0.20 SC");
  assert(parseScReward("$2.50") === 2.5, "parseScReward $2.50");
  assert(parseScReward("5,000 GC") === 0, "parseScReward 5,000 GC (no SC)");
  assert(parseGcReward("1 SC + 10,000 GC") === 10000, "parseGcReward 10,000 GC");
  assert(parseGcReward("50k GC") === 50000, "parseGcReward 50k GC");
  console.log("✓ SC and GC reward parsing passed");

  // 2. Test micro-instructions
  const chumbaCasino: Casino = {
    id: "1",
    name: "Chumba Casino",
    dailyBonus: "$1.00 SC",
    lastClaimedAt: null,
    intervalHours: 24,
  };
  const tip = getCasinoMicroInstruction(chumbaCasino);
  assert(tip !== null && tip.includes("Get Coins"), "Default tip for Chumba");

  const customCasino: Casino = {
    id: "2",
    name: "Chumba Casino",
    dailyBonus: "$1.00 SC",
    claimInstructions: "Custom click green button",
    lastClaimedAt: null,
    intervalHours: 24,
  };
  assert(getCasinoMicroInstruction(customCasino) === "Custom click green button", "Custom tip overrides default");
  console.log("✓ Micro-instructions / cheat-code tests passed");

  // 3. Test Smart Sorting: Provider grouping first, then fixed reset before rolling reset
  const testQueue: Casino[] = [
    {
      id: "a",
      name: "LuckyLand Slots",
      dailyBonus: "0.30 SC",
      lastClaimedAt: null,
      intervalHours: 24,
      // VGW, rolling
    },
    {
      id: "b",
      name: "Chumba Casino",
      dailyBonus: "1.00 SC",
      lastClaimedAt: null,
      intervalHours: 24,
      resetAtTime: "00:00", // VGW, fixed
    },
    {
      id: "c",
      name: "McLuck",
      dailyBonus: "0.20 SC",
      lastClaimedAt: null,
      intervalHours: 24,
      // B2Services, rolling
    },
    {
      id: "d",
      name: "Hello Millions",
      dailyBonus: "0.20 SC",
      lastClaimedAt: null,
      intervalHours: 24,
      resetAtTime: "00:00", // B2Services, fixed
    },
  ];

  const sorted = sortSpeedRunQueue(testQueue);
  console.log("Sorted order:");
  sorted.forEach((c) => {
    console.log(` - ${c.name} (Provider: ${getCasinoProvider(c)}, Reset: ${c.resetAtTime || "rolling"})`);
  });

  // Providers should be grouped:
  const p0 = getCasinoProvider(sorted[0]);
  const p1 = getCasinoProvider(sorted[1]);
  assert(p0 === p1, "First two share provider");

  const p2 = getCasinoProvider(sorted[2]);
  const p3 = getCasinoProvider(sorted[3]);
  assert(p2 === p3, "Last two share provider");

  // Within B2Services group: Hello Millions (fixed) before McLuck (rolling)
  const b2Group = sorted.filter((c) => getCasinoProvider(c) === "B2Services");
  assert(b2Group[0].name === "Hello Millions", "Fixed reset precedes rolling reset in B2Services");
  assert(b2Group[1].name === "McLuck", "Rolling reset follows fixed reset in B2Services");

  // Within VGW group: Chumba (fixed) before LuckyLand (rolling)
  const vgwGroup = sorted.filter((c) => getCasinoProvider(c) === "VGW");
  assert(vgwGroup[0].name === "Chumba Casino", "Fixed reset precedes rolling reset in VGW");
  assert(vgwGroup[1].name === "LuckyLand Slots", "Rolling reset follows fixed reset in VGW");

  console.log("✓ Smart sorting tests passed");
  console.log("ALL TESTS PASSED! 🎉");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
