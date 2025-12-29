/**
 * Seed Demo Projects Script
 * Creates 3 demo projects with 20, 30, and 40 assets respectively
 * Each project has comprehensive UNIFORMAT II assessments and deficiencies
 */

import { drizzle } from "drizzle-orm/mysql2";
import { projects, assets, assessments, deficiencies } from "../../drizzle/schema";

// UNIFORMAT II Component Codes
const UNIFORMAT_COMPONENTS = [
  { code: "A10", name: "Foundations", category: "A" },
  { code: "A20", name: "Basement Construction", category: "A" },
  { code: "B10", name: "Superstructure", category: "B" },
  { code: "B20", name: "Exterior Enclosure", category: "B" },
  { code: "B30", name: "Roofing", category: "B" },
  { code: "C10", name: "Interior Construction", category: "C" },
  { code: "C20", name: "Stairs", category: "C" },
  { code: "C30", name: "Interior Finishes", category: "C" },
  { code: "D10", name: "Conveying Systems", category: "D" },
  { code: "D20", name: "Plumbing", category: "D" },
  { code: "D30", name: "HVAC", category: "D" },
  { code: "D40", name: "Fire Protection", category: "D" },
  { code: "D50", name: "Electrical", category: "D" },
  { code: "E10", name: "Equipment", category: "E" },
  { code: "E20", name: "Furnishings", category: "E" },
  { code: "F10", name: "Special Construction", category: "F" },
  { code: "F20", name: "Selective Building Demolition", category: "F" },
  { code: "G10", name: "Site Preparation", category: "G" },
  { code: "G20", name: "Site Improvements", category: "G" },
  { code: "G30", name: "Site Civil/Mechanical Utilities", category: "G" },
  { code: "G40", name: "Site Electrical Utilities", category: "G" },
];

