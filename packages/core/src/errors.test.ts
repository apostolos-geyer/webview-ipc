import { describe, it, expect } from 'vitest'
import {
	NotImplementedError,
	WebViewRPCError,
	WebViewRPCTimeoutError,
} from './errors'

describe('NotImplementedError', () => {
	describe('construction', () => {
		it('should create error with default message', () => {
			// GIVEN: Creating NotImplementedError without message
			const error = new NotImplementedError()

			// THEN: Should have default message
			expect(error.message).toBe('Not implemented')
			expect(error.name).toBe('NotImplementedError')
		})

		it('should create error with custom message', () => {
			// GIVEN: Creating NotImplementedError with custom message
			const error = new NotImplementedError('custom message')

			// THEN: Should have custom message
			expect(error.message).toBe('custom message')
			expect(error.name).toBe('NotImplementedError')
		})

		it('should be instanceof Error', () => {
			// GIVEN: A NotImplementedError instance
			const error = new NotImplementedError()

			// THEN: Should be instanceof Error
			expect(error).toBeInstanceOf(Error)
		})

		it('should be instanceof NotImplementedError', () => {
			// GIVEN: A NotImplementedError instance
			const error = new NotImplementedError()

			// THEN: Should be instanceof NotImplementedError
			expect(error).toBeInstanceOf(NotImplementedError)
		})

		it('should have correct prototype chain', () => {
			// GIVEN: A NotImplementedError instance
			const error = new NotImplementedError()

			// THEN: Should have correct prototype
			expect(Object.getPrototypeOf(error)).toBe(
				NotImplementedError.prototype,
			)
		})
	})

	describe('throwing', () => {
		it('should be catchable as NotImplementedError', () => {
			// GIVEN: A function that throws NotImplementedError
			const throwError = () => {
				throw new NotImplementedError('test')
			}

			// THEN: Should be catchable
			expect(throwError).toThrow(NotImplementedError)
			expect(throwError).toThrow('test')
		})

		it('should be catchable as Error', () => {
			// GIVEN: A function that throws NotImplementedError
			const throwError = () => {
				throw new NotImplementedError()
			}

			// THEN: Should be catchable as Error
			expect(throwError).toThrow(Error)
		})
	})
})

describe('WebViewRPCError', () => {
	describe('construction', () => {
		it('should create error with message and code', () => {
			// GIVEN: Creating WebViewRPCError with message and code
			const error = new WebViewRPCError('Something went wrong', 'ERR_CODE')

			// THEN: Should have message and code
			expect(error.message).toBe('Something went wrong')
			expect(error.code).toBe('ERR_CODE')
			expect(error.name).toBe('WebViewRPCError')
		})

		it('should be instanceof Error', () => {
			// GIVEN: A WebViewRPCError instance
			const error = new WebViewRPCError('test', 'CODE')

			// THEN: Should be instanceof Error
			expect(error).toBeInstanceOf(Error)
		})

		it('should be instanceof WebViewRPCError', () => {
			// GIVEN: A WebViewRPCError instance
			const error = new WebViewRPCError('test', 'CODE')

			// THEN: Should be instanceof WebViewRPCError
			expect(error).toBeInstanceOf(WebViewRPCError)
		})

		it('should have correct prototype chain', () => {
			// GIVEN: A WebViewRPCError instance
			const error = new WebViewRPCError('test', 'CODE')

			// THEN: Should have correct prototype
			expect(Object.getPrototypeOf(error)).toBe(WebViewRPCError.prototype)
		})
	})

	describe('properties', () => {
		it('should expose code property', () => {
			// GIVEN: A WebViewRPCError
			const error = new WebViewRPCError('test', 'MY_CODE')

			// THEN: Code should be accessible
			expect(error.code).toBe('MY_CODE')
		})

		it('should allow different error codes', () => {
			// GIVEN: Multiple errors with different codes
			const error1 = new WebViewRPCError('test', 'HANDLER_ERROR')
			const error2 = new WebViewRPCError('test', 'SERIALIZATION_ERROR')
			const error3 = new WebViewRPCError('test', 'VALIDATION_ERROR')

			// THEN: Each should have its own code
			expect(error1.code).toBe('HANDLER_ERROR')
			expect(error2.code).toBe('SERIALIZATION_ERROR')
			expect(error3.code).toBe('VALIDATION_ERROR')
		})
	})

	describe('throwing', () => {
		it('should be catchable as WebViewRPCError', () => {
			// GIVEN: A function that throws WebViewRPCError
			const throwError = () => {
				throw new WebViewRPCError('test', 'CODE')
			}

			// THEN: Should be catchable
			expect(throwError).toThrow(WebViewRPCError)
			expect(throwError).toThrow('test')
		})

		it('should be catchable with code inspection', () => {
			// GIVEN: A function that throws WebViewRPCError
			try {
				throw new WebViewRPCError('test error', 'HANDLER_ERROR')
			} catch (error) {
				// THEN: Should be able to inspect error code
				expect(error).toBeInstanceOf(WebViewRPCError)
				if (error instanceof WebViewRPCError) {
					expect(error.code).toBe('HANDLER_ERROR')
				}
			}
		})
	})
})

