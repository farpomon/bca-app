import { describe, it, expect } from 'vitest';
import { escapeCSV, arrayToCSV } from '../client/src/lib/csvExport';

describe('CSV Export Utilities', () => {
  describe('escapeCSV', () => {
    it('should return empty string for null or undefined', () => {
      expect(escapeCSV(null)).toBe('');
      expect(escapeCSV(undefined)).toBe('');
    });

    it('should convert non-string values to strings', () => {
      expect(escapeCSV(123)).toBe('123');
      expect(escapeCSV(true)).toBe('true');
    });

    it('should escape values containing commas', () => {
      expect(escapeCSV('Hello, World')).toBe('"Hello, World"');
    });

    it('should escape values containing quotes', () => {
      expect(escapeCSV('Say "Hello"')).toBe('"Say ""Hello"""');
    });

    it('should escape values containing newlines', () => {
      expect(escapeCSV('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should not escape simple values', () => {
      expect(escapeCSV('Simple Value')).toBe('Simple Value');
      expect(escapeCSV('Building A')).toBe('Building A');
    });
  });

  describe('arrayToCSV', () => {
    it('should generate CSV with headers and rows', () => {
      const headers = ['Name', 'Age', 'City'];
      const rows = [
        ['John Doe', '30', 'New York'],
        ['Jane Smith', '25', 'Los Angeles'],
      ];

      const csv = arrayToCSV(headers, rows);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Name,Age,City');
      expect(lines[1]).toBe('John Doe,30,New York');
      expect(lines[2]).toBe('Jane Smith,25,Los Angeles');
    });

    it('should handle values with commas', () => {
      const headers = ['Building', 'Location'];
      const rows = [
        ['Building A', 'New York, NY'],
      ];

      const csv = arrayToCSV(headers, rows);
      const lines = csv.split('\n');

      expect(lines[1]).toBe('Building A,"New York, NY"');
    });

    it('should handle empty rows', () => {
      const headers = ['Col1', 'Col2'];
      const rows: any[][] = [];

      const csv = arrayToCSV(headers, rows);
      
      expect(csv).toBe('Col1,Col2\n');
    });

    it('should handle numeric values', () => {
      const headers = ['Building', 'FCI', 'CRV'];
      const rows = [
        ['Building A', 12.5, 1000000],
      ];

      const csv = arrayToCSV(headers, rows);
      const lines = csv.split('\n');

      expect(lines[1]).toBe('Building A,12.5,1000000');
    });
  });

  describe('Building CSV Export', () => {
    it('should format building data correctly', () => {
      const buildings = [
        {
          name: 'Building A',
          location: 'New York',
          yearBuilt: 1990,
          grossArea: 50000,
          crv: 10000000,
          deferredMaintenance: 500000,
          fci: 5.0,
          conditionRating: 'Fair',
          priorityScore: 75.5,
        },
      ];

      // Simulate the export process
      const headers = [
        'Building Name',
        'Location',
        'Year Built',
        'Gross Area (sq ft)',
        'Current Replacement Value',
        'Deferred Maintenance',
        'FCI (%)',
        'Condition Rating',
        'Priority Score'
      ];
      
      const rows = buildings.map(b => [
        b.name,
        b.location || '',
        b.yearBuilt || '',
        b.grossArea || '',
        b.crv || '',
        b.deferredMaintenance || '',
        b.fci !== undefined ? b.fci.toFixed(1) : '',
        b.conditionRating || '',
        b.priorityScore !== undefined ? b.priorityScore.toFixed(1) : ''
      ]);
      
      const csv = arrayToCSV(headers, rows);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Building Name');
      expect(lines[1]).toContain('Building A');
      expect(lines[1]).toContain('5.0'); // FCI formatted to 1 decimal
      expect(lines[1]).toContain('75.5'); // Priority score formatted to 1 decimal
    });
  });

  describe('UNIFORMAT CSV Export', () => {
    it('should format UNIFORMAT data correctly', () => {
      const uniformatItems = [
        {
          code: 'A10',
          description: 'Foundations',
          totalCost: 250000,
          percentOfBacklog: 25.0,
          fciImpact: 2.5,
        },
      ];

      const headers = [
        'UNIFORMAT Code',
        'Description',
        'Total Cost',
        '% of Backlog',
        'FCI Impact (%)'
      ];
      
      const rows = uniformatItems.map(item => [
        item.code,
        item.description,
        item.totalCost,
        item.percentOfBacklog.toFixed(1),
        item.fciImpact !== undefined ? item.fciImpact.toFixed(2) : ''
      ]);
      
      const csv = arrayToCSV(headers, rows);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('UNIFORMAT Code');
      expect(lines[1]).toContain('A10');
      expect(lines[1]).toContain('Foundations');
      expect(lines[1]).toContain('25.0'); // Percent formatted to 1 decimal
      expect(lines[1]).toContain('2.50'); // FCI Impact formatted to 2 decimals
    });
  });
});