const CONDITIONS = ["good", "fair", "poor", "not_assessed"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const PRIORITIES = ["immediate", "short_term", "medium_term", "long_term"] as const;

// Demo Project Configurations
const DEMO_PROJECTS = [
  {
    name: "Downtown Commercial Office Complex",
    description: "A 20-asset commercial office development in downtown Vancouver featuring modern office towers, retail spaces, and underground parking facilities.",
    clientName: "Pacific Commercial Properties Ltd.",
    propertyType: "Commercial Office",
    constructionType: "Steel Frame",
    yearBuilt: 2008,
    numberOfStories: 25,
    city: "Vancouver",
    province: "British Columbia",
    streetAddress: "888 West Georgia Street",
    postalCode: "V6C 3E1",
    assetCount: 20,
    assets: [
      { name: "Tower A - Main Office Building", type: "Office Tower", stories: 25, area: 45000, yearBuilt: 2008 },
      { name: "Tower B - Secondary Office Building", type: "Office Tower", stories: 20, area: 38000, yearBuilt: 2008 },
      { name: "Retail Podium - Ground Level", type: "Retail", stories: 2, area: 8500, yearBuilt: 2008 },
      { name: "Underground Parking P1", type: "Parking Structure", stories: 1, area: 25000, yearBuilt: 2008 },
      { name: "Underground Parking P2", type: "Parking Structure", stories: 1, area: 25000, yearBuilt: 2008 },
      { name: "Underground Parking P3", type: "Parking Structure", stories: 1, area: 25000, yearBuilt: 2008 },
      { name: "Central Plant Building", type: "Mechanical", stories: 2, area: 3500, yearBuilt: 2008 },
      { name: "Loading Dock Facility", type: "Service", stories: 1, area: 2000, yearBuilt: 2008 },
      { name: "Lobby & Atrium", type: "Common Area", stories: 3, area: 4500, yearBuilt: 2008 },
      { name: "Fitness Center", type: "Amenity", stories: 1, area: 3000, yearBuilt: 2010 },
      { name: "Conference Center", type: "Amenity", stories: 1, area: 2500, yearBuilt: 2010 },
      { name: "Rooftop Garden & Terrace", type: "Outdoor", stories: 1, area: 5000, yearBuilt: 2012 },
      { name: "Security Command Center", type: "Service", stories: 1, area: 500, yearBuilt: 2008 },
      { name: "Electrical Substation", type: "Utility", stories: 1, area: 800, yearBuilt: 2008 },
      { name: "Emergency Generator Building", type: "Utility", stories: 1, area: 600, yearBuilt: 2008 },
      { name: "Water Treatment Room", type: "Utility", stories: 1, area: 400, yearBuilt: 2008 },
      { name: "Telecommunications Hub", type: "Utility", stories: 1, area: 350, yearBuilt: 2015 },
      { name: "Bicycle Storage Facility", type: "Amenity", stories: 1, area: 1200, yearBuilt: 2018 },
      { name: "Waste Management Center", type: "Service", stories: 1, area: 800, yearBuilt: 2008 },
      { name: "Outdoor Plaza & Landscaping", type: "Outdoor", stories: 1, area: 6000, yearBuilt: 2008 },
    ],
  },
  {
    name: "Regional Healthcare Campus",
    description: "A comprehensive 30-asset healthcare facility including a main hospital, medical office buildings, research center, and support facilities serving the Greater Toronto Area.",
    clientName: "Ontario Health Services Corp.",
    propertyType: "Healthcare",
    constructionType: "Concrete Frame",
    yearBuilt: 1995,
    numberOfStories: 12,
    city: "Toronto",
    province: "Ontario",
    streetAddress: "2075 Bayview Avenue",
    postalCode: "M4N 3M5",
    assetCount: 30,
    assets: [
      { name: "Main Hospital Building - Tower A", type: "Hospital", stories: 12, area: 85000, yearBuilt: 1995 },
      { name: "Main Hospital Building - Tower B", type: "Hospital", stories: 10, area: 72000, yearBuilt: 1995 },
      { name: "Emergency Department Wing", type: "Hospital", stories: 2, area: 15000, yearBuilt: 2005 },
      { name: "Surgical Center", type: "Hospital", stories: 4, area: 28000, yearBuilt: 2000 },
      { name: "Diagnostic Imaging Center", type: "Medical", stories: 3, area: 18000, yearBuilt: 2010 },
      { name: "Cancer Treatment Center", type: "Medical", stories: 4, area: 22000, yearBuilt: 2015 },
      { name: "Cardiac Care Unit", type: "Medical", stories: 3, area: 16000, yearBuilt: 2008 },
      { name: "Pediatric Wing", type: "Hospital", stories: 4, area: 20000, yearBuilt: 2002 },
      { name: "Psychiatric Services Building", type: "Medical", stories: 3, area: 12000, yearBuilt: 1998 },
      { name: "Medical Office Building A", type: "Office", stories: 6, area: 25000, yearBuilt: 2000 },
      { name: "Medical Office Building B", type: "Office", stories: 5, area: 20000, yearBuilt: 2005 },
      { name: "Research Laboratory Building", type: "Research", stories: 5, area: 30000, yearBuilt: 2012 },
      { name: "Education & Training Center", type: "Education", stories: 4, area: 18000, yearBuilt: 2008 },
      { name: "Central Energy Plant", type: "Utility", stories: 2, area: 8000, yearBuilt: 1995 },
      { name: "Parking Structure A", type: "Parking", stories: 6, area: 45000, yearBuilt: 1995 },
      { name: "Parking Structure B", type: "Parking", stories: 5, area: 38000, yearBuilt: 2005 },
      { name: "Surface Parking Lot", type: "Parking", stories: 1, area: 20000, yearBuilt: 1995 },
      { name: "Helipad & Emergency Access", type: "Service", stories: 1, area: 2000, yearBuilt: 2000 },
      { name: "Central Kitchen & Cafeteria", type: "Service", stories: 2, area: 8000, yearBuilt: 1995 },
      { name: "Laundry & Linen Services", type: "Service", stories: 2, area: 6000, yearBuilt: 1995 },
      { name: "Materials Management Warehouse", type: "Storage", stories: 2, area: 12000, yearBuilt: 2000 },
      { name: "Pharmacy Services Building", type: "Medical", stories: 2, area: 5000, yearBuilt: 2010 },
      { name: "Biomedical Engineering Shop", type: "Service", stories: 1, area: 3000, yearBuilt: 1998 },
      { name: "Security & Communications Center", type: "Service", stories: 1, area: 1500, yearBuilt: 2015 },
      { name: "Staff Wellness Center", type: "Amenity", stories: 2, area: 4000, yearBuilt: 2018 },
      { name: "Chapel & Meditation Space", type: "Amenity", stories: 1, area: 1200, yearBuilt: 1995 },
      { name: "Childcare Center", type: "Amenity", stories: 1, area: 3500, yearBuilt: 2008 },
      { name: "Medical Gas Storage Facility", type: "Utility", stories: 1, area: 800, yearBuilt: 2005 },
      { name: "Hazardous Waste Management", type: "Service", stories: 1, area: 1500, yearBuilt: 2000 },
      { name: "Campus Grounds & Landscaping", type: "Outdoor", stories: 1, area: 50000, yearBuilt: 1995 },
    ],
  },
  {
    name: "University Campus Facilities Portfolio",
    description: "A 40-asset educational campus portfolio including academic buildings, student residences, athletic facilities, and support infrastructure for a major Canadian university.",
    clientName: "University of Calgary",
    propertyType: "Educational",
    constructionType: "Mixed",
    yearBuilt: 1966,
    numberOfStories: 8,
    city: "Calgary",
    province: "Alberta",
    streetAddress: "2500 University Drive NW",
    postalCode: "T2N 1N4",
    assetCount: 40,
    assets: [
      { name: "Science Complex - Main Building", type: "Academic", stories: 8, area: 65000, yearBuilt: 1966 },
      { name: "Science Complex - Laboratory Wing", type: "Academic", stories: 5, area: 35000, yearBuilt: 1975 },
      { name: "Engineering Building A", type: "Academic", stories: 6, area: 45000, yearBuilt: 1970 },
      { name: "Engineering Building B", type: "Academic", stories: 5, area: 38000, yearBuilt: 1985 },
      { name: "Arts & Humanities Building", type: "Academic", stories: 4, area: 32000, yearBuilt: 1968 },
      { name: "Business School", type: "Academic", stories: 5, area: 40000, yearBuilt: 2000 },
      { name: "Law School Building", type: "Academic", stories: 4, area: 28000, yearBuilt: 1995 },
      { name: "Medical Sciences Building", type: "Academic", stories: 7, area: 55000, yearBuilt: 1980 },
      { name: "Nursing Faculty Building", type: "Academic", stories: 4, area: 22000, yearBuilt: 1990 },
      { name: "Education Building", type: "Academic", stories: 4, area: 25000, yearBuilt: 1972 },
      { name: "Library - Main Building", type: "Library", stories: 6, area: 48000, yearBuilt: 1966 },
      { name: "Library - Archives Wing", type: "Library", stories: 3, area: 15000, yearBuilt: 1988 },
      { name: "Student Union Building", type: "Student Services", stories: 4, area: 35000, yearBuilt: 1978 },
      { name: "Administration Building", type: "Office", stories: 5, area: 28000, yearBuilt: 1966 },
      { name: "Residence Hall A - Freshman", type: "Residential", stories: 8, area: 32000, yearBuilt: 1968 },
      { name: "Residence Hall B - Upperclassmen", type: "Residential", stories: 10, area: 40000, yearBuilt: 1975 },
      { name: "Residence Hall C - Graduate", type: "Residential", stories: 6, area: 25000, yearBuilt: 1990 },
      { name: "Family Housing Complex", type: "Residential", stories: 4, area: 35000, yearBuilt: 1985 },
      { name: "Athletic Center - Main Gym", type: "Athletic", stories: 3, area: 45000, yearBuilt: 1972 },
      { name: "Olympic Pool Complex", type: "Athletic", stories: 2, area: 18000, yearBuilt: 1988 },
      { name: "Ice Arena", type: "Athletic", stories: 2, area: 25000, yearBuilt: 1980 },
      { name: "Football Stadium", type: "Athletic", stories: 3, area: 55000, yearBuilt: 1966 },
      { name: "Tennis & Recreation Center", type: "Athletic", stories: 1, area: 12000, yearBuilt: 2005 },
      { name: "Performing Arts Center", type: "Cultural", stories: 4, area: 30000, yearBuilt: 1998 },
      { name: "Art Gallery & Museum", type: "Cultural", stories: 2, area: 8000, yearBuilt: 2010 },
      { name: "Central Dining Hall", type: "Food Service", stories: 2, area: 15000, yearBuilt: 1968 },
      { name: "Food Court Building", type: "Food Service", stories: 1, area: 8000, yearBuilt: 2000 },
      { name: "Campus Health Center", type: "Medical", stories: 2, area: 6000, yearBuilt: 1985 },
      { name: "Campus Security Building", type: "Service", stories: 1, area: 2000, yearBuilt: 1990 },
      { name: "Central Heating Plant", type: "Utility", stories: 2, area: 8000, yearBuilt: 1966 },
      { name: "Central Cooling Plant", type: "Utility", stories: 2, area: 6000, yearBuilt: 1985 },
      { name: "Electrical Distribution Center", type: "Utility", stories: 1, area: 3000, yearBuilt: 1975 },
      { name: "Maintenance & Operations Building", type: "Service", stories: 2, area: 10000, yearBuilt: 1970 },
      { name: "Parking Structure A", type: "Parking", stories: 5, area: 40000, yearBuilt: 1980 },
      { name: "Parking Structure B", type: "Parking", stories: 4, area: 32000, yearBuilt: 1995 },
      { name: "Parking Structure C", type: "Parking", stories: 6, area: 48000, yearBuilt: 2008 },
      { name: "Research Park Building A", type: "Research", stories: 4, area: 22000, yearBuilt: 2005 },
      { name: "Research Park Building B", type: "Research", stories: 3, area: 18000, yearBuilt: 2010 },
      { name: "Innovation Hub", type: "Research", stories: 4, area: 20000, yearBuilt: 2018 },
      { name: "Campus Grounds & Infrastructure", type: "Outdoor", stories: 1, area: 200000, yearBuilt: 1966 },
    ],
  },
];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCondition(): typeof CONDITIONS[number] {
  // Weighted distribution: 30% good, 35% fair, 25% poor, 10% not_assessed
  const rand = Math.random();
  if (rand < 0.30) return "good";
  if (rand < 0.65) return "fair";
  if (rand < 0.90) return "poor";
  return "not_assessed";
}

function generateSeverity(): typeof SEVERITIES[number] {
  const rand = Math.random();
  if (rand < 0.25) return "low";
  if (rand < 0.55) return "medium";
  if (rand < 0.80) return "high";
  return "critical";
}

function generatePriority(): typeof PRIORITIES[number] {
  const rand = Math.random();
  if (rand < 0.15) return "immediate";
  if (rand < 0.40) return "short_term";
  if (rand < 0.75) return "medium_term";
  return "long_term";
}

function generateObservations(condition: string, componentName: string): string {
  const observations: Record<string, string[]> = {
    good: [
      `${componentName} is in good overall condition with no significant deficiencies observed.`,
      `Visual inspection indicates ${componentName.toLowerCase()} is functioning as designed with minor wear consistent with age.`,
      `${componentName} shows normal wear patterns. Regular maintenance appears to be performed.`,
      `No immediate concerns noted. ${componentName} meets current code requirements.`,
    ],
    fair: [
      `${componentName} shows moderate wear and aging. Some maintenance items identified.`,
      `${componentName} is functional but showing signs of deterioration that will require attention within 3-5 years.`,
      `Several minor deficiencies noted in ${componentName.toLowerCase()}. Recommend scheduled maintenance.`,
      `${componentName} is approaching mid-life. Capital planning should include replacement within 10 years.`,
    ],
    poor: [
      `${componentName} exhibits significant deterioration requiring near-term attention.`,
      `Multiple deficiencies observed in ${componentName.toLowerCase()}. Recommend priority repairs.`,
      `${componentName} is past expected service life. Replacement should be budgeted within 1-3 years.`,
      `Substantial degradation noted. ${componentName} poses potential operational concerns.`,
    ],
    not_assessed: [
      `${componentName} was not accessible for assessment during this inspection.`,
      `Unable to fully assess ${componentName.toLowerCase()} due to access limitations.`,
      `${componentName} requires specialized inspection equipment not available during survey.`,
    ],
  };
  return randomElement(observations[condition] || observations.not_assessed);
}

function generateDeficiencyTitle(componentName: string): string {
  const titles = [
    `${componentName} - Deterioration Observed`,
    `${componentName} - Maintenance Required`,
    `${componentName} - Code Compliance Issue`,
    `${componentName} - End of Service Life`,
    `${componentName} - Water Damage`,
    `${componentName} - Structural Concern`,
    `${componentName} - Safety Hazard`,
    `${componentName} - Performance Degradation`,
  ];
  return randomElement(titles);
}

function generateDeficiencyDescription(componentName: string, severity: string): string {
  const descriptions: Record<string, string[]> = {
    low: [
      `Minor cosmetic issues observed in ${componentName.toLowerCase()}. No immediate action required.`,
      `${componentName} shows minor wear that should be addressed during routine maintenance.`,
      `Small areas of ${componentName.toLowerCase()} require touch-up or minor repair.`,
    ],
    medium: [
      `${componentName} requires repair to prevent further deterioration and maintain functionality.`,
      `Moderate damage to ${componentName.toLowerCase()} affecting performance. Recommend repair within 12 months.`,
      `${componentName} showing signs of failure. Should be addressed in next maintenance cycle.`,
    ],
    high: [
      `Significant deficiency in ${componentName.toLowerCase()} requiring priority attention.`,
      `${componentName} has failed in multiple areas. Immediate planning for replacement recommended.`,
      `Major deterioration of ${componentName.toLowerCase()} affecting building operations.`,
    ],
    critical: [
      `Critical failure of ${componentName.toLowerCase()} requiring immediate action.`,
      `${componentName} poses safety risk and must be addressed immediately.`,
      `Emergency repair required for ${componentName.toLowerCase()}. Building operations may be affected.`,
    ],
  };
  return randomElement(descriptions[severity] || descriptions.medium);
}

function generateUniqueId(prefix: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${random}`;
}

async function seedDemoProjects() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const userId = 1; // Assuming admin user ID is 1

  console.log("Starting demo project seeding...\n");

  for (const projectConfig of DEMO_PROJECTS) {
    console.log(`\n=== Creating Project: ${projectConfig.name} ===`);
    console.log(`Target assets: ${projectConfig.assetCount}`);

    // Create the project
    const projectResult = await db.insert(projects).values({
      uniqueId: generateUniqueId("PROJ"),
      userId,
      name: projectConfig.name,
      address: `${projectConfig.streetAddress}, ${projectConfig.city}, ${projectConfig.province} ${projectConfig.postalCode}`,
      clientName: projectConfig.clientName,
      propertyType: projectConfig.propertyType,
      constructionType: projectConfig.constructionType,
      yearBuilt: projectConfig.yearBuilt,
      numberOfStories: projectConfig.numberOfStories,
      status: "in_progress",
      company: "Maben Consulting",
      streetAddress: projectConfig.streetAddress,
      city: projectConfig.city,
      province: projectConfig.province,
      postalCode: projectConfig.postalCode,
    });

    const projectId = projectResult[0].insertId;
    console.log(`Created project ID: ${projectId}`);

    let totalAssessments = 0;
    let totalDeficiencies = 0;

    // Create assets for this project
    for (let i = 0; i < projectConfig.assets.length; i++) {
      const assetConfig = projectConfig.assets[i];
      
      // Create the asset
      const assetResult = await db.insert(assets).values({
        uniqueId: generateUniqueId("ASSET"),
        projectId,
        name: assetConfig.name,
        description: `${assetConfig.type} facility - ${assetConfig.stories} stories, ${assetConfig.area.toLocaleString()} sq ft`,
        assetType: assetConfig.type,
        yearBuilt: assetConfig.yearBuilt,
        grossFloorArea: assetConfig.area,
        numberOfStories: assetConfig.stories,
        constructionType: projectConfig.constructionType,
        currentReplacementValue: (assetConfig.area * randomInt(250, 450)).toString(),
        status: "active",
        streetAddress: projectConfig.streetAddress,
        city: projectConfig.city,
        province: projectConfig.province,
        postalCode: projectConfig.postalCode,
      });

      const assetId = assetResult[0].insertId;

      // Generate assessments for this asset (5-12 components per asset)
      const numAssessments = randomInt(5, 12);
      const usedComponents = new Set<string>();

      for (let j = 0; j < numAssessments; j++) {
        // Pick a random component that hasn't been used for this asset
        let component;
        do {
          component = randomElement(UNIFORMAT_COMPONENTS);
        } while (usedComponents.has(component.code) && usedComponents.size < UNIFORMAT_COMPONENTS.length);
        
        if (usedComponents.has(component.code)) continue;
        usedComponents.add(component.code);

        const condition = generateCondition();
        const age = new Date().getFullYear() - assetConfig.yearBuilt;
        const expectedLife = randomInt(20, 50);
        const remainingLife = Math.max(0, expectedLife - age + randomInt(-5, 10));

        // Calculate repair and replacement costs based on area and condition
        const baseRepairCost = assetConfig.area * randomInt(5, 25);
        const conditionMultiplier = condition === "poor" ? 1.5 : condition === "fair" ? 1.0 : 0.5;
        const estimatedRepairCost = Math.round(baseRepairCost * conditionMultiplier);
        const replacementValue = Math.round(assetConfig.area * randomInt(50, 150));

        await db.insert(assessments).values({
          projectId,
          assetId,
          componentCode: component.code,
          componentName: component.name,
          componentLocation: assetConfig.name,
          condition,
          observations: generateObservations(condition, component.name),
          remainingUsefulLife: remainingLife,
          expectedUsefulLife: expectedLife,
          estimatedServiceLife: expectedLife,
          estimatedRepairCost,
          replacementValue,
          conditionScore: condition === "good" ? randomInt(80, 100) : condition === "fair" ? randomInt(50, 79) : condition === "poor" ? randomInt(20, 49) : 0,
          status: "completed",
          assessedAt: new Date().toISOString(),
        });

        totalAssessments++;

        // Generate deficiencies for poor/fair conditions (50% chance for fair, 80% for poor)
        const shouldCreateDeficiency = 
          (condition === "poor" && Math.random() < 0.8) ||
          (condition === "fair" && Math.random() < 0.5);

        if (shouldCreateDeficiency) {
          const severity = generateSeverity();
          const priority = generatePriority();
          const estimatedCost = Math.round(estimatedRepairCost * (severity === "critical" ? 1.5 : severity === "high" ? 1.2 : severity === "medium" ? 1.0 : 0.7));

          await db.insert(deficiencies).values({
            projectId,
            componentCode: component.code,
            title: generateDeficiencyTitle(component.name),
            description: generateDeficiencyDescription(component.name, severity),
            location: assetConfig.name,
            severity,
            priority,
            recommendedAction: `Schedule ${priority.replace("_", " ")} repair/replacement of ${component.name.toLowerCase()}.`,
            estimatedCost,
            status: "open",
          });

          totalDeficiencies++;
        }
      }

      console.log(`  Created asset ${i + 1}/${projectConfig.assets.length}: ${assetConfig.name}`);
    }

    console.log(`\nProject "${projectConfig.name}" completed:`);
    console.log(`  - Assets: ${projectConfig.assets.length}`);
    console.log(`  - Assessments: ${totalAssessments}`);
    console.log(`  - Deficiencies: ${totalDeficiencies}`);
  }

  console.log("\n=== Demo Project Seeding Complete ===");
  console.log("Created 3 projects with 20, 30, and 40 assets respectively.");
  process.exit(0);
}

// Run the seed function
seedDemoProjects().catch((error) => {
  console.error("Error seeding demo projects:", error);
  process.exit(1);
});
