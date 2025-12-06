/**
 * Test Utilities
 * 
 * Common utilities and helpers for testing, including property-based testing setup.
 * This module provides reusable test utilities across the application.
 */

import * as fc from 'fast-check'

/**
 * Property-based testing configuration
 * Ensures consistent test runs across all property tests
 */
export const PBT_CONFIG = {
  numRuns: 100, // Minimum 100 iterations as specified in design
  seed: 42, // Fixed seed for reproducible tests
  verbose: true,
} as const

/**
 * Common arbitraries for property-based testing
 * These can be reused across different test files
 */
export const arbitraries = {
  /**
   * Generates valid environment variable names
   */
  envVarName: () => fc.stringMatching(/^[A-Z][A-Z0-9_]*$/),
  
  /**
   * Generates valid URLs
   */
  validUrl: () => fc.webUrl(),
  
  /**
   * Generates invalid URLs
   */
  invalidUrl: () => fc.oneof(
    fc.string().filter(s => !s.includes('http')),
    fc.constant(''),
    fc.constant('not-a-url'),
    fc.constant('ftp://invalid-protocol.com')
  ),
  
  /**
   * Generates positive integers
   */
  positiveInt: () => fc.integer({ min: 1 }),
  
  /**
   * Generates non-positive integers
   */
  nonPositiveInt: () => fc.integer({ max: 0 }),
  
  /**
   * Generates valid magazine titles
   */
  validTitle: () => fc.stringMatching(/^[a-zA-Z0-9\s\-.,!?]{1,200}$/),
  
  /**
   * Generates invalid magazine titles
   */
  invalidTitle: () => fc.oneof(
    fc.constant(''), // Empty string
    fc.string({ minLength: 201 }), // Too long
    fc.stringMatching(/[^a-zA-Z0-9\s\-.,!?]/) // Invalid characters
  ),
  
  /**
   * Generates valid ISO date strings (YYYY-MM-DD)
   */
  validISODate: () => fc.date().map(d => d.toISOString().split('T')[0]),
  
  /**
   * Generates invalid date strings
   */
  invalidDate: () => fc.oneof(
    fc.constant(''),
    fc.constant('invalid-date'),
    fc.constant('2024-13-01'), // Invalid month
    fc.constant('2024-01-32'), // Invalid day
    fc.stringMatching(/^\d{4}-\d{2}$/) // Missing day
  ),
} as const

/**
 * Test helper functions
 */
export const testHelpers = {
  /**
   * Creates a mock FormData object from key-value pairs
   */
  createMockFormData: (data: Record<string, string | number | boolean>): FormData => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value))
    })
    return formData
  },
  
  /**
   * Creates a mock localStorage implementation for testing
   */
  createMockLocalStorage: (): Storage => {
    const store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
      clear: () => { Object.keys(store).forEach(key => delete store[key]) },
      length: Object.keys(store).length,
      key: (index: number) => Object.keys(store)[index] || null,
    }
  },
} as const

/**
 * Property test wrapper that applies consistent configuration
 */
export function propertyTest<T>(
  name: string,
  arbitrary: fc.Arbitrary<T>,
  predicate: (value: T) => boolean | void
): void {
  fc.assert(
    fc.property(arbitrary, predicate),
    PBT_CONFIG
  )
}