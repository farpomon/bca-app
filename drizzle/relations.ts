import { relations } from "drizzle-orm/relations";
import { buildingSections, assessments, projects, floorPlans, photos } from "./schema";

export const assessmentsRelations = relations(assessments, ({one}) => ({
	buildingSection: one(buildingSections, {
		fields: [assessments.sectionId],
		references: [buildingSections.id]
	}),
}));

export const buildingSectionsRelations = relations(buildingSections, ({one, many}) => ({
	assessments: many(assessments),
	project: one(projects, {
		fields: [buildingSections.projectId],
		references: [projects.id]
	}),
	floorPlans: many(floorPlans),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	buildingSections: many(buildingSections),
	floorPlans: many(floorPlans),
}));

export const floorPlansRelations = relations(floorPlans, ({one, many}) => ({
	project: one(projects, {
		fields: [floorPlans.projectId],
		references: [projects.id]
	}),
	buildingSection: one(buildingSections, {
		fields: [floorPlans.sectionId],
		references: [buildingSections.id]
	}),
	photos: many(photos),
}));

export const photosRelations = relations(photos, ({one}) => ({
	floorPlan: one(floorPlans, {
		fields: [photos.floorPlanId],
		references: [floorPlans.id]
	}),
}));