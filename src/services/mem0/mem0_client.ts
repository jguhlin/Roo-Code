import axios from "axios"

let cachedBaseUrl: string | undefined
let cachedEnabled: boolean | undefined

export function configureMem0(options: { enabled: boolean; baseUrl?: string }) {
    cachedEnabled = options.enabled
    cachedBaseUrl = options.baseUrl
}

function getBaseUrl() {
    return cachedBaseUrl?.replace(/\/$/, "")
}

export async function search_memories(query: string, user_id: string, agent_id: string) {
    if (!cachedEnabled || !cachedBaseUrl) return null
    try {
        const { data } = await axios.post(`${getBaseUrl()}/search`, {
            query,
            user_id,
            agent_id,
        })
        return data
    } catch (error) {
        console.error("[Mem0] search_memories error", error)
        return null
    }
}

export async function store_memory(
    messages: any[],
    user_id: string,
    agent_id: string,
    metadata?: Record<string, any>,
) {
    if (!cachedEnabled || !cachedBaseUrl) return
    try {
        await axios.post(`${getBaseUrl()}/memories`, {
            messages,
            user_id,
            agent_id,
            metadata,
        })
    } catch (error) {
        console.error("[Mem0] store_memory error", error)
    }
}
