/**
 * repair_broll_tags.ts
 *
 * One-shot, idempotent data repair script.
 * Finds all BRoll records whose visualTags or emotionTags fields contain
 * non-JSON-encoded values (e.g. the bare string "test" instead of '["test"]')
 * and normalises them to proper JSON arrays.
 *
 * Safe to run multiple times — records that are already valid JSON are left
 * untouched.
 *
 * Usage:
 *   npx ts-node scripts/repair_broll_tags.ts
 *
 * Prerequisites:
 *   DATABASE_URL must be set in the environment (or .env file in the root).
 */

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Returns true when the string is valid JSON (any shape). */
function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalises a raw tag column value into a valid JSON array string.
 *
 * Rules (same as safeParseJsonArray in broll.repository.ts):
 *   - null / ""          → "[]"
 *   - valid JSON array   → unchanged (already correct)
 *   - valid JSON scalar  → wraps it: e.g. `"42"` → `'["42"]'`
 *   - un-parseable       → wraps the raw string: e.g. `"test"` → `'["test"]'`
 */
function normaliseTagValue(raw: string | null | undefined): string {
  if (!raw || raw.trim() === "") return "[]";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Already a proper array — ensure every element is a string
      return JSON.stringify(parsed.map(String));
    }
    // Scalar JSON value → single-element array
    return JSON.stringify([String(parsed)]);
  } catch {
    // Un-parseable bare string → wrap it
    return JSON.stringify([raw.trim()]);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  BRoll Tag Repair Script");
  console.log("═══════════════════════════════════════════════\n");

  // 1. Fetch all records (read phase)
  const allRecords = await prisma.bRoll.findMany({
    select: {
      id: true,
      title: true,
      visualTags: true,
      emotionTags: true,
    },
  });

  console.log(`Records checked : ${allRecords.length}`);

  // 2. Identify records that need repair
  const toRepair: Array<{
    id: string;
    title: string;
    visualTagsBefore: string;
    emotionTagsBefore: string;
    visualTagsAfter: string;
    emotionTagsAfter: string;
    fields: string[];
  }> = [];

  for (const record of allRecords) {
    const fields: string[] = [];
    const visualTagsOk = record.visualTags !== null && isValidJson(record.visualTags) && Array.isArray(JSON.parse(record.visualTags));
    const emotionTagsOk = record.emotionTags !== null && isValidJson(record.emotionTags) && Array.isArray(JSON.parse(record.emotionTags));

    if (!visualTagsOk) fields.push("visualTags");
    if (!emotionTagsOk) fields.push("emotionTags");

    if (fields.length > 0) {
      toRepair.push({
        id: record.id,
        title: record.title,
        visualTagsBefore: record.visualTags ?? "(null)",
        emotionTagsBefore: record.emotionTags ?? "(null)",
        visualTagsAfter: normaliseTagValue(record.visualTags),
        emotionTagsAfter: normaliseTagValue(record.emotionTags),
        fields,
      });
    }
  }

  console.log(`Records needing repair : ${toRepair.length}`);

  if (toRepair.length === 0) {
    console.log("\n✅  Nothing to repair. All records are already valid.\n");
    return;
  }

  console.log("\nRecords to be repaired:");
  for (const r of toRepair) {
    console.log(`  • [${r.id}] "${r.title}"`);
    console.log(`    Fields : ${r.fields.join(", ")}`);
    if (r.fields.includes("visualTags")) {
      console.log(`    visualTags  : ${r.visualTagsBefore} → ${r.visualTagsAfter}`);
    }
    if (r.fields.includes("emotionTags")) {
      console.log(`    emotionTags : ${r.emotionTagsBefore} → ${r.emotionTagsAfter}`);
    }
  }

  // 3. Write phase — update each malformed record
  console.log("\nApplying repairs...");
  let repaired = 0;
  const repairedIds: string[] = [];
  const errors: Array<{ id: string; error: string }> = [];

  for (const r of toRepair) {
    try {
      await prisma.bRoll.update({
        where: { id: r.id },
        data: {
          visualTags: r.visualTagsAfter,
          emotionTags: r.emotionTagsAfter,
        },
      });
      repaired++;
      repairedIds.push(r.id);
      console.log(`  ✓ Repaired [${r.id}] "${r.title}"`);
    } catch (err: any) {
      errors.push({ id: r.id, error: err.message });
      console.error(`  ✗ Failed  [${r.id}] "${r.title}": ${err.message}`);
    }
  }

  // 4. Summary
  console.log("\n═══════════════════════════════════════════════");
  console.log("  Repair Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`  Records checked  : ${allRecords.length}`);
  console.log(`  Records repaired : ${repaired}`);
  if (repairedIds.length > 0) {
    console.log(`  Repaired IDs     :`);
    repairedIds.forEach(id => console.log(`    - ${id}`));
  }
  if (errors.length > 0) {
    console.log(`  Errors           : ${errors.length}`);
    errors.forEach(e => console.log(`    - [${e.id}] ${e.error}`));
  }
  console.log("═══════════════════════════════════════════════\n");

  if (errors.length > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Fatal error in repair script:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
