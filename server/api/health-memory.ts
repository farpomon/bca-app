import { Request, Response } from 'express';
import v8 from 'v8';

/**
 * Memory Health Monitoring Endpoint
 * 
 * Tracks heap usage in production and provides alerts when approaching limits.
 * Returns detailed memory statistics for monitoring dashboards.
 */

interface MemoryStats {
  timestamp: number;
  heap: {
    used: number;
    total: number;
    limit: number;
    usagePercent: number;
  };
  external: number;
  arrayBuffers: number;
  rss: number;
  heapSpaces: v8.HeapSpaceInfo[];
  alert: {
    level: 'ok' | 'warning' | 'critical';
    message: string;
    threshold: number;
  };
}

// Memory history for trend analysis (last 100 samples)
const memoryHistory: Array<{ timestamp: number; usagePercent: number }> = [];
const MAX_HISTORY_SIZE = 100;

// Alert thresholds (configurable via environment variables)
const WARNING_THRESHOLD = parseFloat(process.env.MEMORY_WARNING_THRESHOLD || '75');
const CRITICAL_THRESHOLD = parseFloat(process.env.MEMORY_CRITICAL_THRESHOLD || '85');

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function getAlertLevel(usagePercent: number): MemoryStats['alert'] {
  if (usagePercent >= CRITICAL_THRESHOLD) {
    return {
      level: 'critical',
      message: `Memory usage at ${usagePercent.toFixed(1)}% - immediate attention required`,
      threshold: CRITICAL_THRESHOLD,
    };
  }
  
  if (usagePercent >= WARNING_THRESHOLD) {
    return {
      level: 'warning',
      message: `Memory usage at ${usagePercent.toFixed(1)}% - approaching limit`,
      threshold: WARNING_THRESHOLD,
    };
  }
  
  return {
    level: 'ok',
    message: 'Memory usage within normal limits',
    threshold: WARNING_THRESHOLD,
  };
}

function calculateTrend(): { direction: 'increasing' | 'decreasing' | 'stable'; rate: number } {
  if (memoryHistory.length < 10) {
    return { direction: 'stable', rate: 0 };
  }
  
  const recentSamples = memoryHistory.slice(-10);
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];
  
  const timeDiff = (lastSample.timestamp - firstSample.timestamp) / 1000; // seconds
  const usageDiff = lastSample.usagePercent - firstSample.usagePercent;
  
  const rate = timeDiff > 0 ? usageDiff / timeDiff : 0; // % per second
  
  if (Math.abs(rate) < 0.01) {
    return { direction: 'stable', rate };
  }
  
  return {
    direction: rate > 0 ? 'increasing' : 'decreasing',
    rate: Math.abs(rate),
  };
}

export function handleMemoryHealth(_req: Request, res: Response): void {
  try {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapSpaces = v8.getHeapSpaceStatistics();
    
    const usagePercent = (heapStats.used_heap_size / heapStats.heap_size_limit) * 100;
    const timestamp = Date.now();
    
    // Update history
    memoryHistory.push({ timestamp, usagePercent });
    if (memoryHistory.length > MAX_HISTORY_SIZE) {
      memoryHistory.shift();
    }
    
    const trend = calculateTrend();
    
    const stats: MemoryStats = {
      timestamp,
      heap: {
        used: heapStats.used_heap_size,
        total: heapStats.total_heap_size,
        limit: heapStats.heap_size_limit,
        usagePercent: parseFloat(usagePercent.toFixed(2)),
      },
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
      heapSpaces,
      alert: getAlertLevel(usagePercent),
    };
    
    // Response with formatted data for easy reading
    const response = {
      ...stats,
      formatted: {
        heapUsed: formatBytes(stats.heap.used),
        heapTotal: formatBytes(stats.heap.total),
        heapLimit: formatBytes(stats.heap.limit),
        external: formatBytes(stats.external),
        arrayBuffers: formatBytes(stats.arrayBuffers),
        rss: formatBytes(stats.rss),
      },
      trend: {
        ...trend,
        rateFormatted: `${(trend.rate * 60).toFixed(2)}% per minute`,
      },
      history: {
        samples: memoryHistory.length,
        oldest: memoryHistory[0]?.timestamp,
        newest: memoryHistory[memoryHistory.length - 1]?.timestamp,
      },
      thresholds: {
        warning: WARNING_THRESHOLD,
        critical: CRITICAL_THRESHOLD,
      },
    };
    
    // Set appropriate status code based on alert level
    const statusCode = stats.alert.level === 'critical' ? 503 : 
                       stats.alert.level === 'warning' ? 200 : 200;
    
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('[Memory Health] Error collecting memory stats:', error);
    res.status(500).json({
      error: 'Failed to collect memory statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Force garbage collection (only available with --expose-gc flag)
 * Useful for debugging memory leaks
 */
export function handleForceGC(_req: Request, res: Response): void {
  if (global.gc) {
    const beforeHeap = process.memoryUsage().heapUsed;
    global.gc();
    const afterHeap = process.memoryUsage().heapUsed;
    
    res.json({
      success: true,
      message: 'Garbage collection triggered',
      freed: formatBytes(beforeHeap - afterHeap),
      beforeHeap: formatBytes(beforeHeap),
      afterHeap: formatBytes(afterHeap),
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Garbage collection not available. Start Node.js with --expose-gc flag.',
    });
  }
}
