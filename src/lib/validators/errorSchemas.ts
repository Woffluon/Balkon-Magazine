import { z } from 'zod'

export const ErrorObjectSchema = z.object({
  code: z.string().min(1, 'Error code is required'),
  message: z.string().min(1, 'Error message is required'),
  userMessage: z.string().min(1, 'User message is required'),
  details: z.unknown().optional()
})

/**
 * Error response schema
 * Represents a failed operation with error details
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ErrorObjectSchema
})

/**
 * Generic success response schema
 * Represents a successful operation with data
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema
  })

/**
 * Result type schema factory
 * Creates a discriminated union schema for Result<T> types
 * 
 * @param dataSchema - Zod schema for the success data type
 * @returns Discriminated union schema for Result<T>
 * 
 * @example
 * const MagazineResultSchema = ResultSchema(MagazineSchema)
 * const result = MagazineResultSchema.parse(response)
 * if (result.success) {
 *   // TypeScript knows result.data is Magazine
 * } else {
 *   // TypeScript knows result.error exists
 * }
 */
export const ResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [
    SuccessResponseSchema(dataSchema),
    ErrorResponseSchema
  ])

/**
 * Void result schema for operations that don't return data
 * Used for operations like delete, update, etc.
 */
export const VoidResultSchema = ResultSchema(z.void())

/**
 * String result schema for operations that return a string
 * Used for operations like saveUploadLog that return a path
 */
export const StringResultSchema = ResultSchema(z.string())

/**
 * Number result schema for operations that return a number
 */
export const NumberResultSchema = ResultSchema(z.number())

/**
 * Boolean result schema for operations that return a boolean
 */
export const BooleanResultSchema = ResultSchema(z.boolean())

/**
 * Type inference helpers
 */
export type ErrorObject = z.infer<typeof ErrorObjectSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type SuccessResponse<T> = {
  success: true
  data: T
}
export type Result<T> = SuccessResponse<T> | ErrorResponse

/**
 * Validates an error response and returns typed error object
 * Throws if the response doesn't match the error schema
 * 
 * @param response - The response to validate
 * @returns Validated error response
 * @throws ZodError if validation fails
 */
export function validateErrorResponse(response: unknown): ErrorResponse {
  return ErrorResponseSchema.parse(response)
}

/**
 * Validates a result response with a specific data schema
 * 
 * @param response - The response to validate
 * @param dataSchema - Schema for the success data type
 * @returns Validated result
 * @throws ZodError if validation fails
 */
export function validateResult<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T
): z.infer<ReturnType<typeof ResultSchema<T>>> {
  return ResultSchema(dataSchema).parse(response)
}

/**
 * Type guard to check if a result is a success response
 * Provides type narrowing for TypeScript
 * 
 * @param result - The result to check
 * @returns True if result is a success response
 */
export function isSuccessResponse<T>(
  result: Result<T>
): result is SuccessResponse<T> {
  return result.success === true
}

/**
 * Type guard to check if a result is an error response
 * Provides type narrowing for TypeScript
 * 
 * @param result - The result to check
 * @returns True if result is an error response
 */
export function isErrorResponse<T>(
  result: Result<T>
): result is ErrorResponse {
  return result.success === false
}

/**
 * Safely extracts data from a result, throwing if it's an error
 * 
 * @param result - The result to extract data from
 * @returns The data if successful
 * @throws Error if result is an error response
 */
export function unwrapResult<T>(result: Result<T>): T {
  if (isSuccessResponse(result)) {
    return result.data
  }
  throw new Error(result.error.userMessage)
}

/**
 * Safely extracts data from a result, returning undefined if it's an error
 * 
 * @param result - The result to extract data from
 * @returns The data if successful, undefined otherwise
 */
export function unwrapResultOrUndefined<T>(result: Result<T>): T | undefined {
  if (isSuccessResponse(result)) {
    return result.data
  }
  return undefined
}

/**
 * Safely extracts data from a result, returning a default value if it's an error
 * 
 * @param result - The result to extract data from
 * @param defaultValue - The default value to return on error
 * @returns The data if successful, default value otherwise
 */
export function unwrapResultOr<T>(result: Result<T>, defaultValue: T): T {
  if (isSuccessResponse(result)) {
    return result.data
  }
  return defaultValue
}
