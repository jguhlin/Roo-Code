import { describe, it, expect, beforeEach, vi } from "vitest"
import { Mem0ConfigManager, MEM0_API_KEY_REGEX, DEFAULT_CONFIG, ENV_VARS } from "../config"

describe("Mem0ConfigManager", () => {
	let configManager: Mem0ConfigManager
	const validApiKey = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP"

	beforeEach(() => {
		// Clear environment variables
		delete process.env[ENV_VARS.MEM0_API_KEY]
		delete process.env[ENV_VARS.MEM0_BASE_URL]
		delete process.env[ENV_VARS.MEM0_MODE]

		configManager = new Mem0ConfigManager()
	})

	it("initializes with default configuration", () => {
		const config = configManager.getConfig()

		expect(config).toEqual(DEFAULT_CONFIG)
		expect(config.enabled).toBe(false)
		expect(config.mode).toBe("local")
		expect(config.baseUrl).toBe("http://localhost:4321")
	})

	it("loads configuration from environment variables", () => {
		process.env[ENV_VARS.MEM0_API_KEY] = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP"
		process.env[ENV_VARS.MEM0_BASE_URL] = "https://api.mem0.ai"
		process.env[ENV_VARS.MEM0_MODE] = "hosted"

		const manager = new Mem0ConfigManager()
		const config = manager.getConfig()

		expect(config.apiKey).toBe("mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP")
		expect(config.baseUrl).toBe("https://api.mem0.ai")
		expect(config.mode).toBe("hosted")
	})

	it("auto-detects hosted mode when API key is present in environment", () => {
		process.env[ENV_VARS.MEM0_API_KEY] = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP"

		const manager = new Mem0ConfigManager()
		const config = manager.getConfig()

		expect(config.mode).toBe("hosted")
	})

	it("updates configuration correctly", () => {
		configManager.updateConfig({
			enabled: true,
			baseUrl: "http://custom-server:8080",
			apiKey: "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP",
		})

		const config = configManager.getConfig()

		expect(config.enabled).toBe(true)
		expect(config.baseUrl).toBe("http://custom-server:8080")
		expect(config.apiKey).toBe("mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP")
		expect(config.mode).toBe("hosted") // Auto-detected
	})
	it("validates API key format correctly", () => {
		const validKey = validApiKey
		const invalidKey = "invalid-key"
		const shortKey = "mem0-123"
		const wrongPrefix = "api-1234567890abcdef1234567890abcdef1234567890abcdef1234"

		expect(configManager.isValidApiKey(validKey)).toBe(true)
		expect(configManager.isValidApiKey(invalidKey)).toBe(false)
		expect(configManager.isValidApiKey(shortKey)).toBe(false)
		expect(configManager.isValidApiKey(wrongPrefix)).toBe(false)
		expect(configManager.isValidApiKey(undefined)).toBe(false)
	})

	it("checks configuration validity for local mode", () => {
		configManager.updateConfig({
			enabled: true,
			mode: "local",
			baseUrl: "http://localhost:4321",
		})

		expect(configManager.isValidConfiguration()).toBe(true)
		expect(configManager.isEnabled()).toBe(true)
	})

	it("checks configuration validity for hosted mode", () => {
		configManager.updateConfig({
			enabled: true,
			mode: "hosted",
			baseUrl: "https://api.mem0.ai",
			apiKey: "mem0-1234567890abcdef1234567890abcdef1234567890abcdef1234",
		})

		expect(configManager.isValidConfiguration()).toBe(true)
		expect(configManager.isEnabled()).toBe(true)
	})

	it("rejects invalid hosted mode configuration", () => {
		configManager.updateConfig({
			enabled: true,
			mode: "hosted",
			baseUrl: "https://api.mem0.ai",
			apiKey: "invalid-key",
		})

		expect(configManager.isValidConfiguration()).toBe(false)
		expect(configManager.isEnabled()).toBe(false)
	})

	it("provides correct mode configuration", () => {
		configManager.updateConfig({ mode: "local" })
		let modeConfig = configManager.getModeConfig()

		expect(modeConfig.isLocal).toBe(true)
		expect(modeConfig.isHosted).toBe(false)
		expect(modeConfig.requiresApiKey).toBe(false)

		configManager.updateConfig({ mode: "hosted" })
		modeConfig = configManager.getModeConfig()

		expect(modeConfig.isLocal).toBe(false)
		expect(modeConfig.isHosted).toBe(true)
		expect(modeConfig.requiresApiKey).toBe(true)
	})

	it("generates correct request headers for local mode", () => {
		configManager.updateConfig({ mode: "local" })
		const headers = configManager.getRequestHeaders()

		expect(headers).toEqual({
			"Content-Type": "application/json",
		})
	})

	it("generates correct request headers for hosted mode", () => {
		const apiKey = "mem0-1234567890abcdef1234567890abcdef1234567890abcdef1234"
		configManager.updateConfig({
			mode: "hosted",
			apiKey,
		})
		const headers = configManager.getRequestHeaders()

		expect(headers).toEqual({
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
			"X-API-Key": apiKey,
		})
	})

	it("formats base URL correctly", () => {
		configManager.updateConfig({ baseUrl: "http://localhost:4321/" })
		expect(configManager.getBaseUrl()).toBe("http://localhost:4321")

		configManager.updateConfig({ baseUrl: "http://localhost:4321" })
		expect(configManager.getBaseUrl()).toBe("http://localhost:4321")
	})

	describe("getQdrantConfig", () => {
		it("should return disabled config when no contextProxy", () => {
			const config = configManager.getQdrantConfig()
			expect(config).toEqual({
				enabled: false,
				source: "none",
			})
		})

		it("should return codebase_index config when codebase indexing is enabled", () => {
			const mockContextProxy = {
				getGlobalState: vi.fn((key: string) => {
					if (key === "codebaseIndexConfig") {
						return {
							codebaseIndexEnabled: true,
							codebaseIndexQdrantUrl: "http://localhost:6333",
						}
					}
					return undefined
				}),
				getSecret: vi.fn((key: string) => {
					if (key === "codeIndexQdrantApiKey") {
						return "test-qdrant-key"
					}
					return ""
				}),
			} as any

			const manager = new Mem0ConfigManager(mockContextProxy)
			manager.updateConfig({ qdrantCollection: "custom_collection" })

			const config = manager.getQdrantConfig()
			expect(config).toEqual({
				url: "http://localhost:6333",
				apiKey: "test-qdrant-key",
				collection: "custom_collection",
				enabled: true,
				source: "codebase_index",
			})
		})

		it("should return disabled config when codebase indexing is disabled", () => {
			const mockContextProxy = {
				getGlobalState: vi.fn((key: string) => {
					if (key === "codebaseIndexConfig") {
						return {
							codebaseIndexEnabled: false,
							codebaseIndexQdrantUrl: "http://localhost:6333",
						}
					}
					return undefined
				}),
				getSecret: vi.fn(() => ""),
			} as any

			const manager = new Mem0ConfigManager(mockContextProxy)

			const config = manager.getQdrantConfig()
			expect(config).toEqual({
				enabled: false,
				source: "none",
			})
		})

		it("should return disabled config when no Qdrant URL configured", () => {
			const mockContextProxy = {
				getGlobalState: vi.fn((key: string) => {
					if (key === "codebaseIndexConfig") {
						return {
							codebaseIndexEnabled: true,
							codebaseIndexQdrantUrl: "",
						}
					}
					return undefined
				}),
				getSecret: vi.fn(() => ""),
			} as any

			const manager = new Mem0ConfigManager(mockContextProxy)

			const config = manager.getQdrantConfig()
			expect(config).toEqual({
				enabled: false,
				source: "none",
			})
		})

		it("should use default collection name when not specified", () => {
			const mockContextProxy = {
				getGlobalState: vi.fn((key: string) => {
					if (key === "codebaseIndexConfig") {
						return {
							codebaseIndexEnabled: true,
							codebaseIndexQdrantUrl: "http://localhost:6333",
						}
					}
					return undefined
				}),
				getSecret: vi.fn(() => ""),
			} as any

			const manager = new Mem0ConfigManager(mockContextProxy)

			const config = manager.getQdrantConfig()
			expect(config).toEqual({
				url: "http://localhost:6333",
				apiKey: undefined,
				collection: "mem0_memories",
				enabled: true,
				source: "codebase_index",
			})
		})
	})
})

describe("MEM0_API_KEY_REGEX", () => {
	it("validates correct API key format", () => {
		const validKeys = [
			"mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP",
			"mem0-ABCDEFGHIJ1234567890abcdefABCDEF1234567890abcdef1234",
			"mem0-abcdef1234567890ABCDEF1234567890abcdef1234567890abcd",
		]

		validKeys.forEach((key) => {
			expect(MEM0_API_KEY_REGEX.test(key)).toBe(true)
		})
	})

	it("rejects invalid API key formats", () => {
		const invalidKeys = [
			"api-1234567890abcdef1234567890abcdef12345678901234567890",
			"mem0-123", // too short
			"mem0-1234567890abcdef1234567890abcdef1234567890abcdef12345", // too long
			"mem0-1234567890abcdef1234567890abcdef1234567890abcdef1234!", // invalid character
			"MEM0-1234567890abcdef1234567890abcdef12345678901234567890", // wrong case prefix
			"",
		]

		invalidKeys.forEach((key) => {
			expect(MEM0_API_KEY_REGEX.test(key)).toBe(false)
		})
	})
})
