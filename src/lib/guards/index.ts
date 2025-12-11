/**
 * Type Guards
 * 
 * Centralized exports for all runtime type validation functions.
 */

export * from './magazineGuards'
export * from './storageGuards'
export * from './runtimeTypeGuards'

// Re-export commonly used type guards and utilities
export {
  TypeGuards,
  SafeCasting,
  ValidationHelpers,
  RuntimeValidation,
  createTypeGuard,
  createTypeAssertion,
  type TypeGuard,
  type TypeAssertion,
} from './runtimeTypeGuards'
