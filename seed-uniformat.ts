import { drizzle } from "drizzle-orm/mysql2";
import { buildingComponents } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const uniformatData = [
  // Level 1: Major Group Elements
  { code: "A", level: 1, parentCode: null, name: "SUBSTRUCTURE", description: "Foundation and basement construction" },
  { code: "B", level: 1, parentCode: null, name: "SHELL", description: "Superstructure, exterior enclosure, and roofing" },
  { code: "C", level: 1, parentCode: null, name: "INTERIORS", description: "Interior construction and finishes" },
  { code: "D", level: 1, parentCode: null, name: "SERVICES", description: "Conveying, plumbing, HVAC, fire protection, electrical" },
  { code: "E", level: 1, parentCode: null, name: "EQUIPMENT & FURNISHINGS", description: "Equipment and furnishings" },
  { code: "F", level: 1, parentCode: null, name: "SPECIAL CONSTRUCTION & DEMOLITION", description: "Special construction and demolition" },
  { code: "G", level: 1, parentCode: null, name: "SITE IMPROVEMENTS", description: "Site work and improvements" },
  
  // Level 2: Group Elements - A SUBSTRUCTURE
  { code: "A10", level: 2, parentCode: "A", name: "Foundations", description: "Standard and special foundations" },
  { code: "A20", level: 2, parentCode: "A", name: "Basement Construction", description: "Basement excavation and walls" },
  
  // Level 2: Group Elements - B SHELL
  { code: "B10", level: 2, parentCode: "B", name: "Superstructure", description: "Floor and roof construction" },
  { code: "B20", level: 2, parentCode: "B", name: "Exterior Enclosure", description: "Exterior walls, windows, and doors" },
  { code: "B30", level: 2, parentCode: "B", name: "Roofing", description: "Roof coverings and openings" },
  
  // Level 2: Group Elements - C INTERIORS
  { code: "C10", level: 2, parentCode: "C", name: "Interior Construction", description: "Partitions, doors, and fittings" },
  { code: "C20", level: 2, parentCode: "C", name: "Stairs", description: "Stair construction and finishes" },
  { code: "C30", level: 2, parentCode: "C", name: "Interior Finishes", description: "Wall, floor, and ceiling finishes" },
  
  // Level 2: Group Elements - D SERVICES
  { code: "D10", level: 2, parentCode: "D", name: "Conveying", description: "Elevators, escalators, and moving walks" },
  { code: "D20", level: 2, parentCode: "D", name: "Plumbing", description: "Plumbing fixtures and systems" },
  { code: "D30", level: 2, parentCode: "D", name: "HVAC", description: "Heating, ventilation, and air conditioning" },
  { code: "D40", level: 2, parentCode: "D", name: "Fire Protection", description: "Sprinklers and fire protection systems" },
  { code: "D50", level: 2, parentCode: "D", name: "Electrical", description: "Electrical service and distribution" },
  
  // Level 2: Group Elements - E EQUIPMENT & FURNISHINGS
  { code: "E10", level: 2, parentCode: "E", name: "Equipment", description: "Commercial and institutional equipment" },
  { code: "E20", level: 2, parentCode: "E", name: "Furnishings", description: "Fixed and movable furnishings" },
  
  // Level 2: Group Elements - F SPECIAL CONSTRUCTION
  { code: "F10", level: 2, parentCode: "F", name: "Special Construction", description: "Special structures and systems" },
  { code: "F20", level: 2, parentCode: "F", name: "Selective Building Demolition", description: "Building elements demolition" },
  
  // Level 2: Group Elements - G SITE IMPROVEMENTS
  { code: "G10", level: 2, parentCode: "G", name: "Site Preparation", description: "Site clearing and earthwork" },
  { code: "G20", level: 2, parentCode: "G", name: "Site Improvements", description: "Walkways, accessibility, and landscaping" },
  
  // Level 3: Individual Elements - A SUBSTRUCTURE
  { code: "A1010", level: 3, parentCode: "A10", name: "Standard Foundations", description: "Wall and column foundations" },
  { code: "A1020", level: 3, parentCode: "A10", name: "Special Foundations", description: "Piles, caissons, and special foundations" },
  { code: "A1030", level: 3, parentCode: "A10", name: "Slab on Grade", description: "Ground-supported slabs" },
  { code: "A2010", level: 3, parentCode: "A20", name: "Basement Excavation", description: "Excavation and backfill" },
  { code: "A2020", level: 3, parentCode: "A20", name: "Basement Walls", description: "Foundation and retaining walls" },
  
  // Level 3: Individual Elements - B SHELL
  { code: "B1010", level: 3, parentCode: "B10", name: "Floor Construction", description: "Structural floor systems" },
  { code: "B1020", level: 3, parentCode: "B10", name: "Roof Construction", description: "Structural roof systems" },
  { code: "B2010", level: 3, parentCode: "B20", name: "Exterior Walls", description: "Exterior wall systems" },
  { code: "B2020", level: 3, parentCode: "B20", name: "Exterior Windows", description: "Window systems" },
  { code: "B2030", level: 3, parentCode: "B20", name: "Exterior Doors", description: "Door systems" },
  { code: "B3010", level: 3, parentCode: "B30", name: "Roof Coverings", description: "Roof membrane and coverings" },
  { code: "B3020", level: 3, parentCode: "B30", name: "Roof Openings", description: "Skylights and roof hatches" },
  
  // Level 3: Individual Elements - C INTERIORS
  { code: "C1010", level: 3, parentCode: "C10", name: "Partitions", description: "Interior partition walls" },
  { code: "C1020", level: 3, parentCode: "C10", name: "Interior Doors", description: "Interior door systems" },
  { code: "C1030", level: 3, parentCode: "C10", name: "Fittings", description: "Interior fittings and accessories" },
  { code: "C2010", level: 3, parentCode: "C20", name: "Stair Construction", description: "Stair structure" },
  { code: "C2020", level: 3, parentCode: "C20", name: "Stair Finishes", description: "Stair treads and finishes" },
  { code: "C3010", level: 3, parentCode: "C30", name: "Wall Finishes", description: "Interior wall finishes" },
  { code: "C3020", level: 3, parentCode: "C30", name: "Floor Finishes", description: "Interior floor finishes" },
  { code: "C3030", level: 3, parentCode: "C30", name: "Ceiling Finishes", description: "Interior ceiling finishes" },
  
  // Level 3: Individual Elements - D SERVICES
  { code: "D1010", level: 3, parentCode: "D10", name: "Elevators & Lifts", description: "Elevator systems" },
  { code: "D1020", level: 3, parentCode: "D10", name: "Escalators & Moving Walks", description: "Escalator systems" },
  { code: "D2010", level: 3, parentCode: "D20", name: "Plumbing Fixtures", description: "Plumbing fixtures" },
  { code: "D2020", level: 3, parentCode: "D20", name: "Domestic Water Distribution", description: "Water supply systems" },
  { code: "D2030", level: 3, parentCode: "D20", name: "Sanitary Waste", description: "Sanitary drainage systems" },
  { code: "D2040", level: 3, parentCode: "D20", name: "Rain Water Drainage", description: "Storm drainage systems" },
  { code: "D3010", level: 3, parentCode: "D30", name: "Energy Supply", description: "Energy supply systems" },
  { code: "D3020", level: 3, parentCode: "D30", name: "Heat Generating Systems", description: "Boilers and heating systems" },
  { code: "D3030", level: 3, parentCode: "D30", name: "Cooling Generating Systems", description: "Chillers and cooling systems" },
  { code: "D3040", level: 3, parentCode: "D30", name: "Distribution Systems", description: "HVAC distribution" },
  { code: "D3050", level: 3, parentCode: "D30", name: "Terminal & Package Units", description: "HVAC terminal units" },
  { code: "D4010", level: 3, parentCode: "D40", name: "Sprinklers", description: "Sprinkler systems" },
  { code: "D4020", level: 3, parentCode: "D40", name: "Standpipes", description: "Standpipe systems" },
  { code: "D5010", level: 3, parentCode: "D50", name: "Electrical Service & Distribution", description: "Electrical service" },
  { code: "D5020", level: 3, parentCode: "D50", name: "Lighting and Branch Wiring", description: "Lighting systems" },
  { code: "D5030", level: 3, parentCode: "D50", name: "Communications & Security", description: "Communications systems" },
  
  // Level 3: Individual Elements - G SITE IMPROVEMENTS
  { code: "G2010", level: 3, parentCode: "G20", name: "Walkways", description: "Pedestrian walkways" },
  { code: "G2020", level: 3, parentCode: "G20", name: "Accessibility Ramps", description: "Accessibility ramps" },
  { code: "G2030", level: 3, parentCode: "G20", name: "Landscaping", description: "Soft landscaping" },
];

async function seed() {
  console.log("Seeding UNIFORMAT II building components...");
  
  for (const component of uniformatData) {
    await db.insert(buildingComponents).values(component).onDuplicateKeyUpdate({
      set: { name: component.name, description: component.description }
    });
  }
  
  console.log(`Seeded ${uniformatData.length} building components`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
