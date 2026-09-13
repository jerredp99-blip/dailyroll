export { seedAdmin } from "../scripts/seed-admin";
import { seedAdmin } from "../scripts/seed-admin";

if (require.main === module) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

