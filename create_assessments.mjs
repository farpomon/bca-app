import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const PROJECT_ID = 14;

const [assets] = await connection.execute(
  'SELECT id, name, assetCode, yearBuilt, squareFootage, replacementValue FROM assets WHERE projectId = ?',
  [PROJECT_ID]
);

const [components] = await connection.execute(
  'SELECT DISTINCT id, code, name FROM building_components WHERE level = 2 ORDER BY code'
);

const uniqueComponents = [];
const seenCodes = new Set();
for (const comp of components) {
  if (!seenCodes.has(comp.code)) {
    seenCodes.add(comp.code);
    uniqueComponents.push(comp);
  }
}

console.log('Found ' + assets.length + ' assets and ' + uniqueComponents.length + ' unique components');

function generateAssessmentData(asset, component) {
  const currentYear = 2026;
  const buildingAge = currentYear - asset.yearBuilt;
  const sqft = parseFloat(asset.squareFootage) || 100000;
  const replacementValue = parseFloat(asset.replacementValue) || 50000000;
  
  let baseCondition;
  if (buildingAge < 10) baseCondition = 5;
  else if (buildingAge < 20) baseCondition = 4;
  else if (buildingAge < 35) baseCondition = 3;
  else if (buildingAge < 50) baseCondition = 2;
  else baseCondition = 1;
  
  const fastDeterioratingComponents = ['B30', 'D30', 'D20', 'D50', 'C30'];
  const slowDeterioratingComponents = ['A10', 'A20', 'B10'];
  
  if (fastDeterioratingComponents.includes(component.code)) {
    baseCondition = Math.max(1, baseCondition - 1);
  } else if (slowDeterioratingComponents.includes(component.code)) {
    baseCondition = Math.min(5, baseCondition + 1);
  }
  
  const randomAdjust = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
  const finalCondition = Math.max(1, Math.min(5, baseCondition + randomAdjust));
  
  const componentCostFactors = {
    'A10': { repairFactor: 0.02, replaceFactor: 0.08 },
    'A20': { repairFactor: 0.015, replaceFactor: 0.06 },
    'B10': { repairFactor: 0.025, replaceFactor: 0.15 },
    'B20': { repairFactor: 0.03, replaceFactor: 0.12 },
    'B30': { repairFactor: 0.04, replaceFactor: 0.08 },
    'C10': { repairFactor: 0.02, replaceFactor: 0.06 },
    'C20': { repairFactor: 0.01, replaceFactor: 0.03 },
    'C30': { repairFactor: 0.025, replaceFactor: 0.07 },
    'D10': { repairFactor: 0.03, replaceFactor: 0.05 },
    'D20': { repairFactor: 0.025, replaceFactor: 0.06 },
    'D30': { repairFactor: 0.04, replaceFactor: 0.12 },
    'D40': { repairFactor: 0.02, replaceFactor: 0.04 },
    'D50': { repairFactor: 0.03, replaceFactor: 0.08 },
    'E10': { repairFactor: 0.015, replaceFactor: 0.04 },
    'E20': { repairFactor: 0.01, replaceFactor: 0.025 },
    'F10': { repairFactor: 0.02, replaceFactor: 0.05 },
    'F20': { repairFactor: 0.01, replaceFactor: 0.02 },
    'G10': { repairFactor: 0.015, replaceFactor: 0.04 },
    'G20': { repairFactor: 0.02, replaceFactor: 0.05 },
    'G30': { repairFactor: 0.025, replaceFactor: 0.06 },
    'G40': { repairFactor: 0.02, replaceFactor: 0.04 },
    'G90': { repairFactor: 0.01, replaceFactor: 0.02 }
  };
  
  const factors = componentCostFactors[component.code] || { repairFactor: 0.02, replaceFactor: 0.05 };
  
  const conditionMultiplier = { 1: 1.5, 2: 1.2, 3: 0.8, 4: 0.4, 5: 0.1 };
  
  const baseRepairCost = replacementValue * factors.repairFactor * conditionMultiplier[finalCondition];
  const baseReplaceCost = replacementValue * factors.replaceFactor;
  
  const variance = 0.8 + Math.random() * 0.4;
  const repairCost = Math.round(baseRepairCost * variance);
  const replaceCost = Math.round(baseReplaceCost * variance);
  
  const severityMap = { 1: 'critical', 2: 'major', 3: 'moderate', 4: 'minor', 5: null };
  const actionMap = { 1: 'immediate_action', 2: 'replace', 3: 'repair', 4: 'preventive_maintenance', 5: 'monitor' };
  const priorityMap = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
  
  const expectedLife = {
    'A10': 75, 'A20': 75, 'B10': 60, 'B20': 40, 'B30': 25,
    'C10': 30, 'C20': 50, 'C30': 15, 'D10': 25, 'D20': 30,
    'D30': 20, 'D40': 25, 'D50': 30, 'E10': 15, 'E20': 10,
    'F10': 30, 'F20': 20, 'G10': 40, 'G20': 25, 'G30': 40, 'G40': 35, 'G90': 30
  };
  
  const componentLife = expectedLife[component.code] || 30;
  const usedLife = Math.min(buildingAge, componentLife);
  const remainingLife = Math.max(0, Math.round((componentLife - usedLife) * (finalCondition / 5)));
  
  const conditionNotes = component.name + ' assessed. Condition rating ' + finalCondition + '/5 based on ' + buildingAge + ' year building age.';
  const deficiencyDesc = finalCondition <= 3 ? component.name + ' deficiencies identified requiring attention.' : null;
  
  return {
    conditionRating: String(finalCondition),
    conditionNotes,
    deficiencyDescription: deficiencyDesc,
    deficiencySeverity: severityMap[finalCondition],
    recommendedAction: actionMap[finalCondition],
    estimatedRepairCost: repairCost,
    priorityLevel: priorityMap[finalCondition],
    remainingLifeYears: remainingLife,
    quantity: Math.round(sqft * (0.1 + Math.random() * 0.2)),
    unit: 'SF',
    location: 'Building-wide',
    accessibilityIssue: finalCondition <= 2 && Math.random() > 0.7 ? 1 : 0,
    safetyHazard: finalCondition === 1 && Math.random() > 0.5 ? 1 : 0,
    energyEfficiencyIssue: ['D30', 'B20', 'B30'].includes(component.code) && finalCondition <= 3 ? 1 : 0,
    codeViolation: finalCondition === 1 && Math.random() > 0.6 ? 1 : 0,
    replacementCost: replaceCost
  };
}

