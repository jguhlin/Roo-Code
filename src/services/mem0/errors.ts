/**
 * Mem0 Service Error Definitions
 * Provides specialized error classes for Mem0 API and configuration issues
 */

/**
 * Base error class for Mem0 service errors
 */
export class Mem0Error extends Error {
	constructor(
		message: string,
		public readonly code?: string,
	) {
		super(message)
		this.name = "Mem0Error"
	}
}

/**
 * Error thrown when API key validation fails
 */
export class Mem0InvalidApiKeyError extends Mem0Error {
	constructor(apiKey?: string) {
		const message = apiKey
			? `Invalid Mem0 API key format. Expected format: mem0-[52 alphanumeric characters], got: ${apiKey.substring(0, 10)}...`
			: "Missing Mem0 API key. API key is required for hosted mode."

		super(message, "INVALID_API_KEY")
		this.name = "Mem0InvalidApiKeyError"
	}
}

/**
 * Error thrown when configuration is invalid
 */
export class Mem0ConfigurationError extends Mem0Error {
	constructor(message: string) {
		super(message, "CONFIGURATION_ERROR")
		this.name = "Mem0ConfigurationError"
	}
}

/**
 * Error thrown when API requests fail
 */
export class Mem0ApiError extends Mem0Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly response?: any,
	) {
		super(message, "API_ERROR")
		this.name = "Mem0ApiError"
	}
}

/**
 * Error thrown when service is not properly initialized
 */
export class Mem0NotInitializedError extends Mem0Error {
	constructor() {
		super("Mem0 service is not initialized. Call configureMem0() first.", "NOT_INITIALIZED")
		this.name = "Mem0NotInitializedError"
	}
}

/**
 * Error thrown when attempting to use hosted features without valid configuration
 */
export class Mem0HostedModeError extends Mem0Error {
	constructor() {
		super(
			"Hosted mode requires a valid API key. Switch to local mode or provide a valid API key.",
			"HOSTED_MODE_ERROR",
		)
		this.name = "Mem0HostedModeError"
	}
}

/**
 * Error thrown when network requests fail
 */
export class Mem0NetworkError extends Mem0Error {
	constructor(originalError: Error) {
		super(`Network error: ${originalError.message}`, "NETWORK_ERROR")
		this.name = "Mem0NetworkError"
		this.cause = originalError
	}
}

/**
 * Utility function to determine if an error is a Mem0-related error
 */
export function isMem0Error(error: unknown): error is Mem0Error {
	return error instanceof Mem0Error
}

/**
 * Utility function to handle and format Mem0 errors for logging
 */
export function formatMem0Error(error: unknown): string {
	if (isMem0Error(error)) {
		return `[Mem0 ${error.code || "ERROR"}] ${error.message}`
	}

	if (error instanceof Error) {
		return `[Mem0 UNKNOWN] ${error.message}`
	}

	return `[Mem0 UNKNOWN] ${String(error)}`
}

/**
 * Type guard for API key validation errors
 */
export function isApiKeyError(error: unknown): error is Mem0InvalidApiKeyError {
	return error instanceof Mem0InvalidApiKeyError
}

/**
 * Type guard for configuration errors
 */
export function isConfigurationError(error: unknown): error is Mem0ConfigurationError {
	return error instanceof Mem0ConfigurationError
}
