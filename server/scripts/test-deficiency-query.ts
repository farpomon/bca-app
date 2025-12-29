import { getDeficiencyPriorityBreakdown } from '../analyticsDb';

async function test() {
  console.log('Testing getDeficiencyPriorityBreakdown...');
  
  // Test without filters
  console.log('\n1. Without filters:');
  const allResults = await getDeficiencyPriorityBreakdown();
  console.log('Results:', allResults);
  
  // Test with projectId filter
  console.log('\n2. With projectId = 3630001:');
  const projectResults = await getDeficiencyPriorityBreakdown({ projectId: 3630001 });
  console.log('Results:', projectResults);
  
  // Test with projectId filter for project 3630002
  console.log('\n3. With projectId = 3630002:');
  const project2Results = await getDeficiencyPriorityBreakdown({ projectId: 3630002 });
  console.log('Results:', project2Results);
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
