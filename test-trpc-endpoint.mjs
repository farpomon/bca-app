import { getAssetAssessments } from "./server/db.ts";

// Test the getAssetAssessments function directly
console.log('Testing getAssetAssessments(133)...\n');
const assessments = await getAssetAssessments(133);

if (assessments && assessments.length > 0) {
  const firstAssessment = assessments[0];
  console.log('First assessment:');
  console.log('  ID:', firstAssessment.id);
  console.log('  Component Code:', firstAssessment.componentCode);
  console.log('  Component Name:', firstAssessment.componentName);
  console.log('  Source Type:', firstAssessment.sourceType);
  console.log('  Component ID:', firstAssessment.componentId);
  console.log('\nFull first assessment:');
  console.log(JSON.stringify(firstAssessment, null, 2));
} else {
  console.log('No assessments found');
}

process.exit(0);
