import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import axios from "axios"
import { configureMem0, search_memories, store_memory } from "../mem0_client"

vi.mock("axios")
const mockedAxios = axios as unknown as { post: Mock }

mockedAxios.post = vi.fn()

describe("mem0 client - legacy compatibility", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("search_memories skips when disabled", async () => {
		configureMem0({ enabled: false })
		const res = await search_memories("q", "u", "a")
		expect(res).toBeNull()
		expect(mockedAxios.post).not.toHaveBeenCalled()
	})

	it("store_memory sends request when enabled", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x" })
		mockedAxios.post.mockResolvedValue({ data: [] })
		await store_memory([], "u", "a")
		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://x/memories",
			{
				messages: [],
				user_id: "u",
				agent_id: "a",
				metadata: undefined,
			},
			{ headers: {} },
		)
	})

	it("store_memory includes api key when provided", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x", apiKey: "key" })
		mockedAxios.post.mockResolvedValue({ data: [] })
		await store_memory([], "u", "a")
		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://x/memories",
			{
				messages: [],
				user_id: "u",
				agent_id: "a",
				metadata: undefined,
			},
			{ headers: { "api-key": "key", Authorization: "Bearer key" } },
		)
	})

	it("handles search_memories with valid response", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x" })
		const mockData = [{ id: 1, content: "test memory" }]
		mockedAxios.post.mockResolvedValue({ data: mockData })

		const res = await search_memories("test query", "user1", "agent1")
		expect(res).toEqual(mockData)
		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://x/search",
			{
				query: "test query",
				user_id: "user1",
				agent_id: "agent1",
			},
			{ headers: {} },
		)
	})

	it("handles errors gracefully", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x" })
		mockedAxios.post.mockRejectedValue(new Error("Network error"))

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		const res = await search_memories("query", "user", "agent")
		expect(res).toBeNull()
		expect(consoleSpy).toHaveBeenCalled()

		consoleSpy.mockRestore()
	})

	it("handles store_memory errors gracefully", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x" })
		mockedAxios.post.mockRejectedValue(new Error("Network error"))

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

		await store_memory([], "user", "agent")
		expect(consoleSpy).toHaveBeenCalled()

		consoleSpy.mockRestore()
	})

	it("strips trailing slash from baseUrl", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x/" })
		mockedAxios.post.mockResolvedValue({ data: [] })

		await store_memory([], "u", "a")
		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://x/memories", // Note: slash should be stripped
			expect.any(Object),
			expect.any(Object),
		)
	})

	it("skips search when no baseUrl provided", async () => {
		configureMem0({ enabled: true })
		const res = await search_memories("q", "u", "a")
		expect(res).toBeNull()
		expect(mockedAxios.post).not.toHaveBeenCalled()
	})

	it("skips store when no baseUrl provided", async () => {
		configureMem0({ enabled: true })
		await store_memory([], "u", "a")
		expect(mockedAxios.post).not.toHaveBeenCalled()
	})

	it("includes metadata in store_memory request", async () => {
		configureMem0({ enabled: true, baseUrl: "http://x" })
		mockedAxios.post.mockResolvedValue({ data: [] })

		const metadata = { session: "test", timestamp: 123456 }
		await store_memory([], "u", "a", metadata)

		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://x/memories",
			{
				messages: [],
				user_id: "u",
				agent_id: "a",
				metadata,
			},
			{ headers: {} },
		)
	})

	it("maintains backward compatibility with legacy client", async () => {
		// Test that old client still works as expected
		const legacyConfig = {
			enabled: true,
			baseUrl: "http://legacy-server",
			apiKey: "legacy-key",
		}

		configureMem0(legacyConfig)
		mockedAxios.post.mockResolvedValue({ data: { success: true } })

		await store_memory([{ role: "user", content: "test" }], "user", "agent")

		expect(mockedAxios.post).toHaveBeenCalledWith(
			"http://legacy-server/memories",
			expect.objectContaining({
				messages: [{ role: "user", content: "test" }],
				user_id: "user",
				agent_id: "agent",
			}),
			{ headers: { "api-key": "legacy-key", Authorization: "Bearer legacy-key" } },
		)
	})
})
