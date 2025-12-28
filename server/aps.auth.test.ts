import { describe, expect, it } from "vitest";
import { getApsToken, getApsViewerToken } from "./_core/aps";

describe("APS Authentication", () => {
  it("should successfully obtain an APS access token with valid credentials", async () => {
    const result = await getApsToken();

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(typeof result.accessToken).toBe("string");
    expect(result.accessToken.length).toBeGreaterThan(0);
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(result.tokenType).toBe("Bearer");
  }, 10000); // 10 second timeout for API call

  it("should successfully obtain a viewer token", async () => {
    const token = await getApsViewerToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  }, 10000);

  it("should request correct scopes for full access", async () => {
    const result = await getApsToken(['data:read', 'data:write', 'bucket:create']);

    expect(result.accessToken).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
  }, 10000);
});
