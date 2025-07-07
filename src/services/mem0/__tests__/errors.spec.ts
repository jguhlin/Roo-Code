import { describe, it, expect } from "vitest"
import {
	Mem0Error,
	Mem0InvalidApiKeyError,
	Mem0ConfigurationError,
	Mem0ApiError,
	Mem0NotInitializedError,
	Mem0HostedModeError,
	Mem0NetworkError,
	isMem0Error,
	formatMem0Error,
	isApiKeyError,
	isConfigurationError,
} from "../errors"

describe("Mem0 Error Classes", () => {
	describe("Mem0Error", () => {
		it("creates base error with message and code", () => {
			const error = new Mem0Error("Test error", "TEST_CODE")

			expect(error.message).toBe("Test error")
			expect(error.code).toBe("TEST_CODE")
			expect(error.name).toBe("Mem0Error")
			expect(error).toBeInstanceOf(Error)
		})

		it("creates base error with just message", () => {
			const error = new Mem0Error("Test error")

			expect(error.message).toBe("Test error")
			expect(error.code).toBeUndefined()
			expect(error.name).toBe("Mem0Error")
		})
	})

	describe("Mem0InvalidApiKeyError", () => {
		it("creates error for invalid API key format", () => {
			const error = new Mem0InvalidApiKeyError("invalid-key")

			expect(error.message).toContain("Invalid Mem0 API key format")
			expect(error.message).toContain("invalid-ke...")
			expect(error.code).toBe("INVALID_API_KEY")
			expect(error.name).toBe("Mem0InvalidApiKeyError")
		})

		it("creates error for missing API key", () => {
			const error = new Mem0InvalidApiKeyError()

			expect(error.message).toContain("Missing Mem0 API key")
			expect(error.message).toContain("required for hosted mode")
			expect(error.code).toBe("INVALID_API_KEY")
		})

		it("truncates long API keys in error message", () => {
			const longKey = "very-long-invalid-api-key-that-should-be-truncated"
			const error = new Mem0InvalidApiKeyError(longKey)

			expect(error.message).toContain("very-long-...")
			expect(error.message).not.toContain(longKey)
		})
	})

	describe("Mem0ConfigurationError", () => {
		it("creates configuration error", () => {
			const error = new Mem0ConfigurationError("Invalid configuration")

			expect(error.message).toBe("Invalid configuration")
			expect(error.code).toBe("CONFIGURATION_ERROR")
			expect(error.name).toBe("Mem0ConfigurationError")
		})
	})

	describe("Mem0ApiError", () => {
		it("creates API error with all parameters", () => {
			const response = { error: "Not found" }
			const error = new Mem0ApiError("API failed", 404, response)

			expect(error.message).toBe("API failed")
			expect(error.code).toBe("API_ERROR")
			expect(error.name).toBe("Mem0ApiError")
			expect(error.statusCode).toBe(404)
			expect(error.response).toEqual(response)
		})

		it("creates API error with minimal parameters", () => {
			const error = new Mem0ApiError("API failed")

			expect(error.message).toBe("API failed")
			expect(error.statusCode).toBeUndefined()
			expect(error.response).toBeUndefined()
		})
	})

	describe("Mem0NotInitializedError", () => {
		it("creates not initialized error", () => {
			const error = new Mem0NotInitializedError()

			expect(error.message).toContain("not initialized")
			expect(error.message).toContain("configureMem0()")
			expect(error.code).toBe("NOT_INITIALIZED")
			expect(error.name).toBe("Mem0NotInitializedError")
		})
	})

	describe("Mem0HostedModeError", () => {
		it("creates hosted mode error", () => {
			const error = new Mem0HostedModeError()

			expect(error.message).toContain("Hosted mode requires")
			expect(error.message).toContain("valid API key")
			expect(error.code).toBe("HOSTED_MODE_ERROR")
			expect(error.name).toBe("Mem0HostedModeError")
		})
	})

	describe("Mem0NetworkError", () => {
		it("creates network error from original error", () => {
			const originalError = new Error("Connection failed")
			const error = new Mem0NetworkError(originalError)

			expect(error.message).toContain("Network error")
			expect(error.message).toContain("Connection failed")
			expect(error.code).toBe("NETWORK_ERROR")
			expect(error.name).toBe("Mem0NetworkError")
			expect(error.cause).toBe(originalError)
		})
	})
})

describe("Error Utility Functions", () => {
	describe("isMem0Error", () => {
		it("returns true for Mem0Error instances", () => {
			const error = new Mem0Error("test")
			expect(isMem0Error(error)).toBe(true)
		})

		it("returns true for Mem0Error subclasses", () => {
			const apiKeyError = new Mem0InvalidApiKeyError()
			const configError = new Mem0ConfigurationError("test")
			const apiError = new Mem0ApiError("test")

			expect(isMem0Error(apiKeyError)).toBe(true)
			expect(isMem0Error(configError)).toBe(true)
			expect(isMem0Error(apiError)).toBe(true)
		})

		it("returns false for regular errors", () => {
			const error = new Error("test")
			expect(isMem0Error(error)).toBe(false)
		})

		it("returns false for non-error values", () => {
			expect(isMem0Error("string")).toBe(false)
			expect(isMem0Error(null)).toBe(false)
			expect(isMem0Error(undefined)).toBe(false)
			expect(isMem0Error({})).toBe(false)
		})
	})

	describe("formatMem0Error", () => {
		it("formats Mem0Error with code", () => {
			const error = new Mem0Error("Test message", "TEST_CODE")
			const formatted = formatMem0Error(error)

			expect(formatted).toBe("[Mem0 TEST_CODE] Test message")
		})

		it("formats Mem0Error without code", () => {
			const error = new Mem0Error("Test message")
			const formatted = formatMem0Error(error)

			expect(formatted).toBe("[Mem0 ERROR] Test message")
		})

		it("formats regular Error", () => {
			const error = new Error("Regular error")
			const formatted = formatMem0Error(error)

			expect(formatted).toBe("[Mem0 UNKNOWN] Regular error")
		})

		it("formats non-error values", () => {
			expect(formatMem0Error("string error")).toBe("[Mem0 UNKNOWN] string error")
			expect(formatMem0Error(null)).toBe("[Mem0 UNKNOWN] null")
			expect(formatMem0Error(undefined)).toBe("[Mem0 UNKNOWN] undefined")
		})
	})

	describe("isApiKeyError", () => {
		it("returns true for Mem0InvalidApiKeyError", () => {
			const error = new Mem0InvalidApiKeyError()
			expect(isApiKeyError(error)).toBe(true)
		})

		it("returns false for other error types", () => {
			const mem0Error = new Mem0Error("test")
			const configError = new Mem0ConfigurationError("test")
			const regularError = new Error("test")

			expect(isApiKeyError(mem0Error)).toBe(false)
			expect(isApiKeyError(configError)).toBe(false)
			expect(isApiKeyError(regularError)).toBe(false)
			expect(isApiKeyError("string")).toBe(false)
		})
	})

	describe("isConfigurationError", () => {
		it("returns true for Mem0ConfigurationError", () => {
			const error = new Mem0ConfigurationError("test")
			expect(isConfigurationError(error)).toBe(true)
		})

		it("returns false for other error types", () => {
			const mem0Error = new Mem0Error("test")
			const apiKeyError = new Mem0InvalidApiKeyError()
			const regularError = new Error("test")

			expect(isConfigurationError(mem0Error)).toBe(false)
			expect(isConfigurationError(apiKeyError)).toBe(false)
			expect(isConfigurationError(regularError)).toBe(false)
			expect(isConfigurationError("string")).toBe(false)
		})
	})
})
