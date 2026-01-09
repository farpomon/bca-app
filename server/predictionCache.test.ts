import { describe, it, expect, beforeEach } from 'vitest';
import { predictionCache } from './predictionCache';

describe('PredictionCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    predictionCache.clear();
  });

  it('should store and retrieve cached predictions', () => {
    const projectId = 1;
    const method = 'hybrid';
    const mockPredictions = [
      { componentCode: 'B3010', riskLevel: 'high', confidenceScore: 0.85 },
      { componentCode: 'D3020', riskLevel: 'medium', confidenceScore: 0.72 },
    ];

    // Store predictions in cache
    predictionCache.set(projectId, method, mockPredictions);

    // Retrieve from cache
    const cached = predictionCache.get(projectId, method);

    expect(cached).toEqual(mockPredictions);
  });

  it('should return null for non-existent cache entries', () => {
    const cached = predictionCache.get(999, 'hybrid');
    expect(cached).toBeNull();
  });

  it('should expire cache entries after TTL', async () => {
    const projectId = 1;
    const method = 'hybrid';
    const mockPredictions = [{ componentCode: 'B3010' }];
    const shortTTL = 100; // 100ms

    // Store with short TTL
    predictionCache.set(projectId, method, mockPredictions, shortTTL);

    // Should be available immediately
    expect(predictionCache.get(projectId, method)).toEqual(mockPredictions);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be null after expiration
    expect(predictionCache.get(projectId, method)).toBeNull();
  });

  it('should invalidate cache for specific project', () => {
    const projectId1 = 1;
    const projectId2 = 2;
    const mockData = [{ componentCode: 'B3010' }];

    // Store predictions for two projects
    predictionCache.set(projectId1, 'hybrid', mockData);
    predictionCache.set(projectId1, 'ml', mockData);
    predictionCache.set(projectId2, 'hybrid', mockData);

    // Invalidate project 1
    predictionCache.invalidate(projectId1);

    // Project 1 cache should be cleared
    expect(predictionCache.get(projectId1, 'hybrid')).toBeNull();
    expect(predictionCache.get(projectId1, 'ml')).toBeNull();

    // Project 2 cache should still exist
    expect(predictionCache.get(projectId2, 'hybrid')).toEqual(mockData);
  });

  it('should clear all cache entries', () => {
    const mockData = [{ componentCode: 'B3010' }];

    // Store multiple entries
    predictionCache.set(1, 'hybrid', mockData);
    predictionCache.set(2, 'ml', mockData);
    predictionCache.set(3, 'curve', mockData);

    // Clear all
    predictionCache.clear();

    // All should be null
    expect(predictionCache.get(1, 'hybrid')).toBeNull();
    expect(predictionCache.get(2, 'ml')).toBeNull();
    expect(predictionCache.get(3, 'curve')).toBeNull();
  });

  it('should cleanup expired entries', async () => {
    const mockData = [{ componentCode: 'B3010' }];
    const shortTTL = 50; // 50ms

    // Store entries with different TTLs
    predictionCache.set(1, 'hybrid', mockData, shortTTL);
    predictionCache.set(2, 'ml', mockData, 10000); // 10 seconds

    // Wait for first entry to expire
    await new Promise(resolve => setTimeout(resolve, 100));

    // Run cleanup
    predictionCache.cleanup();

    const stats = predictionCache.getStats();

    // Should only have 1 entry left (the non-expired one)
    expect(stats.size).toBe(1);
    expect(stats.keys).toContain('predictions:2:ml');
    expect(stats.keys).not.toContain('predictions:1:hybrid');
  });

  it('should provide cache statistics', () => {
    const mockData = [{ componentCode: 'B3010' }];

    predictionCache.set(1, 'hybrid', mockData);
    predictionCache.set(2, 'ml', mockData);

    const stats = predictionCache.getStats();

    expect(stats.size).toBe(2);
    expect(stats.keys).toContain('predictions:1:hybrid');
    expect(stats.keys).toContain('predictions:2:ml');
  });
});
