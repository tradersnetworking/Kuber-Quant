/**
 * Clears and re-seeds minimal demo transaction data for all demo roles.
 * Run: pnpm db:refresh-sample
 */
import { migrateLegacyEmails, upsertDefaultUsers } from "../../artifacts/api-server/src/helpers/defaultUsers";
import {
  refreshSampleTransactionHistory,
  DEMO_ROLE_LOGINS,
} from "../../artifacts/api-server/src/helpers/sampleTransactionHistory";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    console.error("Refusing to refresh sample data in production. Set ALLOW_SEED=true to override.");
    process.exit(1);
  }

  console.log("Ensuring default platform users...");
  await migrateLegacyEmails();
  await upsertDefaultUsers({ resetPasswords: false });
  console.log("Default users ready.\n");

  console.log("Clearing old sample transactions and seeding fresh minimal data...");
  const result = await refreshSampleTransactionHistory();

  console.log("\n── Sample data refreshed ──");
  console.log(`  Removed:     ${result.txnsRemoved} old sample transaction(s)`);
  console.log(`  Inserted:    ${result.txnsInserted} new transaction(s)`);
  console.log(`  Investors:   ${result.usersSeeded} demo account(s)`);
  console.log(`  Pending:     ${result.pendingCount} in upcoming queue (admin/manager/support)`);
  console.log("\n── Demo logins (passwords unchanged) ──");
  for (const entry of Object.values(DEMO_ROLE_LOGINS)) {
    console.log(`  ${entry.role.padEnd(14)} ${entry.email} / ${entry.password}`);
  }
  console.log("\n── What to verify ──");
  console.log("  Investor  → /transactions → Upcoming section (2 pending for user@)");
  console.log("  Admin     → /super-admin/upcoming-transactions → approve/reject");
  console.log("  Manager   → /manager/upcoming-transactions → client pending items");
  console.log("  Support   → /support-team/upcoming-transactions → read-only queue");
  console.log("\nDone.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
