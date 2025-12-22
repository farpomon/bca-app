/**
 * Migration script to generate unique IDs for existing projects and assets
 * Run with: pnpm tsx scripts/migrate-add-unique-ids.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { projects, assets } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

/**
 * Generate a unique ID for a project
 * Format: PROJ-YYYYMMDD-XXXX
 */
function generateProjectUniqueId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `PROJ-${year}${month}${day}-${random}`;
}

/**
 * Generate a unique ID for an asset
 * Format: ASSET-YYYYMMDD-XXXX
 */
function generateAssetUniqueId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `ASSET-${year}${month}${day}-${random}`;
}

async function migrateProjects() {
  console.log("Migrating projects...");
  
  // Get all projects without unique IDs
  const allProjects = await db.select().from(projects);
  const projectsToUpdate = allProjects.filter(p => !p.uniqueId || p.uniqueId === '');
  
  console.log(`Found ${projectsToUpdate.length} projects to update`);
  
  for (const project of projectsToUpdate) {
    const uniqueId = generateProjectUniqueId();
    await db.update(projects)
      .set({ uniqueId })
      .where(eq(projects.id, project.id));
    console.log(`✓ Updated project ${project.id}: ${uniqueId}`);
  }
  
  console.log(`✅ Migrated ${projectsToUpdate.length} projects`);
}

async function migrateAssets() {
  console.log("\nMigrating assets...");
  
  // Get all assets without unique IDs
  const allAssets = await db.select().from(assets);
  const assetsToUpdate = allAssets.filter(a => !a.uniqueId || a.uniqueId === '');
  
  console.log(`Found ${assetsToUpdate.length} assets to update`);
  
  for (const asset of assetsToUpdate) {
    const uniqueId = generateAssetUniqueId();
    await db.update(assets)
      .set({ uniqueId })
      .where(eq(assets.id, asset.id));
    console.log(`✓ Updated asset ${asset.id}: ${uniqueId}`);
  }
  
  console.log(`✅ Migrated ${assetsToUpdate.length} assets`);
}

async function addUniqueConstraints() {
  console.log("\nAdding unique constraints...");
  
  try {
    // Check if indexes already exist before creating
    const [projectIndexes] = await db.execute({ sql: "SHOW INDEX FROM projects WHERE Key_name = 'idx_projects_unique_id'" });
    if (!projectIndexes || projectIndexes.length === 0) {
      await db.execute({ sql: "CREATE UNIQUE INDEX idx_projects_unique_id ON projects(uniqueId)" });
      console.log("✓ Added unique index on projects.uniqueId");
    } else {
      console.log("✓ Unique index on projects.uniqueId already exists");
    }
    
    const [assetIndexes] = await db.execute({ sql: "SHOW INDEX FROM assets WHERE Key_name = 'idx_assets_unique_id'" });
    if (!assetIndexes || assetIndexes.length === 0) {
      await db.execute({ sql: "CREATE UNIQUE INDEX idx_assets_unique_id ON assets(uniqueId)" });
      console.log("✓ Added unique index on assets.uniqueId");
    } else {
      console.log("✓ Unique index on assets.uniqueId already exists");
    }
    
    console.log("✅ Unique constraints added");
  } catch (error) {
    console.error("Error adding unique constraints:", error);
  }
}

async function main() {
  try {
    await migrateProjects();
    await migrateAssets();
    await addUniqueConstraints();
    
    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
