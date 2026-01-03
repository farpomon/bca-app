import { 
  getConditionDistribution,
  getCostAnalysis,
  getDeficiencyPriorityBreakdown,
  getAssessmentTrends,
} from '../analyticsDb';

async function test() {
  const projectId = 3630001;
  
  console.log('Testing getDashboardOverview components for project', projectId);
  
  console.log('\n1. getConditionDistribution:');
  const conditionDist = await getConditionDistribution({ projectId });
  console.log('Result:', conditionDist);
  
  console.log('\n2. getCostAnalysis:');
  const costAnalysis = await getCostAnalysis({ projectId });
  console.log('Result:', costAnalysis);
  
  console.log('\n3. getDeficiencyPriorityBreakdown:');
  const deficiencyBreakdown = await getDeficiencyPriorityBreakdown({ projectId });
  console.log('Result:', deficiencyBreakdown);
  
  console.log('\n4. getAssessmentTrends:');
  const trends = await getAssessmentTrends({ projectId, months: 6 });
  console.log('Result:', trends);
  
  console.log('\n\nFull dashboard overview:');
  const overview = {
    conditionDistribution: conditionDist,
    costAnalysis,
    deficiencyBreakdown,
    recentTrends: trends,
  };
  console.log(JSON.stringify(overview, null, 2));
  
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
