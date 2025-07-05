import { describe, it, expect, vi } from "vitest"
import axios from "axios"
import { configureMem0, search_memories, store_memory } from "../mem0_client"

vi.mock("axios")
const mockedAxios = axios as unknown as { post: vi.Mock }

mockedAxios.post = vi.fn()

describe("mem0 client", () => {
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
        expect(mockedAxios.post).toHaveBeenCalledWith("http://x/memories", {
            messages: [],
            user_id: "u",
            agent_id: "a",
            metadata: undefined,
        })
    })
})
