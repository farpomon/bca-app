import { getBuildingComparison } from "./server/db-portfolioAnalytics";

async function test() {
  console.log("=== Testing getBuildingComparison ===");
  
  const results = await getBuildingComparison(
    1, // userId
    null, // company
    true, // isAdmin
    'priorityScore', // sortBy
    'desc', // sortOrder
    50 // limit
  );
  
  console.log(`Found ${results.length} buildings`);
  console.log("First 3 results:");
  results.slice(0, 3).forEach((building, idx) => {
    console.log(`\n${idx + 1}. ${building.assetName}`);
    console.log(`   Asset ID: ${building.assetId}`);
    console.log(`   Project: ${building.projectName}`);
    console.log(`   FCI: ${building.fci}`);
    console.log(`   Condition: ${building.conditionRating}`);
    console.log(`   Priority Score: ${building.priorityScore}`);
  });
}

test().catch(console.error);
