import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { handleMemoryHealth, handleForceGC } from './health-memory';

// Mock response object
function createMockResponse() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

// Mock request object
function createMockRequest(): Request {
  return {} as Request;
}

describe('Memory Health Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMemoryHealth', () => {
    it('returns memory statistics with correct structure', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleMemoryHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const response = (res.json as any).mock.calls[0][0];
      
      // Check required fields exist
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('heap');
      expect(response).toHaveProperty('heap.used');
      expect(response).toHaveProperty('heap.total');
      expect(response).toHaveProperty('heap.limit');
      expect(response).toHaveProperty('heap.usagePercent');
      expect(response).toHaveProperty('external');
      expect(response).toHaveProperty('rss');
      expect(response).toHaveProperty('alert');
      expect(response).toHaveProperty('formatted');
      expect(response).toHaveProperty('trend');
      expect(response).toHaveProperty('thresholds');
    });

    it('returns valid heap usage percentage', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleMemoryHealth(req, res);

      const response = (res.json as any).mock.calls[0][0];
      
      expect(response.heap.usagePercent).toBeGreaterThanOrEqual(0);
      expect(response.heap.usagePercent).toBeLessThanOrEqual(100);
    });

    it('returns formatted byte values', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleMemoryHealth(req, res);

      const response = (res.json as any).mock.calls[0][0];
      
      expect(response.formatted.heapUsed).toMatch(/^\d+\.\d+ (B|KB|MB|GB)$/);
      expect(response.formatted.heapTotal).toMatch(/^\d+\.\d+ (B|KB|MB|GB)$/);
      expect(response.formatted.heapLimit).toMatch(/^\d+\.\d+ (B|KB|MB|GB)$/);
    });

    it('includes alert level based on usage', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleMemoryHealth(req, res);

      const response = (res.json as any).mock.calls[0][0];
      
      expect(['ok', 'warning', 'critical']).toContain(response.alert.level);
      expect(response.alert).toHaveProperty('message');
      expect(response.alert).toHaveProperty('threshold');
    });

    it('includes trend information', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // Call multiple times to build history
      handleMemoryHealth(req, res);
      handleMemoryHealth(req, res);
      handleMemoryHealth(req, res);

      const response = (res.json as any).mock.calls[2][0];
      
      expect(response.trend).toHaveProperty('direction');
      expect(['increasing', 'decreasing', 'stable']).toContain(response.trend.direction);
      expect(response.trend).toHaveProperty('rate');
      expect(response.trend).toHaveProperty('rateFormatted');
    });

    it('tracks history samples', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      handleMemoryHealth(req, res);

      const response = (res.json as any).mock.calls[0][0];
      
      expect(response.history).toHaveProperty('samples');
      expect(response.history.samples).toBeGreaterThan(0);
    });
  });

  describe('handleForceGC', () => {
    it('returns error when gc is not available', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // Ensure gc is not available
      const originalGc = (global as any).gc;
      (global as any).gc = undefined;

      handleForceGC(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('not available'),
        })
      );

      // Restore
      (global as any).gc = originalGc;
    });

    it('triggers gc when available', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // Mock gc function
      const mockGc = vi.fn();
      (global as any).gc = mockGc;

      handleForceGC(req, res);

      expect(mockGc).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Garbage collection triggered',
        })
      );

      // Cleanup
      (global as any).gc = undefined;
    });
  });
});
