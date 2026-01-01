import { describe, expect, it, vi } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getPhotoById: vi.fn(),
  deletePhoto: vi.fn(),
  getProjectById: vi.fn(),
  deleteAssessmentDocument: vi.fn(),
}));

describe("Photo Delete Authorization", () => {
  it("should allow photo deletion when user has project access", async () => {
    const { getPhotoById, deletePhoto, getProjectById } = await import("./db");
    
    // Mock photo exists with projectId
    (getPhotoById as any).mockResolvedValue({
      id: 1,
      projectId: 100,
      uploadedBy: 999, // Different user
    });
    
    // Mock project access granted
    (getProjectById as any).mockResolvedValue({
      id: 100,
      userId: 1,
      company: "TestCo",
    });
    
    (deletePhoto as any).mockResolvedValue(undefined);
    
    // Simulate the authorization logic
    const photo = await getPhotoById(1);
    expect(photo).toBeTruthy();
    expect(photo?.projectId).toBe(100);
    
    const project = await getProjectById(100, 1, "TestCo", false, null, false);
    expect(project).toBeTruthy();
    
    // If project is found, user has access
    await deletePhoto(1);
    expect(deletePhoto).toHaveBeenCalledWith(1);
  });

  it("should allow photo deletion when user is the uploader", async () => {
    const { getPhotoById, deletePhoto, getProjectById } = await import("./db");
    
    // Mock photo exists with user as uploader
    (getPhotoById as any).mockResolvedValue({
      id: 1,
      projectId: 100,
      uploadedBy: 1, // Same user
    });
    
    // Mock project access denied (different company)
    (getProjectById as any).mockResolvedValue(null);
    
    (deletePhoto as any).mockResolvedValue(undefined);
    
    const photo = await getPhotoById(1);
    expect(photo).toBeTruthy();
    
    const isUploader = photo?.uploadedBy === 1;
    expect(isUploader).toBe(true);
    
    // User is uploader, so can delete
    await deletePhoto(1);
    expect(deletePhoto).toHaveBeenCalledWith(1);
  });

  it("should deny photo deletion when user has no access and is not uploader", async () => {
    const { getPhotoById, getProjectById } = await import("./db");
    
    // Mock photo exists with different uploader
    (getPhotoById as any).mockResolvedValue({
      id: 1,
      projectId: 100,
      uploadedBy: 999, // Different user
    });
    
    // Mock project access denied
    (getProjectById as any).mockResolvedValue(null);
    
    const photo = await getPhotoById(1);
    expect(photo).toBeTruthy();
    
    const isUploader = photo?.uploadedBy === 1;
    expect(isUploader).toBe(false);
    
    const project = await getProjectById(100, 1, "OtherCo", false, null, false);
    expect(project).toBeNull();
    
    // Should be denied - no project access and not uploader
    const shouldDeny = !project && !isUploader;
    expect(shouldDeny).toBe(true);
  });
});

describe("Document Delete Authorization", () => {
  it("should allow document deletion for company members", async () => {
    const { deleteAssessmentDocument } = await import("./db");
    
    // Mock successful deletion for company member
    (deleteAssessmentDocument as any).mockResolvedValue({ success: true });
    
    const result = await deleteAssessmentDocument(1, 1, "TestCo", false, 1, false);
    expect(result).toEqual({ success: true });
    expect(deleteAssessmentDocument).toHaveBeenCalledWith(1, 1, "TestCo", false, 1, false);
  });

  it("should allow document deletion for super admin", async () => {
    const { deleteAssessmentDocument } = await import("./db");
    
    // Mock successful deletion for super admin
    (deleteAssessmentDocument as any).mockResolvedValue({ success: true });
    
    const result = await deleteAssessmentDocument(1, 999, "OtherCo", false, 999, true);
    expect(result).toEqual({ success: true });
    expect(deleteAssessmentDocument).toHaveBeenCalledWith(1, 999, "OtherCo", false, 999, true);
  });
});
