import { seedAdminUserIfMissing, getUsers } from "../lib/store";
import { NEW_DISCOVERED_CASINOS } from "../lib/casinosData";
import { updateCasinoMetadata } from "../lib/db";

export async function seedMasterCasinos() {
  console.log("Seeding master casinos baseline values into store...");
  for (const casino of NEW_DISCOVERED_CASINOS) {
    await updateCasinoMetadata({
      name: casino.name,
      siteUrl: casino.siteUrl,
      dailyBonus: casino.dailyBonus,
      dailyBonusSc: casino.dailyBonusSc,
      minRedemption: casino.minRedemption,
      resetRule: casino.resetRule,
      hasStreak: casino.hasStreak,
      intervalHours: casino.intervalHours,
    });
    console.log(`Seeded casino: ${casino.name}`);
  }
}

export async function seedAdmin() {
  console.log("Seeding and authorizing default admin account for Timber420@gmail.com...");
  await seedAdminUserIfMissing();
  await seedMasterCasinos();
  const users = await getUsers();
  const adminUser = users.find((u) => u.email.toLowerCase() === "timber420@gmail.com");

  if (!adminUser) {
    throw new Error("Failed to seed admin user: record not found after seeding.");
  }

  console.log("Admin account successfully verified in store:");
  console.log({
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    isAdmin: adminUser.isAdmin,
    passwordHash: adminUser.passwordHash?.slice(0, 16) + "...",
  });
  return adminUser;
}

if (require.main === module) {
  seedAdmin()
    .then(() => {
      console.log("Seeding completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}

