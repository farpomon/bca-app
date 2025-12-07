import { drizzle } from "drizzle-orm/mysql2";
import { ratingScales } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const predefinedScales = [
  // 10-point FCI Scale (0-100%)
  {
    name: "10-Point FCI Scale",
    description: "Standard Facility Condition Index scale from 0-100%",
    type: "fci",
    isDefault: true,
    minValue: 0,
    maxValue: 100,
    scaleItems: JSON.stringify([
      { value: 0, label: "Excellent", description: "0-5%: New or recently renovated", color: "#22c55e" },
      { value: 10, label: "Good", description: "5-10%: Well maintained", color: "#84cc16" },
      { value: 20, label: "Adequate", description: "10-20%: Minor deficiencies", color: "#eab308" },
      { value: 30, label: "Fair", description: "20-30%: Moderate deficiencies", color: "#f97316" },
      { value: 40, label: "Poor", description: "30-40%: Significant deficiencies", color: "#ef4444" },
      { value: 50, label: "Very Poor", description: "40-50%: Major deficiencies", color: "#dc2626" },
      { value: 60, label: "Critical", description: "50-60%: Critical deficiencies", color: "#991b1b" },
      { value: 70, label: "Severe", description: "60-70%: Severe deterioration", color: "#7f1d1d" },
      { value: 80, label: "Failing", description: "70-80%: System failure imminent", color: "#450a0a" },
      { value: 90, label: "Failed", description: "80-100%: Complete failure", color: "#1c1917" },
    ]),
    createdBy: 1,
  },
  
  // Numerical Condition Index (1-10)
  {
    name: "Numerical CI (1-10)",
    description: "Condition Index scale from 1 (worst) to 10 (best)",
    type: "ci",
    isDefault: true,
    minValue: 1,
    maxValue: 10,
    scaleItems: JSON.stringify([
      { value: 10, label: "Excellent", description: "New or like-new condition", color: "#22c55e" },
      { value: 9, label: "Very Good", description: "Minor wear, fully functional", color: "#84cc16" },
      { value: 8, label: "Good", description: "Normal wear, good condition", color: "#a3e635" },
      { value: 7, label: "Satisfactory", description: "Some wear, minor repairs needed", color: "#eab308" },
      { value: 6, label: "Fair", description: "Moderate wear, repairs recommended", color: "#f59e0b" },
      { value: 5, label: "Marginal", description: "Significant wear, repairs needed soon", color: "#f97316" },
      { value: 4, label: "Poor", description: "Major deficiencies, immediate attention", color: "#ef4444" },
      { value: 3, label: "Very Poor", description: "Severe deficiencies, urgent repairs", color: "#dc2626" },
      { value: 2, label: "Critical", description: "System failure, replacement needed", color: "#991b1b" },
      { value: 1, label: "Failed", description: "Complete failure, non-functional", color: "#450a0a" },
    ]),
    createdBy: 1,
  },
  
  // Standard Condition Rating (Good/Fair/Poor)
  {
    name: "Standard Condition Rating",
    description: "Simple 4-level condition assessment",
    type: "condition",
    isDefault: true,
    minValue: 0,
    maxValue: 3,
    scaleItems: JSON.stringify([
      { value: 3, label: "Good", description: "Minimal deficiencies, normal maintenance", color: "#22c55e" },
      { value: 2, label: "Fair", description: "Moderate deficiencies, repairs recommended", color: "#eab308" },
      { value: 1, label: "Poor", description: "Significant deficiencies, immediate action", color: "#ef4444" },
      { value: 0, label: "Not Assessed", description: "No assessment completed", color: "#94a3b8" },
    ]),
    createdBy: 1,
  },
  
  // Deficiency Priority Rating
  {
    name: "Deficiency Priority Scale",
    description: "Priority levels for deficiency remediation",
    type: "priority",
    isDefault: true,
    minValue: 1,
    maxValue: 5,
    scaleItems: JSON.stringify([
      { value: 5, label: "Critical", description: "Immediate safety hazard, address now", color: "#dc2626" },
      { value: 4, label: "High", description: "Significant impact, address within 1 year", color: "#f97316" },
      { value: 3, label: "Medium", description: "Moderate impact, address within 1-3 years", color: "#eab308" },
      { value: 2, label: "Low", description: "Minor impact, address within 3-5 years", color: "#84cc16" },
      { value: 1, label: "Deferred", description: "Minimal impact, address as budget allows", color: "#94a3b8" },
    ]),
    createdBy: 1,
  },
];

async function seedRatingScales() {
  console.log("Seeding predefined rating scales...");
  
  try {
    for (const scale of predefinedScales) {
      await db.insert(ratingScales).values(scale);
      console.log(`✓ Created ${scale.name}`);
    }
    
    console.log("\n✅ Successfully seeded all rating scales!");
  } catch (error) {
    console.error("❌ Error seeding rating scales:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedRatingScales();
