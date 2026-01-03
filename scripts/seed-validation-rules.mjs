import mysql from 'mysql2/promise';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Seeding default validation rules...');

// Get owner user ID
const [users] = await connection.execute('SELECT id FROM users WHERE openId = ? LIMIT 1', [process.env.OWNER_OPEN_ID]);
const ownerId = users[0]?.id || 1;

// Default validation rules
const rules = [
  {
    name: 'Same Year Inspection Warning',
    description: 'Warn when inspection is in the same year as building installation',
    ruleType: 'same_year_inspection',
    severity: 'warning',
    field: 'assessedAt',
    condition: JSON.stringify({}),
    message: 'This inspection is in the same year as the building installation. Please verify this is correct.',
    isActive: 1,
    projectId: null, // Global rule
    createdBy: ownerId,
  },
  {
    name: 'Negative Useful Life Warning',
    description: 'Warn when remaining useful life is negative',
    ruleType: 'numeric_range',
    severity: 'warning',
    field: 'remainingUsefulLife',
    condition: JSON.stringify({ min: 0 }),
    message: 'Remaining useful life cannot be negative. Please review the assessment.',
    isActive: 1,
    projectId: null,
    createdBy: ownerId,
  },
  {
    name: 'Excessive Repair Cost Warning',
    description: 'Warn when repair cost exceeds replacement value',
    ruleType: 'custom_logic',
    severity: 'warning',
    field: 'estimatedRepairCost',
    condition: JSON.stringify({ compareField: 'replacementValue', operator: 'greater_than' }),
    message: 'Repair cost exceeds replacement value. Consider replacement instead of repair.',
    isActive: 1,
    projectId: null,
    createdBy: ownerId,
  },
  {
    name: 'Future Action Year Warning',
    description: 'Warn when action year is more than 50 years in the future',
    ruleType: 'numeric_range',
    severity: 'info',
    field: 'actionYear',
    condition: JSON.stringify({ max: new Date().getFullYear() + 50 }),
    message: 'Action year is more than 50 years in the future. Please verify this is intentional.',
    isActive: 1,
    projectId: null,
    createdBy: ownerId,
  },
  {
    name: 'Zero Expected Service Life Warning',
    description: 'Warn when expected service life (ESL) is zero or missing',
    ruleType: 'numeric_range',
    severity: 'warning',
    field: 'expectedUsefulLife',
    condition: JSON.stringify({ min: 1 }),
    message: 'Expected Service Life (ESL) should be greater than zero.',
    isActive: 1,
    projectId: null,
    createdBy: ownerId,
  },
];

for (const rule of rules) {
  // Check if rule already exists
  const [existing] = await connection.execute(
    'SELECT id FROM validation_rules WHERE name = ? LIMIT 1',
    [rule.name]
  );

  if (existing.length > 0) {
    console.log(`✓ Rule already exists: ${rule.name}`);
    continue;
  }

  await connection.execute(
    `INSERT INTO validation_rules 
    (name, description, ruleType, severity, field, \`condition\`, message, isActive, projectId, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule.name,
      rule.description,
      rule.ruleType,
      rule.severity,
      rule.field,
      rule.condition,
      rule.message,
      rule.isActive,
      rule.projectId,
      rule.createdBy,
    ]
  );

  console.log(`✓ Created rule: ${rule.name}`);
}

await connection.end();
console.log('✓ Validation rules seeded successfully');
