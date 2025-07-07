import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import {
	configureMem0,
	search_memories,
	store_memory,
	getMem0Mode,
	get_memory,
	delete_memory,
	list_memories,
	health_check,
	resetMem0Config,
} from "../client"
import { Mem0QdrantClient, type Mem0Memory, type Mem0SearchResult } from "../qdrant-client"
import { Mem0ConfigManager } from "../config"
import type { IEmbedder } from "../../code-index/interfaces/embedder"

// Mock the Qdrant client
vi.mock("../qdrant-client")
const MockedMem0QdrantClient = vi.mocked(Mem0QdrantClient)

// Mock the config manager
vi.mock("../config")
const MockedMem0ConfigManager = vi.mocked(Mem0ConfigManager)

// Mock embedder
const mockEmbedder: IEmbedder = {
	createEmbeddings: vi.fn(),
	get embedderInfo() {
		return { name: "openai" as const }
	},
}

describe("Mem0 Client - Local Mode", () => {
	let mockQdrantClient: {
		initialize: Mock
		storeMemory: Mock
		searchMemories: Mock
		getMemory: Mock
		deleteMemory: Mock
		listMemories: Mock
		healthCheck: Mock
	}

	let mockConfigManager: {
		updateConfig: Mock
		getConfig: Mock
		isEnabled: Mock
		isValidConfiguration: Mock
		isValidApiKey: Mock
		getModeConfig: Mock
		getQdrantConfig: Mock
		getRequestHeaders: Mock
		getBaseUrl: Mock
	}

	beforeEach(() => {
		vi.clearAllMocks()
		resetMem0Config()

		// Setup mock Qdrant client
		mockQdrantClient = {
			initialize: vi.fn().mockResolvedValue(true),
			storeMemory: vi.fn().mockResolvedValue(undefined),
			searchMemories: vi.fn().mockResolvedValue([]),
			getMemory: vi.fn().mockResolvedValue(null),
			deleteMemory: vi.fn().mockResolvedValue(true),
			listMemories: vi.fn().mockResolvedValue([]),
			healthCheck: vi.fn().mockResolvedValue(true),
		}

		MockedMem0QdrantClient.mockImplementation(() => mockQdrantClient as any)

		// Setup mock config manager
		mockConfigManager = {
			updateConfig: vi.fn(),
			getConfig: vi.fn().mockReturnValue({
				enabled: true,
				mode: "local",
				baseUrl: "http://localhost:4321",
			}),
			isEnabled: vi.fn().mockReturnValue(true),
			isValidConfiguration: vi.fn().mockReturnValue(true),
			isValidApiKey: vi.fn().mockReturnValue(false),
			getModeConfig: vi.fn().mockReturnValue({
				isLocal: true,
				isHosted: false,
				requiresApiKey: false,
			}),
			getQdrantConfig: vi.fn().mockReturnValue({
				enabled: true,
				url: "http://localhost:6333",
				collection: "mem0_memories",
				source: "codebase_index",
			}),
			getRequestHeaders: vi.fn().mockReturnValue({
				"Content-Type": "application/json",
			}),
			getBaseUrl: vi.fn().mockReturnValue("http://localhost:4321"),
		}

		MockedMem0ConfigManager.mockImplementation(() => mockConfigManager as any)

		// Suppress console logs for tests
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.spyOn(console, "warn").mockImplementation(() => {})
		vi.spyOn(console, "log").mockImplementation(() => {})

		// Mock embedder response
		vi.mocked(mockEmbedder.createEmbeddings).mockResolvedValue({
			embeddings: [[0.1, 0.2, 0.3 /* ... more values to reach 1536 */]],
		} as any)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("Local Mode Configuration", () => {
		it("configures local mode correctly", () => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)

			const mode = getMem0Mode()
			expect(mode.isEnabled).toBe(true)
			expect(mode.mode).toBe("local")
		})

		it("initializes with proper Qdrant configuration", () => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
					qdrantCollection: "test_memories",
				},
				mockEmbedder,
			)

			expect(mockConfigManager.updateConfig).toHaveBeenCalledWith({
				enabled: true,
				mode: "local",
				qdrantCollection: "test_memories",
			})
		})
	})

	describe("Local Mode Search Memories", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("searches memories using Qdrant in local mode", async () => {
			const mockSearchResults: Mem0SearchResult[] = [
				{
					id: "mem_1",
					score: 0.9,
					payload: {
						id: "mem_1",
						content: "Test memory content",
						user_id: "user123",
						agent_id: "agent456",
						metadata: { tag: "test" },
						created_at: "2024-01-01T00:00:00Z",
						updated_at: "2024-01-01T00:00:00Z",
					},
				},
			]

			mockQdrantClient.searchMemories.mockResolvedValue(mockSearchResults)

			const result = await search_memories("test query", "user123", "agent456")

			expect(mockEmbedder.createEmbeddings).toHaveBeenCalledWith(["test query"])
			expect(mockQdrantClient.searchMemories).toHaveBeenCalledWith(
				[0.1, 0.2, 0.3],
				"user123",
				"agent456",
				10,
				0.7,
			)

			expect(result).toEqual([
				{
					id: "mem_1",
					content: "Test memory content",
					score: 0.9,
					user_id: "user123",
					agent_id: "agent456",
					metadata: { tag: "test" },
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				},
			])
		})

		it("handles embedding creation failure", async () => {
			vi.mocked(mockEmbedder.createEmbeddings).mockResolvedValue({
				embeddings: [],
			} as any)

			const result = await search_memories("test query", "user123", "agent456")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalledWith("[Mem0] Failed to create embedding for query")
		})

		it("handles search errors gracefully", async () => {
			mockQdrantClient.searchMemories.mockRejectedValue(new Error("Search failed"))

			const result = await search_memories("test query", "user123", "agent456")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalledWith("[Mem0] Local search failed:", expect.any(Error))
		})
	})

	describe("Local Mode Store Memory", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("stores memory using Qdrant in local mode", async () => {
			const messages = [
				{ role: "user", content: "Hello" },
				{ role: "assistant", content: "Hi there!" },
			]
			const metadata = { session: "test_session" }

			const result = await store_memory(messages, "user123", "agent456", metadata)

			expect(mockEmbedder.createEmbeddings).toHaveBeenCalledWith(["Hello Hi there!"])

			expect(mockQdrantClient.storeMemory).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringMatching(/^mem_\d+_[a-z0-9]+$/),
					content: "Hello Hi there!",
					user_id: "user123",
					agent_id: "agent456",
					metadata,
					created_at: expect.any(String),
					updated_at: expect.any(String),
					vector: [0.1, 0.2, 0.3],
				}),
			)

			expect(result).toBe(true)
		})

		it("handles string messages correctly", async () => {
			const messages = ["Hello", "How are you?"]

			const result = await store_memory(messages, "user123", "agent456")

			expect(mockEmbedder.createEmbeddings).toHaveBeenCalledWith(["Hello How are you?"])
			expect(result).toBe(true)
		})

		it("handles embedding creation failure", async () => {
			vi.mocked(mockEmbedder.createEmbeddings).mockResolvedValue({
				embeddings: [],
			} as any)

			const result = await store_memory(["test"], "user123", "agent456")

			expect(result).toBe(false)
			expect(console.error).toHaveBeenCalledWith("[Mem0] Failed to create embedding for memory content")
		})

		it("handles storage errors gracefully", async () => {
			mockQdrantClient.storeMemory.mockRejectedValue(new Error("Storage failed"))

			const result = await store_memory(["test"], "user123", "agent456")

			expect(result).toBe(false)
			expect(console.error).toHaveBeenCalledWith("[Mem0] Local memory storage failed:", expect.any(Error))
		})
	})

	describe("Local Mode Get Memory", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("retrieves memory using Qdrant in local mode", async () => {
			const mockMemory: Mem0Memory = {
				id: "mem_123",
				content: "Test memory content",
				user_id: "user123",
				agent_id: "agent456",
				metadata: { tag: "test" },
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			}

			mockQdrantClient.getMemory.mockResolvedValue(mockMemory)

			const result = await get_memory("mem_123")

			expect(mockQdrantClient.getMemory).toHaveBeenCalledWith("mem_123")
			expect(result).toEqual({
				id: "mem_123",
				content: "Test memory content",
				user_id: "user123",
				agent_id: "agent456",
				metadata: { tag: "test" },
				created_at: "2024-01-01T00:00:00Z",
				updated_at: "2024-01-01T00:00:00Z",
			})
		})

		it("returns null when memory not found", async () => {
			mockQdrantClient.getMemory.mockResolvedValue(null)

			const result = await get_memory("nonexistent")

			expect(result).toBeNull()
		})

		it("handles get memory errors gracefully", async () => {
			mockQdrantClient.getMemory.mockRejectedValue(new Error("Get failed"))

			const result = await get_memory("mem_123")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalledWith("[Mem0] Local get memory failed:", expect.any(Error))
		})
	})

	describe("Local Mode Delete Memory", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("deletes memory using Qdrant in local mode", async () => {
			mockQdrantClient.deleteMemory.mockResolvedValue(true)

			const result = await delete_memory("mem_123")

			expect(mockQdrantClient.deleteMemory).toHaveBeenCalledWith("mem_123")
			expect(result).toBe(true)
		})

		it("handles delete memory errors gracefully", async () => {
			mockQdrantClient.deleteMemory.mockRejectedValue(new Error("Delete failed"))

			const result = await delete_memory("mem_123")

			expect(result).toBe(false)
			expect(console.error).toHaveBeenCalledWith("[Mem0] Local delete memory failed:", expect.any(Error))
		})
	})

	describe("Local Mode List Memories", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("lists memories using Qdrant in local mode", async () => {
			const mockMemories: Mem0Memory[] = [
				{
					id: "mem_1",
					content: "First memory",
					user_id: "user123",
					agent_id: "agent456",
					metadata: {},
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				},
				{
					id: "mem_2",
					content: "Second memory",
					user_id: "user123",
					agent_id: "agent456",
					metadata: {},
					created_at: "2024-01-02T00:00:00Z",
					updated_at: "2024-01-02T00:00:00Z",
				},
			]

			mockQdrantClient.listMemories.mockResolvedValue(mockMemories)

			const result = await list_memories("user123", "agent456", 20)

			expect(mockQdrantClient.listMemories).toHaveBeenCalledWith("user123", "agent456", 20)
			expect(result).toEqual([
				{
					id: "mem_1",
					content: "First memory",
					user_id: "user123",
					agent_id: "agent456",
					metadata: {},
					created_at: "2024-01-01T00:00:00Z",
					updated_at: "2024-01-01T00:00:00Z",
				},
				{
					id: "mem_2",
					content: "Second memory",
					user_id: "user123",
					agent_id: "agent456",
					metadata: {},
					created_at: "2024-01-02T00:00:00Z",
					updated_at: "2024-01-02T00:00:00Z",
				},
			])
		})

		it("handles list memories errors gracefully", async () => {
			mockQdrantClient.listMemories.mockRejectedValue(new Error("List failed"))

			const result = await list_memories("user123", "agent456")

			expect(result).toBeNull()
			expect(console.error).toHaveBeenCalledWith("[Mem0] Local list memories failed:", expect.any(Error))
		})
	})

	describe("Local Mode Health Check", () => {
		beforeEach(() => {
			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)
		})

		it("performs health check using Qdrant in local mode", async () => {
			mockQdrantClient.healthCheck.mockResolvedValue(true)

			const result = await health_check()

			expect(mockQdrantClient.healthCheck).toHaveBeenCalled()
			expect(result).toEqual({
				status: "ok",
				mode: "local",
				timestamp: expect.any(Number),
			})
		})

		it("returns error status when Qdrant health check fails", async () => {
			mockQdrantClient.healthCheck.mockResolvedValue(false)

			const result = await health_check()

			expect(result).toEqual({
				status: "error",
				mode: "unknown",
				timestamp: expect.any(Number),
			})
		})

		it("handles health check errors gracefully", async () => {
			mockQdrantClient.healthCheck.mockRejectedValue(new Error("Health check failed"))

			const result = await health_check()

			expect(result).toEqual({
				status: "error",
				mode: "unknown",
				timestamp: expect.any(Number),
			})
		})
	})

	describe("Local Mode Error Conditions", () => {
		it("returns null/false when Qdrant client not initialized", async () => {
			// Reset to clear any previous initialization
			resetMem0Config()

			// Create a fresh mock config manager for this test
			const errorConfigManager = {
				updateConfig: vi.fn(),
				getConfig: vi.fn().mockReturnValue({
					enabled: true,
					mode: "local",
					baseUrl: "http://localhost:4321",
				}),
				isEnabled: vi.fn().mockReturnValue(true),
				isValidConfiguration: vi.fn().mockReturnValue(true),
				isValidApiKey: vi.fn().mockReturnValue(false),
				getModeConfig: vi.fn().mockReturnValue({
					isLocal: true,
					isHosted: false,
					requiresApiKey: false,
				}),
				getQdrantConfig: vi.fn().mockReturnValue({
					enabled: false, // This will prevent Qdrant client initialization
					source: "none",
				}),
				getRequestHeaders: vi.fn().mockReturnValue({
					"Content-Type": "application/json",
				}),
				getBaseUrl: vi.fn().mockReturnValue("http://localhost:4321"),
			}

			MockedMem0ConfigManager.mockImplementation(() => errorConfigManager as any)

			configureMem0(
				{
					enabled: true,
					mode: "local",
				},
				mockEmbedder,
			)

			const searchResult = await search_memories("query", "user", "agent")
			const storeResult = await store_memory(["test"], "user", "agent")
			const getResult = await get_memory("mem_123")
			const deleteResult = await delete_memory("mem_123")
			const listResult = await list_memories("user", "agent")

			expect(searchResult).toBeNull()
			expect(storeResult).toBe(false)
			expect(getResult).toBeNull()
			expect(deleteResult).toBe(false)
			expect(listResult).toBeNull()

			expect(console.error).toHaveBeenCalledWith("[Mem0] Local mode not properly initialized")
		})

		it("returns null/false when embedder not provided", async () => {
			// Reset to clear any previous state
			resetMem0Config()

			// Reset mocks to default configuration that would normally work
			MockedMem0ConfigManager.mockImplementation(() => mockConfigManager as any)
			MockedMem0QdrantClient.mockImplementation(() => mockQdrantClient as any)

			configureMem0({
				enabled: true,
				mode: "local",
			}) // No embedder provided - this is the key difference

			const searchResult = await search_memories("query", "user", "agent")
			const storeResult = await store_memory(["test"], "user", "agent")

			expect(searchResult).toBeNull()
			expect(storeResult).toBe(false)

			expect(console.error).toHaveBeenCalledWith("[Mem0] Local mode not properly initialized")
		})
	})
})