let totalCreated = 0;
const assessmentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

for (const asset of assets) {
  console.log('Creating assessments for: ' + asset.name);
  
  for (const component of uniqueComponents) {
    const data = generateAssessmentData(asset, component);
    
    try {
      await connection.execute(
        'INSERT INTO assessments (assetId, componentId, projectId, assessmentDate, conditionRating, conditionNotes, deficiencyDescription, deficiencySeverity, recommendedAction, estimatedRepairCost, priorityLevel, remainingLifeYears, quantity, unit, location, accessibilityIssue, safetyHazard, energyEfficiencyIssue, codeViolation, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [asset.id, component.id, PROJECT_ID, assessmentDate, data.conditionRating, data.conditionNotes, data.deficiencyDescription, data.deficiencySeverity, data.recommendedAction, data.estimatedRepairCost, data.priorityLevel, data.remainingLifeYears, data.quantity, data.unit, data.location, data.accessibilityIssue, data.safetyHazard, data.energyEfficiencyIssue, data.codeViolation, 'submitted']
      );
      totalCreated++;
    } catch (err) {
      console.error('Error: ' + err.message);
    }
  }
}

console.log('Total assessments created: ' + totalCreated);

const [summary] = await connection.execute(
  'SELECT COUNT(*) as total, SUM(estimatedRepairCost) as totalRepairCost, AVG(estimatedRepairCost) as avgRepairCost FROM assessments WHERE projectId = ?',
  [PROJECT_ID]
);

console.log('Summary:', JSON.stringify(summary[0], null, 2));

await connection.end();
