import mysql from "mysql2/promise";
import "dotenv/config";

async function migrateAssets() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("Starting asset migration...");

    // Get all projects
    const [projects] = await connection.query("SELECT id, name FROM projects");
    console.log(`Found ${projects.length} projects`);

    for (const project of projects) {
      console.log(`Processing project: ${project.name} (ID: ${project.id})`);

      // Check if project already has an asset
      const [existingAssets] = await connection.query(
        "SELECT id FROM assets WHERE projectId = ?",
        [project.id]
      );

      if (existingAssets.length > 0) {
        console.log(`  ✓ Project already has ${existingAssets.length} asset(s), skipping`);
        continue;
      }

      // Create default asset for this project
      const [result] = await connection.query(
        `INSERT INTO assets (projectId, name, status, createdAt, updatedAt) 
         VALUES (?, ?, 'active', NOW(), NOW())`,
        [project.id, `${project.name} - Main Building`]
      );

      const assetId = result.insertId;
      console.log(`  ✓ Created default asset (ID: ${assetId})`);

      // Update all assessments for this project to link to the new asset
      const [updateResult] = await connection.query(
        "UPDATE assessments SET assetId = ? WHERE projectId = ? AND assetId IS NULL",
        [assetId, project.id]
      );

      console.log(`  ✓ Updated ${updateResult.affectedRows} assessments`);
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrateAssets();
