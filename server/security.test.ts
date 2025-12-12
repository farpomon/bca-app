import { describe, expect, it } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { validateInput } from "./_core/security";

/**
 * Security middleware tests
 * Tests input validation, XSS detection, and SQL injection detection
 */

describe("Security Middleware", () => {
  describe("validateInput", () => {
    it("should allow clean input", () => {
      const req = {
        body: { name: "John Doe", email: "john@example.com" },
        query: { page: "1", limit: "10" },
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            throw new Error("Should not be called");
          },
        }),
      } as unknown as Response;

      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      validateInput(req, res, next);
      expect(nextCalled).toBe(true);
    });

    it("should block SQL injection in body", () => {
      const req = {
        body: { search: "' OR 1=1 --" },
        query: {},
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      let statusCode = 0;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseData = data;
            },
          };
        },
      } as unknown as Response;

      const next = (() => {
        throw new Error("Next should not be called");
      }) as NextFunction;

      validateInput(req, res, next);
      expect(statusCode).toBe(400);
      expect(responseData.error).toBe("Invalid input");
    });

    it("should block XSS in body", () => {
      const req = {
        body: { comment: "<script>alert('XSS')</script>" },
        query: {},
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      let statusCode = 0;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseData = data;
            },
          };
        },
      } as unknown as Response;

      const next = (() => {
        throw new Error("Next should not be called");
      }) as NextFunction;

      validateInput(req, res, next);
      expect(statusCode).toBe(400);
      expect(responseData.error).toBe("Invalid input");
    });

    it("should block SQL injection in query parameters", () => {
      const req = {
        body: {},
        query: { id: "1 UNION SELECT * FROM users" },
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      let statusCode = 0;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseData = data;
            },
          };
        },
      } as unknown as Response;

      const next = (() => {
        throw new Error("Next should not be called");
      }) as NextFunction;

      validateInput(req, res, next);
      expect(statusCode).toBe(400);
      expect(responseData.error).toBe("Invalid input");
    });

    it("should block event handler XSS", () => {
      const req = {
        body: { html: '<img src=x onerror="alert(1)">' },
        query: {},
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      let statusCode = 0;
      let responseData: any = null;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              responseData = data;
            },
          };
        },
      } as unknown as Response;

      const next = (() => {
        throw new Error("Next should not be called");
      }) as NextFunction;

      validateInput(req, res, next);
      expect(statusCode).toBe(400);
      expect(responseData.error).toBe("Invalid input");
    });

    it("should allow legitimate SQL-like content in text", () => {
      const req = {
        body: {
          description: "This project will SELECT the best materials and INSERT quality components.",
        },
        query: {},
        ip: "127.0.0.1",
        path: "/api/test",
      } as unknown as Request;

      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            throw new Error("Should not block legitimate content");
          },
        }),
      } as unknown as Response;

      let nextCalled = false;
      const next = (() => {
        nextCalled = true;
      }) as NextFunction;

      validateInput(req, res, next);
      expect(nextCalled).toBe(true);
    });
  });
});
