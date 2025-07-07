import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import axios, { type AxiosError } from "axios"
import {
	configureMem0,
	search_memories,
	store_memory,
	getMem0Mode,
	validateApiKey,
	get_memory,
	delete_memory,
	list_memories,
	health_check,
	resetMem0Config,
} from "../client"
import {
	Mem0InvalidApiKeyError,
	Mem0NotInitializedError,
	Mem0HostedModeError,
	Mem0ApiError,
	Mem0NetworkError,
} from "../errors"

vi.mock("axios", () => ({
	default: vi.fn(),
	isAxiosError: vi.fn(),
}))

// Create a mock function for the axios call
const axiosCall = vi.fn()

// Mock the axios.isAxiosError function
const mockIsAxiosError = vi.fn()

// Mock the default axios function
const mockedAxios = vi.mocked(axios)
mockedAxios.mockImplementation(axiosCall as any)
;(mockedAxios as any).isAxiosError = mockIsAxiosError

describe("Mem0 Client", () => {
	const validApiKey = "mem0-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP"

	beforeEach(() => {
		vi.clearAllMocks()
		axiosCall.mockClear()
		resetMem0Config()
		// Only mock console.error for specific error handling tests
		// Don't mock it globally as it interferes with configuration validation
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("Configuration Management", () => {
		it("initializes and configures Mem0 correctly", () => {
			configureMem0({
				enabled: true,
				baseUrl: "http://localhost:4321",
				mode: "local",
			})

			const mode = getMem0Mode()
			expect(mode.isEnabled).toBe(true)
			expect(mode.mode).toBe("local")
		})

		it("validates API key format correctly", () => {
			configureMem0({ enabled: true })

			expect(validateApiKey(validApiKey)).toBe(true)
			expect(validateApiKey("invalid-key")).toBe(false)
			expect(validateApiKey("mem0-123")).toBe(false)
		})

		it("throws error for invalid API key in hosted mode", () => {
			expect(() => {
				configureMem0({
					enabled: true,
					mode: "hosted",
					apiKey: "invalid-key",
				})
			}).toThrow(Mem0InvalidApiKeyError)
		})

		it("auto-detects hosted mode when API key is provided", () => {
			configureMem0({
				enabled: true,
				apiKey: validApiKey,
			})

			const mode = getMem0Mode()
			expect(mode.mode).toBe("hosted")
		})

		it("handles missing configuration gracefully", () => {
			const mode = getMem0Mode()
			expect(mode.isEnabled).toBe(false)
			expect(mode.mode).toBe("local")
		})

		it("DEBUG: verifies configuration state after reset", async () => {
			// Debug the configuration flow to understand why isServiceReady returns false
			console.log("DEBUG: Before configuration - validApiKey:", validApiKey)

			try {
				const mode1 = getMem0Mode()
				console.log("DEBUG: Mode before config:", mode1)
			} catch (error) {
				console.log("DEBUG: Error getting mode before config:", error)
			}

			// Configure the service
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			console.log("DEBUG: After configuration")
			const mode2 = getMem0Mode()
			console.log("DEBUG: Mode after config:", mode2)
			console.log("DEBUG: API key validation:", validateApiKey(validApiKey))

			// Try to actually call a function to see if it works
			axiosCall.mockResolvedValue({ data: [{ id: 1, content: "test" }] })
			const result = await search_memories("test", "user", "agent")
			console.log("DEBUG: Search result:", result)
			console.log("DEBUG: Axios call count:", axiosCall.mock.calls.length)

			expect(mode2.isEnabled).toBe(true)
			expect(mode2.mode).toBe("hosted")
		})

		it("DEBUG: direct test of service state", async () => {
			// Reset and configure
			resetMem0Config()
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			// Check the mode
			const mode = getMem0Mode()
			console.log("Mode:", mode)

			// Setup axios mock
			axiosCall.mockResolvedValue({ data: [{ id: 1, content: "test" }] })

			// Call the function
			const result = await search_memories("test", "user", "agent")

			// Check if axios was called
			expect(axiosCall).toHaveBeenCalledTimes(1)
			expect(result).toEqual([{ id: 1, content: "test" }])
		})
	})

	describe("Search Memories", () => {
		it("returns null when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await search_memories("query", "user", "agent")
			expect(result).toBe(null)
			expect(axiosCall).not.toHaveBeenCalled()
		})

		it("makes successful search request in hosted mode with custom URL", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: [{ id: 1, content: "memory" }] })

			const result = await search_memories("test query", "user123", "agent456")

			expect(axiosCall).toHaveBeenCalledWith({
				method: "POST",
				url: "http://localhost:4321/search",
				data: {
					query: "test query",
					user_id: "user123",
					agent_id: "agent456",
				},
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toEqual([{ id: 1, content: "memory" }])
		})

		it("makes successful search request with official API", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "https://api.mem0.ai",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: [{ id: 1, content: "memory" }] })

			const result = await search_memories("test query", "user123", "agent456")

			expect(axiosCall).toHaveBeenCalledWith({
				method: "POST",
				url: "https://api.mem0.ai/search",
				data: {
					query: "test query",
					user_id: "user123",
					agent_id: "agent456",
				},
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toEqual([{ id: 1, content: "memory" }])
		})

		it("handles API errors gracefully", async () => {
			configureMem0({
				enabled: true,
				baseUrl: "http://localhost:4321",
			})

			const mockError = {
				response: {
					status: 500,
					data: { error: "Internal server error" },
				},
			}
			mockIsAxiosError.mockReturnValue(true)
			axiosCall.mockRejectedValue(mockError)

			const result = await search_memories("query", "user", "agent")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalled()
		})

		it("returns empty array for non-array responses", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: null })

			const result = await search_memories("query", "user", "agent")
			expect(result).toEqual([])
		})
	})

	describe("Store Memory", () => {
		it("returns false when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await store_memory([], "user", "agent")
			expect(result).toBe(false)
			expect(axiosCall).not.toHaveBeenCalled()
		})

		it("stores memory successfully", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: { success: true } })

			const messages = [{ role: "user", content: "test message" }]
			const metadata = { session: "test" }

			const result = await store_memory(messages, "user123", "agent456", metadata)

			expect(axiosCall).toHaveBeenCalledWith({
				method: "POST",
				url: "http://localhost:4321/memories",
				data: {
					messages,
					user_id: "user123",
					agent_id: "agent456",
					metadata,
				},
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toBe(true)
		})

		it("handles store memory errors gracefully", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockRejectedValue(new Error("Network error"))

			const result = await store_memory([], "user", "agent")

			expect(result).toBe(false)
			expect(console.error).toHaveBeenCalled()
		})
	})

	describe("Get Memory", () => {
		it("returns null when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await get_memory("memory123")
			expect(result).toBeNull()
		})

		it("retrieves memory successfully", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			const memoryData = { id: "memory123", content: "test memory" }
			axiosCall.mockResolvedValue({ data: memoryData })

			const result = await get_memory("memory123")

			expect(axiosCall).toHaveBeenCalledWith({
				method: "GET",
				url: "http://localhost:4321/memories/memory123",
				data: undefined,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toEqual(memoryData)
		})
	})

	describe("Delete Memory", () => {
		it("returns false when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await delete_memory("memory123")
			expect(result).toBe(false)
		})

		it("deletes memory successfully", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: { success: true } })

			const result = await delete_memory("memory123")

			expect(axiosCall).toHaveBeenCalledWith({
				method: "DELETE",
				url: "http://localhost:4321/memories/memory123",
				data: undefined,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toBe(true)
		})
	})

	describe("List Memories", () => {
		it("returns null when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await list_memories("user", "agent")
			expect(result).toBeNull()
		})

		it("lists memories successfully", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			const memories = [{ id: 1 }, { id: 2 }]
			axiosCall.mockResolvedValue({ data: memories })

			const result = await list_memories("user123", "agent456", 10)

			expect(axiosCall).toHaveBeenCalledWith({
				method: "GET",
				url: "http://localhost:4321/memories?user_id=user123&agent_id=agent456&limit=10",
				data: undefined,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${validApiKey}`,
					"X-API-Key": validApiKey,
				},
				timeout: 30000,
			})

			expect(result).toEqual(memories)
		})

		it("handles non-array responses correctly", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: {} })

			const result = await list_memories("user", "agent")
			expect(result).toEqual([])
		})
	})

	describe("Health Check", () => {
		it("returns error status when service is disabled", async () => {
			configureMem0({ enabled: false })

			const result = await health_check()

			expect(result.status).toBe("error")
			expect(result.mode).toBe("local")
			expect(result.timestamp).toBeTypeOf("number")
		})

		it("returns ok status for successful health check", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockResolvedValue({ data: { status: "healthy" } })

			const result = await health_check()

			expect(result.status).toBe("ok")
			expect(result.mode).toBe("hosted")
			expect(result.timestamp).toBeTypeOf("number")
		})

		it("returns error status for failed health check", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			axiosCall.mockRejectedValue(new Error("Connection failed"))

			const result = await health_check()

			expect(result.status).toBe("error")
			expect(result.timestamp).toBeTypeOf("number")
		})
	})

	describe("Error Handling", () => {
		it("handles 401 authentication errors", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			const mockError = {
				response: {
					status: 401,
					data: { error: "Unauthorized" },
				},
			}
			mockIsAxiosError.mockReturnValue(true)
			axiosCall.mockRejectedValue(mockError)

			const result = await search_memories("query", "user", "agent")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalled()
		})

		it("handles network errors", async () => {
			configureMem0({
				enabled: true,
				mode: "hosted",
				baseUrl: "http://localhost:4321",
				apiKey: validApiKey,
			})

			const mockError = {
				request: {},
				message: "Network Error",
			}
			mockIsAxiosError.mockReturnValue(true)
			axiosCall.mockRejectedValue(mockError)

			const result = await search_memories("query", "user", "agent")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalled()
		})

		it("throws error when not initialized", async () => {
			expect(() => validateApiKey("test")).toThrow(Mem0NotInitializedError)
		})
	})

	describe("Backward Compatibility", () => {
		it("maintains compatibility with original interface", async () => {
			configureMem0({ enabled: true, mode: "hosted", baseUrl: "http://localhost:4321", apiKey: validApiKey })
			axiosCall.mockResolvedValue({ data: [] })

			// Test original function signatures
			await search_memories("query", "user", "agent")
			await store_memory([], "user", "agent")

			expect(axiosCall).toHaveBeenCalledTimes(2)
		})
	})
})