describe('WebViewRPCTimeoutError', () => {
	describe('construction', () => {
		it('should create timeout error with message and timeout', () => {
			// GIVEN: Creating WebViewRPCTimeoutError
			const error = new WebViewRPCTimeoutError(
				'Request timed out after 5000ms',
				5000,
			)

			// THEN: Should have message, code, and timeout
			expect(error.message).toBe('Request timed out after 5000ms')
			expect(error.code).toBe('TIMEOUT')
			expect(error.timeout).toBe(5000)
			expect(error.name).toBe('WebViewRPCTimeoutError')
		})

		it('should automatically set code to TIMEOUT', () => {
			// GIVEN: Creating WebViewRPCTimeoutError
			const error = new WebViewRPCTimeoutError('timed out', 3000)

			// THEN: Code should always be TIMEOUT
			expect(error.code).toBe('TIMEOUT')
		})

		it('should be instanceof Error', () => {
			// GIVEN: A WebViewRPCTimeoutError instance
			const error = new WebViewRPCTimeoutError('test', 1000)

			// THEN: Should be instanceof Error
			expect(error).toBeInstanceOf(Error)
		})

		it('should be instanceof WebViewRPCError', () => {
			// GIVEN: A WebViewRPCTimeoutError instance
			const error = new WebViewRPCTimeoutError('test', 1000)

			// THEN: Should be instanceof WebViewRPCError
			expect(error).toBeInstanceOf(WebViewRPCError)
		})

		it('should be instanceof WebViewRPCTimeoutError', () => {
			// GIVEN: A WebViewRPCTimeoutError instance
			const error = new WebViewRPCTimeoutError('test', 1000)

			// THEN: Should be instanceof WebViewRPCTimeoutError
			expect(error).toBeInstanceOf(WebViewRPCTimeoutError)
		})

		it('should have correct prototype chain', () => {
			// GIVEN: A WebViewRPCTimeoutError instance
			const error = new WebViewRPCTimeoutError('test', 1000)

			// THEN: Should have correct prototype
			expect(Object.getPrototypeOf(error)).toBe(
				WebViewRPCTimeoutError.prototype,
			)
		})
	})

	describe('properties', () => {
		it('should expose timeout property', () => {
			// GIVEN: A WebViewRPCTimeoutError with specific timeout
			const error = new WebViewRPCTimeoutError('timed out', 7500)

			// THEN: Timeout should be accessible
			expect(error.timeout).toBe(7500)
		})

		it('should support different timeout values', () => {
			// GIVEN: Multiple timeout errors with different durations
			const error1 = new WebViewRPCTimeoutError('timeout', 1000)
			const error2 = new WebViewRPCTimeoutError('timeout', 5000)
			const error3 = new WebViewRPCTimeoutError('timeout', 30000)

			// THEN: Each should have its own timeout
			expect(error1.timeout).toBe(1000)
			expect(error2.timeout).toBe(5000)
			expect(error3.timeout).toBe(30000)
		})

		it('should always have TIMEOUT code', () => {
			// GIVEN: WebViewRPCTimeoutError instances
			const error1 = new WebViewRPCTimeoutError('test', 1000)
			const error2 = new WebViewRPCTimeoutError('test', 5000)

			// THEN: All should have TIMEOUT code
			expect(error1.code).toBe('TIMEOUT')
			expect(error2.code).toBe('TIMEOUT')
		})
	})

	describe('throwing', () => {
		it('should be catchable as WebViewRPCTimeoutError', () => {
			// GIVEN: A function that throws WebViewRPCTimeoutError
			const throwError = () => {
				throw new WebViewRPCTimeoutError('timeout', 5000)
			}

			// THEN: Should be catchable
			expect(throwError).toThrow(WebViewRPCTimeoutError)
			expect(throwError).toThrow('timeout')
		})

		it('should be catchable as WebViewRPCError', () => {
			// GIVEN: A function that throws WebViewRPCTimeoutError
			const throwError = () => {
				throw new WebViewRPCTimeoutError('timeout', 5000)
			}

			// THEN: Should be catchable as WebViewRPCError
			expect(throwError).toThrow(WebViewRPCError)
		})

		it('should be catchable with timeout inspection', () => {
			// GIVEN: A function that throws WebViewRPCTimeoutError
			try {
				throw new WebViewRPCTimeoutError('Request timed out', 5000)
			} catch (error) {
				// THEN: Should be able to inspect timeout and code
				expect(error).toBeInstanceOf(WebViewRPCTimeoutError)
				if (error instanceof WebViewRPCTimeoutError) {
					expect(error.timeout).toBe(5000)
					expect(error.code).toBe('TIMEOUT')
				}
			}
		})
	})

	describe('inheritance', () => {
		it('should pass instanceof checks for entire chain', () => {
			// GIVEN: A WebViewRPCTimeoutError instance
			const error = new WebViewRPCTimeoutError('test', 1000)

			// THEN: Should pass instanceof for all parent classes
			expect(error instanceof WebViewRPCTimeoutError).toBe(true)
			expect(error instanceof WebViewRPCError).toBe(true)
			expect(error instanceof Error).toBe(true)
		})

		it('should allow catching as parent class', () => {
			// GIVEN: Code that catches WebViewRPCError
			let caught = false
			try {
				throw new WebViewRPCTimeoutError('timeout', 5000)
			} catch (error) {
				if (error instanceof WebViewRPCError) {
					caught = true
				}
			}

			// THEN: Should be caught
			expect(caught).toBe(true)
		})
	})
})
