import { seedAdminUserIfMissing, getUsers } from "../lib/store";

export async function seedAdmin() {
  console.log("Seeding and authorizing default admin account for Timber420@gmail.com...");
  await seedAdminUserIfMissing();
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

