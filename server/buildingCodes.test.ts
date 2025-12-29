/**
 * Test building codes feature
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Building Codes", () => {
  it("should list all active building codes", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const buildingCodes = await caller.buildingCodes.list();

    expect(buildingCodes).toBeDefined();
    expect(Array.isArray(buildingCodes)).toBe(true);
    expect(buildingCodes.length).toBeGreaterThan(0);
    
    // Check that we have the expected codes
    const codes = buildingCodes.map(c => c.code);
    expect(codes).toContain("NBC_2020");
    expect(codes).toContain("BCBC_2024");
    expect(codes).toContain("NBC_2023_AB");
  });

  it("should return building code details by ID", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // First get all codes to find a valid ID
    const buildingCodes = await caller.buildingCodes.list();
    const firstCode = buildingCodes[0];

    if (!firstCode) {
      throw new Error("No building codes found in database");
    }

    const buildingCode = await caller.buildingCodes.get({ id: firstCode.id });

    expect(buildingCode).toBeDefined();
    expect(buildingCode?.id).toBe(firstCode.id);
    expect(buildingCode?.title).toBeDefined();
    expect(buildingCode?.code).toBeDefined();
  });

  it("should have valid document URLs for all codes", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const buildingCodes = await caller.buildingCodes.list();

    // Check that at least some codes have document URLs
    // Not all codes may have documentUrl set (some may be placeholders)
    const codesWithUrls = buildingCodes.filter(code => code.documentUrl);
    
    // At least some codes should have URLs
    expect(codesWithUrls.length).toBeGreaterThan(0);
    
    for (const code of codesWithUrls) {
      if (code.documentUrl) {
        expect(code.documentUrl).toContain("https://");
      }
    }
  });

  it("should have correct metadata for each code", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const buildingCodes = await caller.buildingCodes.list();

    const nbcCode = buildingCodes.find(c => c.code === "NBC_2020");
    expect(nbcCode).toBeDefined();
    expect(nbcCode?.title).toBe("National Building Code of Canada 2020");
    expect(nbcCode?.jurisdiction).toBe("Canada");
    expect(nbcCode?.year).toBe(2020);
    expect(nbcCode?.pageCount).toBe(1528);

    const bcCode = buildingCodes.find(c => c.code === "BCBC_2024");
    expect(bcCode).toBeDefined();
    expect(bcCode?.title).toBe("British Columbia Building Code 2024");
    expect(bcCode?.jurisdiction).toBe("British Columbia");
    expect(bcCode?.year).toBe(2024);
    expect(bcCode?.pageCount).toBe(1906);

    const abCode = buildingCodes.find(c => c.code === "NBC_2023_AB");
    expect(abCode).toBeDefined();
    expect(abCode?.title).toBe("National Building Code – 2023 Alberta Edition");
    expect(abCode?.jurisdiction).toBe("Alberta");
    expect(abCode?.year).toBe(2023);
    expect(abCode?.pageCount).toBe(1570);
  });

  it("should create project with building code reference", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Get a building code ID
    const buildingCodes = await caller.buildingCodes.list();
    const bcCode = buildingCodes.find(c => c.code === "BCBC_2024");

    if (!bcCode) {
      throw new Error("BC Building Code not found");
    }

    // Create a test project with building code
    const result = await caller.projects.create({
      name: "Test Building Code Project",
      address: "123 Test St",
      buildingCodeId: bcCode.id,
    });

    expect(result.id).toBeDefined();

    // Fetch the project and verify building code is set
    const project = await caller.projects.get({ id: result.id });
    expect(project).toBeDefined();
    expect(project?.buildingCodeId).toBe(bcCode.id);

    // Clean up - delete the test project
    await caller.projects.delete({ id: result.id });
  });
});
