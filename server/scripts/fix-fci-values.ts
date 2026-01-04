/**
 * Script to recalculate and fix all FCI values in the database
 * 
 * This fixes the issue where FCI was stored as percentage (0-100) instead of
 * decimal ratio (0-1).
 * 
 * Run with: npx tsx server/scripts/fix-fci-values.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { calculateFCI } from "../fciCalculationService";
import { calculateBuildingCI } from "../ciCalculationService";

async function fixFCIValues() {
  console.log("=== FCI Value Fix Script ===\n");
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection);
  
  try {
    // Get all projects with FCI values
    const [projects] = await connection.execute(`
      SELECT id, name, fci, deferredMaintenanceCost, currentReplacementValue
      FROM projects
      WHERE status != 'deleted' AND deletedAt IS NULL
    `);
    
    console.log(`Found ${(projects as any[]).length} projects to check\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const project of projects as any[]) {
      console.log(`\n--- Project: ${project.name} (ID: ${project.id}) ---`);
      
      const storedFci = project.fci ? parseFloat(project.fci) : null;
      
      // Recalculate FCI
      const fciResult = await calculateFCI(project.id);
      const ciResult = await calculateBuildingCI(project.id);
      
      console.log(`Stored FCI: ${storedFci}`);
      console.log(`Calculated FCI: ${fciResult.fci}`);
      console.log(`Calculated CI: ${ciResult.ci}`);
      
      // Check if stored value appears to be in percentage format (> 1)
      // or if there's a significant mismatch
      const needsFix = storedFci !== null && (
        storedFci > 1 || // Stored as percentage
        Math.abs(storedFci - fciResult.fci) > 0.001 // Significant mismatch
      );
      
      if (needsFix || storedFci === null) {
        console.log(`Updating FCI from ${storedFci} to ${fciResult.fci}`);
        
        await connection.execute(`
          UPDATE projects 
          SET 
            fci = ?,
            ci = ?,
            deferredMaintenanceCost = ?,
            currentReplacementValue = ?,
            lastCalculatedAt = NOW()
          WHERE id = ?
        `, [
          fciResult.fci.toString(),
          ciResult.ci.toString(),
          fciResult.deferredMaintenanceCost.toString(),
          fciResult.currentReplacementValue.toString(),
          project.id
        ]);
        
        fixedCount++;
        console.log(`✅ Fixed`);
      } else {
        skippedCount++;
        console.log(`⏭️ Skipped (already correct)`);
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Fixed: ${fixedCount} projects`);
    console.log(`Skipped: ${skippedCount} projects`);
    
    // Also fix CI/FCI snapshots if they have percentage values
    console.log(`\n--- Fixing CI/FCI Snapshots ---`);
    
    const [snapshots] = await connection.execute(`
      SELECT id, fci FROM ci_fci_snapshots WHERE fci > 1
    `);
    
    if ((snapshots as any[]).length > 0) {
      console.log(`Found ${(snapshots as any[]).length} snapshots with percentage FCI values`);
      
      for (const snapshot of snapshots as any[]) {
        const oldFci = parseFloat(snapshot.fci);
        const newFci = oldFci / 100; // Convert from percentage to decimal
        
        await connection.execute(`
          UPDATE ci_fci_snapshots SET fci = ? WHERE id = ?
        `, [newFci.toString(), snapshot.id]);
      }
      
      console.log(`✅ Fixed ${(snapshots as any[]).length} snapshots`);
    } else {
      console.log(`No snapshots need fixing`);
    }
    
  } catch (error) {
    console.error("Error fixing FCI values:", error);
  } finally {
    await connection.end();
  }
  
  process.exit(0);
}

fixFCIValues();
