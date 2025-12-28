import { describe, expect, it, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// Mock the dependencies
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://storage.example.com/test-model.rvt", key: "models/1/test.rvt" }),
}));

vi.mock("../_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn().mockResolvedValue({
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      role: "user",
    }),
  },
}));

vi.mock("../db/models.db", () => ({
  createFacilityModel: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../_core/apsService", () => ({
  createBucket: vi.fn().mockResolvedValue({ bucketKey: "test-bucket" }),
  uploadObject: vi.fn().mockResolvedValue({
    objectId: "urn:adsk.objects:os.object:test-bucket/test.rvt",
    objectKey: "test.rvt",
    bucketKey: "test-bucket",
    size: 1000,
    sha1: "abc123",
    location: "https://aps.example.com/test.rvt",
  }),
  translateModel: vi.fn().mockResolvedValue({
    result: "success",
    urn: "dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6dGVzdC1idWNrZXQvdGVzdC5ydnQ",
  }),
  objectIdToUrn: vi.fn().mockReturnValue("dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6dGVzdC1idWNrZXQvdGVzdC5ydnQ"),
  generateBucketKey: vi.fn().mockReturnValue("bca-models-test"),
}));

describe("upload-model endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject requests without authentication", async () => {
    const { sdk } = await import("../_core/sdk");
    vi.mocked(sdk.authenticateRequest).mockRejectedValueOnce(new Error("Unauthorized"));

    const { handleModelUpload } = await import("./upload-model");

    const mockReq = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test.rvt",
        size: 12,
        mimetype: "application/octet-stream",
      },
      body: {
        projectId: "1",
        name: "Test Model",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Authentication required" });
  });

  it("should reject requests without a file", async () => {
    const { handleModelUpload } = await import("./upload-model");

    const mockReq = {
      file: undefined,
      body: {
        projectId: "1",
        name: "Test Model",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "No file uploaded" });
  });

  it("should reject requests with invalid project ID", async () => {
    const { handleModelUpload } = await import("./upload-model");

    const mockReq = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test.rvt",
        size: 12,
        mimetype: "application/octet-stream",
      },
      body: {
        projectId: "invalid",
        name: "Test Model",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid project ID" });
  });

  it("should successfully upload a model file", async () => {
    const { handleModelUpload } = await import("./upload-model");
    const { storagePut } = await import("../storage");
    const { createFacilityModel } = await import("../db/models.db");

    const mockReq = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test-model.rvt",
        size: 12,
        mimetype: "application/octet-stream",
      },
      body: {
        projectId: "1",
        name: "Test Model",
        description: "A test model",
        uploadToAps: "true",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    expect(storagePut).toHaveBeenCalled();
    expect(createFacilityModel).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        url: expect.any(String),
      })
    );
  });

  it("should handle S3 upload failure gracefully", async () => {
    const { storagePut } = await import("../storage");
    vi.mocked(storagePut).mockRejectedValueOnce(new Error("S3 upload failed"));

    const { handleModelUpload } = await import("./upload-model");

    const mockReq = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test.rvt",
        size: 12,
        mimetype: "application/octet-stream",
      },
      body: {
        projectId: "1",
        name: "Test Model",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Failed to upload model",
        message: "S3 upload failed",
      })
    );
  });

  it("should continue with S3-only upload when APS fails", async () => {
    const { createBucket } = await import("../_core/apsService");
    vi.mocked(createBucket).mockRejectedValueOnce(new Error("APS bucket creation failed"));

    const { handleModelUpload } = await import("./upload-model");
    const { createFacilityModel } = await import("../db/models.db");

    const mockReq = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test.rvt",
        size: 12,
        mimetype: "application/octet-stream",
      },
      body: {
        projectId: "1",
        name: "Test Model",
        uploadToAps: "true",
      },
    } as unknown as Request;

    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    await handleModelUpload(mockReq, mockRes);

    // Should still succeed with S3 upload
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
    // Model should be created with failed APS status
    expect(createFacilityModel).toHaveBeenCalledWith(
      expect.objectContaining({
        apsTranslationStatus: "failed",
      })
    );
  });
});
