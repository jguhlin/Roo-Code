/**
 * Mem0 API Configuration Management
 * Handles environment variables, API keys, and mode switching between local/hosted
 */

import { ContextProxy } from "../../core/config/ContextProxy"

export interface Mem0Config {
	enabled: boolean
	mode: "local" | "hosted"
	baseUrl?: string
	apiKey?: string
	qdrantCollection?: string
}

export interface Mem0QdrantConfig {
	url?: string
	apiKey?: string
	collection?: string
	enabled: boolean
	source: "codebase_index" | "dedicated" | "none"
}

/**
 * API key validation regex for Mem0
 * Format: mem0-[52 alphanumeric characters]
 */
export const MEM0_API_KEY_REGEX = /^mem0-[a-zA-Z0-9]{52}$/

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Mem0Config = {
	enabled: false,
	mode: "local",
	baseUrl: "http://localhost:4321",
}

/**
 * Environment variable names
 */
export const ENV_VARS = {
	MEM0_API_KEY: "MEM0_API_KEY",
	MEM0_BASE_URL: "MEM0_BASE_URL",
	MEM0_MODE: "MEM0_MODE",
} as const

/**
 * Mem0 Configuration Manager
 * Manages configuration state and validation for Mem0 integration
 */
export class Mem0ConfigManager {
	private config: Mem0Config = { ...DEFAULT_CONFIG }

	constructor(private readonly contextProxy?: ContextProxy) {
		this.loadFromEnvironment()
	}

	/**
	 * Load configuration from environment variables
	 */
	private loadFromEnvironment(): void {
		const apiKey = process.env[ENV_VARS.MEM0_API_KEY]
		const baseUrl = process.env[ENV_VARS.MEM0_BASE_URL]
		const mode = process.env[ENV_VARS.MEM0_MODE] as "local" | "hosted"

		if (apiKey) {
			this.config.apiKey = apiKey
			this.config.mode = "hosted" // API key implies hosted mode
		}

		if (baseUrl) {
			this.config.baseUrl = baseUrl
		}

		if (mode && (mode === "local" || mode === "hosted")) {
			this.config.mode = mode
		}
	}

	/**
	 * Update configuration
	 */
	public updateConfig(updates: Partial<Mem0Config>): void {
		this.config = { ...this.config, ...updates }

		// Auto-detect mode based on API key presence
		if (updates.apiKey !== undefined) {
			this.config.mode = updates.apiKey ? "hosted" : "local"
		}
	}

	/**
	 * Get current configuration
	 */
	public getConfig(): Readonly<Mem0Config> {
		return { ...this.config }
	}

	/**
	 * Check if Mem0 is enabled and properly configured
	 */
	public isEnabled(): boolean {
		return this.config.enabled && this.isValidConfiguration()
	}

	/**
	 * Validate API key format
	 */
	public isValidApiKey(apiKey?: string): boolean {
		if (!apiKey) return false
		return MEM0_API_KEY_REGEX.test(apiKey)
	}

	/**
	 * Check if current configuration is valid
	 */
	public isValidConfiguration(): boolean {
		if (!this.config.baseUrl) return false

		if (this.config.mode === "hosted") {
			return this.isValidApiKey(this.config.apiKey)
		}

		return true // Local mode doesn't require API key
	}

	/**
	 * Get mode-specific configuration
	 */
	public getModeConfig(): { isLocal: boolean; isHosted: boolean; requiresApiKey: boolean } {
		return {
			isLocal: this.config.mode === "local",
			isHosted: this.config.mode === "hosted",
			requiresApiKey: this.config.mode === "hosted",
		}
	}

	/**
	 * Get Qdrant configuration for parallel support
	 */
	public getQdrantConfig(): Mem0QdrantConfig {
		// Check if codebase indexing is enabled and configured
		if (this.contextProxy) {
			const codebaseIndexConfig = this.contextProxy.getGlobalState("codebaseIndexConfig") as any
			const isCodebaseIndexEnabled = codebaseIndexConfig?.codebaseIndexEnabled || false
			const codebaseQdrantUrl = codebaseIndexConfig?.codebaseIndexQdrantUrl || ""
			const codebaseQdrantApiKey = this.contextProxy.getSecret("codeIndexQdrantApiKey") || ""

			// If codebase indexing is enabled and has Qdrant configured, use those settings
			if (isCodebaseIndexEnabled && codebaseQdrantUrl) {
				return {
					url: codebaseQdrantUrl,
					apiKey: codebaseQdrantApiKey || undefined,
					collection: this.config.qdrantCollection || "mem0_memories",
					enabled: true,
					source: "codebase_index",
				}
			}
		}

		// No Qdrant configuration available - return disabled config
		return {
			enabled: false,
			source: "none",
		}
	}

	/**
	 * Get headers for API requests
	 */
	public getRequestHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		}

		if (this.config.mode === "hosted" && this.config.apiKey) {
			headers["Authorization"] = `Bearer ${this.config.apiKey}`
			headers["X-API-Key"] = this.config.apiKey
		}

		return headers
	}

	/**
	 * Get base URL with proper formatting
	 */
	public getBaseUrl(): string | undefined {
		return this.config.baseUrl?.replace(/\/$/, "")
	}
}
