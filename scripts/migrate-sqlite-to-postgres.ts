/**
 * NexusAI — SQLite → PostgreSQL Data Migration Script
 *
 * This script reads all data from the SQLite database and inserts it into
 * the PostgreSQL database (configured via DATABASE_URL env var).
 *
 * USAGE:
 *   1. Ensure DATABASE_URL points to the PostgreSQL database
 *   2. Ensure SQLITE_DATABASE_URL points to the SQLite file
 *   3. Run: npx prisma migrate deploy (to create PostgreSQL schema)
 *   4. Run: npx tsx scripts/migrate-sqlite-to-postgres.ts
 *   5. Verify row counts match
 *
 * SAFETY:
 *   - Does NOT delete or modify the SQLite database
 *   - Preserves all IDs, timestamps, relationships
 *   - Handles foreign-key ordering (parents before children)
 *   - Idempotent: uses upsert, safe to re-run
 *
 * MODELS MIGRATED (in dependency order):
 *   1. User (no dependencies)
 *   2. Folder (depends on User)
 *   3. Chat (depends on User, Folder)
 *   4. Message (depends on Chat)
 *   5. Document (depends on User, Folder)
 *   6. DocumentVersion (depends on Document)
 *   7. Image (depends on User)
 *   8. CreditTransaction (depends on User)
 *   9. AuditLog (depends on User)
 *   10. ApiKey (depends on User)
 *   11. Template (no dependencies)
 *   12. Agent (no dependencies)
 *   13. BrandVoice (depends on User)
 *   14. GeneratorHistory (depends on User)
 *   15. PlatformSetting (no dependencies)
 *   16. AiUsageLog (no FK — userId is nullable, no relation)
 *   17. PromptConfig (no dependencies)
 *   18. AiModel (no dependencies)
 */

import { PrismaClient } from "@prisma/client";

// Source: SQLite database (read-only)
const sqliteUrl = process.env.SQLITE_DATABASE_URL || "file:db/custom.db";
const sqlite = new PrismaClient({
  datasourceUrl: sqliteUrl,
});

// Target: PostgreSQL database (write)
const postgres = new PrismaClient();

interface MigrationReport {
  model: string;
  sqliteCount: number;
  postgresCount: number;
  status: "OK" | "MISMATCH" | "ERROR";
  error?: string;
}

async function migrate() {
  const report: MigrationReport[] = [];
  console.log("=== NexusAI SQLite → PostgreSQL Migration ===\n");
  console.log(`Source (SQLite): ${sqliteUrl}`);
  console.log(`Target (PostgreSQL): ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}\n`);

  // Helper: migrate a model
  async function migrateModel<T extends { id: string }>(
    name: string,
    sqliteModel: { findMany: () => Promise<T[]>; count: () => Promise<number> },
    pgModel: { upsert: (args: { where: { id: string }; create: T; update: T }) => Promise<T>; count: () => Promise<number> },
  ) {
    const sqliteCount = await sqliteModel.count();
    console.log(`Migrating ${name}: ${sqliteCount} records...`);

    if (sqliteCount === 0) {
      const pgCount = await pgModel.count();
      report.push({ model: name, sqliteCount: 0, postgresCount: pgCount, status: "OK" });
      console.log(`  ${name}: 0 records (skipped)\n`);
      return;
    }

    const records = await sqliteModel.findMany();
    let migrated = 0;
    let error: string | undefined;

    for (const record of records) {
      try {
        await pgModel.upsert({
          where: { id: record.id },
          create: record,
          update: record,
        });
        migrated++;
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.error(`  ERROR on ${name} id=${record.id}: ${error}`);
      }
    }

    const pgCount = await pgModel.count();
    const status: MigrationReport["status"] = pgCount === sqliteCount ? "OK" : "MISMATCH";
    report.push({ model: name, sqliteCount, postgresCount: pgCount, status, error });
    console.log(`  ${name}: ${sqliteCount} → ${pgCount} (${status})${error ? ` ERROR: ${error}` : ""}\n`);
  }

  // Migrate in dependency order
  await migrateModel("User", sqlite.user, postgres.user);
  await migrateModel("Folder", sqlite.folder, postgres.folder);
  await migrateModel("Chat", sqlite.chat, postgres.chat);
  await migrateModel("Message", sqlite.message, postgres.message);
  await migrateModel("Document", sqlite.document, postgres.document);
  await migrateModel("DocumentVersion", sqlite.documentVersion, postgres.documentVersion);
  await migrateModel("Image", sqlite.image, postgres.image);
  await migrateModel("CreditTransaction", sqlite.creditTransaction, postgres.creditTransaction);
  await migrateModel("AuditLog", sqlite.auditLog, postgres.auditLog);
  await migrateModel("ApiKey", sqlite.apiKey, postgres.apiKey);
  await migrateModel("Template", sqlite.template, postgres.template);
  await migrateModel("Agent", sqlite.agent, postgres.agent);
  await migrateModel("BrandVoice", sqlite.brandVoice, postgres.brandVoice);
  await migrateModel("GeneratorHistory", sqlite.generatorHistory, postgres.generatorHistory);
  await migrateModel("PlatformSetting", sqlite.platformSetting, postgres.platformSetting);
  await migrateModel("AiUsageLog", sqlite.aiUsageLog, postgres.aiUsageLog);
  await migrateModel("PromptConfig", sqlite.promptConfig, postgres.promptConfig);
  await migrateModel("AiModel", sqlite.aiModel, postgres.aiModel);

  // Summary
  console.log("=== Migration Report ===");
  console.log("MODEL                    | SQLITE | PG     | STATUS");
  console.log("-------------------------|--------|--------|----------");
  for (const r of report) {
    console.log(
      `${r.model.padEnd(24)}| ${String(r.sqliteCount).padStart(6)} | ${String(r.postgresCount).padStart(6)} | ${r.status}`
    );
  }

  const allOk = report.every((r) => r.status === "OK");
  console.log(`\n${allOk ? "✅ ALL MODELS MIGRATED SUCCESSFULLY" : "❌ SOME MODELS HAVE MISMATCHES — REVIEW ABOVE"}`);

  await sqlite.$disconnect();
  await postgres.$disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
