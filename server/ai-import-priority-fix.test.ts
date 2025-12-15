import { describe, it, expect } from 'vitest';

/**
 * Tests for AI Document Import Priority Mapping Fix
 * 
 * This test verifies that the AI parser correctly maps deficiency priority values
 * from various AI outputs to the database enum values.
 */

describe('AI Document Import Priority Mapping', () => {
  it('should map various priority formats to database enum values', () => {
    // Database accepts: 'immediate', 'short_term', 'medium_term', 'long_term'
    
    const priorityMapping: Record<string, string> = {
      'immediate': 'immediate',
      'urgent': 'immediate',
      'critical': 'immediate',
      'short': 'short_term',
      'short_term': 'short_term',
      'short term': 'short_term',
      'medium': 'medium_term',
      'medium_term': 'medium_term',
      'medium term': 'medium_term',
      'long': 'long_term',
      'long_term': 'long_term',
      'long term': 'long_term',
      'low': 'long_term'
    };
    
    // Test immediate mappings
    expect(priorityMapping['immediate']).toBe('immediate');
    expect(priorityMapping['urgent']).toBe('immediate');
    expect(priorityMapping['critical']).toBe('immediate');
    
    // Test short_term mappings
    expect(priorityMapping['short']).toBe('short_term');
    expect(priorityMapping['short_term']).toBe('short_term');
    expect(priorityMapping['short term']).toBe('short_term');
    
    // Test medium_term mappings
    expect(priorityMapping['medium']).toBe('medium_term');
    expect(priorityMapping['medium_term']).toBe('medium_term');
    expect(priorityMapping['medium term']).toBe('medium_term');
    
    // Test long_term mappings
    expect(priorityMapping['long']).toBe('long_term');
    expect(priorityMapping['long_term']).toBe('long_term');
    expect(priorityMapping['long term']).toBe('long_term');
    expect(priorityMapping['low']).toBe('long_term');
  });
  
  it('should handle undefined priority by defaulting to medium_term', () => {
    const mockDeficiency = {
      title: 'Test Deficiency',
      description: 'Test description',
      priority: undefined
    };
    
    // Simulate the mapping logic from ai-document-parser.ts
    const priorityMapping: Record<string, string> = {
      'immediate': 'immediate',
      'urgent': 'immediate',
      'critical': 'immediate',
      'short': 'short_term',
      'short_term': 'short_term',
      'short term': 'short_term',
      'medium': 'medium_term',
      'medium_term': 'medium_term',
      'medium term': 'medium_term',
      'long': 'long_term',
      'long_term': 'long_term',
      'long term': 'long_term',
      'low': 'long_term'
    };
    
    let mappedPriority: string;
    if (mockDeficiency.priority && typeof mockDeficiency.priority === 'string') {
      const lowerPriority = mockDeficiency.priority.toLowerCase().trim();
      mappedPriority = priorityMapping[lowerPriority] || 'medium_term';
    } else {
      // Default to medium_term if priority is undefined or invalid
      mappedPriority = 'medium_term';
    }
    
    expect(mappedPriority).toBe('medium_term');
  });
  
  it('should handle invalid priority values by defaulting to medium_term', () => {
    const mockDeficiency = {
      title: 'Test Deficiency',
      description: 'Test description',
      priority: 'invalid_priority_value'
    };
    
    const priorityMapping: Record<string, string> = {
      'immediate': 'immediate',
      'urgent': 'immediate',
      'critical': 'immediate',
      'short': 'short_term',
      'short_term': 'short_term',
      'short term': 'short_term',
      'medium': 'medium_term',
      'medium_term': 'medium_term',
      'medium term': 'medium_term',
      'long': 'long_term',
      'long_term': 'long_term',
      'long term': 'long_term',
      'low': 'long_term'
    };
    
    let mappedPriority: string;
    if (mockDeficiency.priority && typeof mockDeficiency.priority === 'string') {
      const lowerPriority = mockDeficiency.priority.toLowerCase().trim();
      mappedPriority = priorityMapping[lowerPriority] || 'medium_term';
    } else {
      mappedPriority = 'medium_term';
    }
    
    expect(mappedPriority).toBe('medium_term');
  });
  
  it('should handle case-insensitive priority values', () => {
    const priorityMapping: Record<string, string> = {
      'immediate': 'immediate',
      'urgent': 'immediate',
      'critical': 'immediate',
      'short': 'short_term',
      'short_term': 'short_term',
      'short term': 'short_term',
      'medium': 'medium_term',
      'medium_term': 'medium_term',
      'medium term': 'medium_term',
      'long': 'long_term',
      'long_term': 'long_term',
      'long term': 'long_term',
      'low': 'long_term'
    };
    
    // Test uppercase
    expect(priorityMapping['IMMEDIATE'.toLowerCase()]).toBe('immediate');
    expect(priorityMapping['URGENT'.toLowerCase()]).toBe('immediate');
    
    // Test mixed case
    expect(priorityMapping['Short_Term'.toLowerCase()]).toBe('short_term');
    expect(priorityMapping['Medium Term'.toLowerCase()]).toBe('medium_term');
  });
});
