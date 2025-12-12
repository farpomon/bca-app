/**
 * Seed building codes data
 * Run with: node seed-building-codes.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { buildingCodes } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const codes = [
  {
    code: "NBC_2020",
    title: "National Building Code of Canada 2020",
    edition: "2020 Edition",
    jurisdiction: "Canada",
    year: 2020,
    documentUrl: null, // Will be updated after S3 upload
    documentKey: null,
    pageCount: 1528,
    isActive: 1,
  },
  {
    code: "BCBC_2024",
    title: "British Columbia Building Code 2024",
    edition: "2024 Edition, Revision 1",
    jurisdiction: "British Columbia",
    year: 2024,
    documentUrl: null,
    documentKey: null,
    pageCount: 1906,
    isActive: 1,
  },
  {
    code: "NBC_2023_AB",
    title: "National Building Code – 2023 Alberta Edition",
    edition: "2023 Alberta Edition",
    jurisdiction: "Alberta",
    year: 2023,
    documentUrl: null,
    documentKey: null,
    pageCount: 1570,
    isActive: 1,
  },
];

try {
  console.log("Seeding building codes...");
  
  for (const code of codes) {
    await db.insert(buildingCodes).values(code).onDuplicateKeyUpdate({
      set: {
        title: code.title,
        edition: code.edition,
        jurisdiction: code.jurisdiction,
        year: code.year,
        pageCount: code.pageCount,
      },
    });
    console.log(`✓ Seeded: ${code.title}`);
  }
  
  console.log("\n✅ Building codes seeded successfully!");
  process.exit(0);
} catch (error) {
  console.error("❌ Error seeding building codes:", error);
  process.exit(1);
}
