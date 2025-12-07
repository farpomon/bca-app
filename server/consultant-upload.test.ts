import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { generateAssessmentTemplate, generateDeficiencyTemplate, parseAssessmentSpreadsheet, parseDeficiencySpreadsheet } from "./spreadsheetTemplates";
import * as XLSX from "xlsx";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "user" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: role === "admin" ? 1 : 2,
    openId: role === "admin" ? "admin-user" : "consultant-user",
    email: role === "admin" ? "admin@city.gov" : "consultant@example.com",
    name: role === "admin" ? "City Admin" : "Test Consultant",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Consultant Upload System", () => {
  let projectId: number;
  let consultantCtx: TrpcContext;
  let adminCtx: TrpcContext;

  beforeEach(async () => {
    consultantCtx = createTestContext("user").ctx;
    adminCtx = createTestContext("admin").ctx;

    // Create test project
    projectId = await db.createProject({
      name: "Consultant Upload Test Project",
      description: "Test project for consultant uploads",
      location: "Test Location",
      yearBuilt: 2020,
      totalArea: 10000,
      userId: consultantCtx.user.id,
    });
  });

  describe("Template Generation", () => {
    it("should generate assessment template", () => {
      const buffer = generateAssessmentTemplate();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a valid Excel file
      const workbook = XLSX.read(buffer, { type: "buffer" });
      expect(workbook.SheetNames).toContain("Instructions");
      expect(workbook.SheetNames).toContain("Assessment Data");
    });

    it("should generate deficiency template", () => {
      const buffer = generateDeficiencyTemplate();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a valid Excel file
      const workbook = XLSX.read(buffer, { type: "buffer" });
      expect(workbook.SheetNames).toContain("Instructions");
      expect(workbook.SheetNames).toContain("Deficiency Data");
    });

    it("should download assessment template via API", async () => {
      const caller = appRouter.createCaller(consultantCtx);
      const result = await caller.consultant.downloadAssessmentTemplate();

      expect(result.data).toBeTruthy();
      expect(result.filename).toBe("Assessment_Upload_Template.xlsx");
      expect(result.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      // Verify base64 decodes to valid buffer
      const buffer = Buffer.from(result.data, "base64");
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should download deficiency template via API", async () => {
      const caller = appRouter.createCaller(consultantCtx);
      const result = await caller.consultant.downloadDeficiencyTemplate();

      expect(result.data).toBeTruthy();
      expect(result.filename).toBe("Deficiency_Upload_Template.xlsx");
    });
  });

  describe("Spreadsheet Parsing", () => {
    it("should parse valid assessment data", () => {
      // Create a test spreadsheet
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Component Name", "Condition*", "Status", "Observations"],
        ["B10.01", "Roof Membrane", "fair", "active", "Minor wear observed"],
        ["C20.10", "HVAC System", "good", "active", "Operating normally"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = parseAssessmentSpreadsheet(buffer);

      expect(result.data.length).toBe(2);
      expect(result.errors.length).toBe(0);
      expect(result.data[0].componentCode).toBe("B10.01");
      expect(result.data[0].condition).toBe("fair");
      expect(result.data[1].componentCode).toBe("C20.10");
      expect(result.data[1].condition).toBe("good");
    });

    it("should detect missing required fields in assessments", () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Component Name", "Condition*"],
        ["B10.01", "Roof Membrane", ""], // Missing condition
        ["", "HVAC System", "good"], // Missing component code
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = parseAssessmentSpreadsheet(buffer);

      expect(result.errors.length).toBe(2);
      expect(result.errors[0].field).toBe("Condition");
      expect(result.errors[1].field).toBe("Component Code");
    });

    it("should validate condition enum values", () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Condition*"],
        ["B10.01", "excellent"], // Invalid condition
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = parseAssessmentSpreadsheet(buffer);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toContain("Invalid condition");
    });

    it("should parse valid deficiency data", () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Title*", "Description*", "Priority*"],
        ["B10.01", "Roof Leak", "Water infiltration in northeast corner", "high"],
        ["C20.10", "HVAC Noise", "Excessive noise from air handler", "medium"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Deficiency Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = parseDeficiencySpreadsheet(buffer);

      expect(result.data.length).toBe(2);
      expect(result.errors.length).toBe(0);
      expect(result.data[0].title).toBe("Roof Leak");
      expect(result.data[0].priority).toBe("high");
    });

    it("should detect missing required fields in deficiencies", () => {
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Title*", "Description*", "Priority*"],
        ["B10.01", "", "Water leak", "high"], // Missing title
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Deficiency Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = parseDeficiencySpreadsheet(buffer);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0].field).toBe("Title");
    });
  });

  describe("Upload Workflow", () => {
    it("should upload and parse assessment spreadsheet", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      // Create test spreadsheet
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Condition*", "Observations"],
        ["B10.01", "fair", "Test observation"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = await caller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test_assessments.xlsx",
      });

      expect(result.submissionId).toBeTruthy();
      expect(result.trackingId).toBeTruthy();
      expect(result.validItems).toBe(1);
      expect(result.invalidItems).toBe(0);
    });

    it("should store submission in database", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Condition*"],
        ["B10.01", "fair"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const result = await caller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      // Verify submission was created
      const submission = await db.getConsultantSubmission(result.submissionId);
      expect(submission).toBeTruthy();
      expect(submission?.status).toBe("pending_review");
      expect(submission?.submittedBy).toBe(consultantCtx.user.id);
    });

    it("should retrieve consultant's own submissions", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      // Upload a submission
      const workbook = XLSX.utils.book_new();
      const data = [["Component Code*", "Condition*"], ["B10.01", "fair"]];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      await caller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      const submissions = await caller.consultant.mySubmissions();
      expect(submissions.length).toBeGreaterThan(0);
      expect(submissions[0].submittedBy).toBe(consultantCtx.user.id);
    });

    it("should get submission details", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      const workbook = XLSX.utils.book_new();
      const data = [["Component Code*", "Condition*"], ["B10.01", "fair"]];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const uploadResult = await caller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      const details = await caller.consultant.getSubmission({
        submissionId: uploadResult.submissionId,
      });

      expect(details.submission).toBeTruthy();
      expect(details.items.length).toBe(1);
      expect(details.items[0].validationStatus).toBe("valid");
    });
  });

  describe("Review Workflow", () => {
    it("should list pending submissions for admin", async () => {
      const consultantCaller = appRouter.createCaller(consultantCtx);
      const adminCaller = appRouter.createCaller(adminCtx);

      // Upload a submission
      const workbook = XLSX.utils.book_new();
      const data = [["Component Code*", "Condition*"], ["B10.01", "fair"]];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      await consultantCaller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      const pending = await adminCaller.consultant.pendingSubmissions();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].status).toBe("pending_review");
    });

    it("should reject non-admin access to pending submissions", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      await expect(caller.consultant.pendingSubmissions()).rejects.toThrow("Access denied");
    });

    it("should approve submission and finalize data", async () => {
      const consultantCaller = appRouter.createCaller(consultantCtx);
      const adminCaller = appRouter.createCaller(adminCtx);

      // Upload assessment
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Condition*", "Observations"],
        ["TEST-01", "fair", "Test observation"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const uploadResult = await consultantCaller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      // Approve submission
      await adminCaller.consultant.approveSubmission({
        submissionId: uploadResult.submissionId,
        reviewNotes: "Looks good",
      });

      // Verify submission status
      const submission = await db.getConsultantSubmission(uploadResult.submissionId);
      expect(submission?.status).toBe("finalized");

      // Verify assessment was created
      const assessments = await db.getAssessmentsByProject(projectId);
      const testAssessment = assessments.find((a) => a.componentCode === "TEST-01");
      expect(testAssessment).toBeTruthy();
      expect(testAssessment?.condition).toBe("fair");
    });

    it("should reject submission with notes", async () => {
      const consultantCaller = appRouter.createCaller(consultantCtx);
      const adminCaller = appRouter.createCaller(adminCtx);

      const workbook = XLSX.utils.book_new();
      const data = [["Component Code*", "Condition*"], ["B10.01", "fair"]];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const uploadResult = await consultantCaller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: buffer.toString("base64"),
        fileName: "test.xlsx",
      });

      await adminCaller.consultant.rejectSubmission({
        submissionId: uploadResult.submissionId,
        reviewNotes: "Please provide more detailed observations",
      });

      const submission = await db.getConsultantSubmission(uploadResult.submissionId);
      expect(submission?.status).toBe("rejected");
      expect(submission?.reviewNotes).toBe("Please provide more detailed observations");
    });

    it("should reject non-admin approval attempts", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      await expect(
        caller.consultant.approveSubmission({
          submissionId: 1,
          reviewNotes: "Trying to approve",
        })
      ).rejects.toThrow("Access denied");
    });

    it("should approve deficiency submission and create deficiency records", async () => {
      const consultantCaller = appRouter.createCaller(consultantCtx);
      const adminCaller = appRouter.createCaller(adminCtx);

      // Upload deficiency
      const workbook = XLSX.utils.book_new();
      const data = [
        ["Component Code*", "Title*", "Description*", "Priority*"],
        ["TEST-01", "Test Deficiency", "This is a test deficiency", "high"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Deficiency Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const uploadResult = await consultantCaller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "deficiencies",
        fileData: buffer.toString("base64"),
        fileName: "test_deficiencies.xlsx",
      });

      // Approve
      await adminCaller.consultant.approveSubmission({
        submissionId: uploadResult.submissionId,
      });

      // Verify deficiency was created
      const deficiencies = await db.getDeficienciesByProject(projectId);
      const testDeficiency = deficiencies.find((d) => d.componentCode === "TEST-01");
      expect(testDeficiency).toBeTruthy();
      expect(testDeficiency?.title).toBe("Test Deficiency");
      expect(testDeficiency?.priority).toBe("short_term"); // high maps to short_term
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid Excel files gracefully", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      const invalidBuffer = Buffer.from("not an excel file");

      // Invalid files should create submission with 0 items
      const result = await caller.consultant.uploadSpreadsheet({
        projectId,
        dataType: "assessments",
        fileData: invalidBuffer.toString("base64"),
        fileName: "invalid.xlsx",
      });

      expect(result.totalItems).toBe(0);
      expect(result.validItems).toBe(0);
    });

    it("should handle non-existent project", async () => {
      const caller = appRouter.createCaller(consultantCtx);

      const workbook = XLSX.utils.book_new();
      const data = [["Component Code*", "Condition*"], ["B10.01", "fair"]];
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Assessment Data");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      await expect(
        caller.consultant.uploadSpreadsheet({
          projectId: 99999,
          dataType: "assessments",
          fileData: buffer.toString("base64"),
          fileName: "test.xlsx",
        })
      ).rejects.toThrow("Project not found");
    });
  });
});
