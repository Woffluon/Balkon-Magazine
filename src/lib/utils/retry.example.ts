/**
 * Example usage and verification of the retry utility
 * 
 * This file demonstrates how to use the withRetry function
 * and can be used for manual verification.
 */

import { withRetry } from './retry'

/**
 * Example 1: Successful operation on first try
 */
async function exampleSuccessFirstTry() {
  console.log('Example 1: Success on first try')
  
  const result = await withRetry(async () => {
    console.log('  Attempting operation...')
    return 'Success!'
  })
  
  console.log('  Result:', result)
  console.log()
}

/**
 * Example 2: Success after 2 failures (exponential backoff)
 */
async function exampleSuccessAfterRetries() {
  console.log('Example 2: Success after 2 failures (exponential backoff)')
  
  let attemptCount = 0
  const result = await withRetry(async () => {
    attemptCount++
    console.log(`  Attempt ${attemptCount}`)
    
    if (attemptCount < 3) {
      throw new Error('Temporary failure')
    }
    
    return 'Success after retries!'
  }, {
    maxRetries: 3,
    delay: 100, // Using shorter delay for demo
    backoff: 'exponential'
  })
  
  console.log('  Result:', result)
  console.log()
}

/**
 * Example 3: All retries exhausted (linear backoff)
 */
async function exampleAllRetriesExhausted() {
  console.log('Example 3: All retries exhausted (linear backoff)')
  
  let attemptCount = 0
  try {
    await withRetry(async () => {
      attemptCount++
      console.log(`  Attempt ${attemptCount}`)
      throw new Error('Persistent failure')
    }, {
      maxRetries: 3,
      delay: 100,
      backoff: 'linear'
    })
  } catch (error) {
    console.log('  Final error:', (error as Error).message)
    console.log('  Total attempts:', attemptCount)
  }
  console.log()
}

/**
 * Example 4: Simulating database query with retry
 */
async function exampleDatabaseQuery() {
  console.log('Example 4: Simulating database query')
  
  let attemptCount = 0
  const result = await withRetry(async () => {
    attemptCount++
    console.log(`  Query attempt ${attemptCount}`)
    
    // Simulate network issue on first attempt
    if (attemptCount === 1) {
      throw new Error('Network timeout')
    }
    
    // Return mock data
    return { data: [{ id: 1, title: 'Magazine 1' }] }
  })
  
  console.log('  Result:', result)
  console.log()
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('=== Retry Utility Examples ===\n')
  
  await exampleSuccessFirstTry()
  await exampleSuccessAfterRetries()
  await exampleAllRetriesExhausted()
  await exampleDatabaseQuery()
  
  console.log('=== All examples completed ===')
}

// Uncomment to run examples:
// runExamples().catch(console.error)

export { runExamples }
