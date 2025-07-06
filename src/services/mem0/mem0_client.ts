import axios from "axios"

let cachedBaseUrl: string | undefined
let cachedEnabled: boolean | undefined
let cachedApiKey: string | undefined

export function configureMem0(options: { enabled: boolean; baseUrl?: string; apiKey?: string }) {
	cachedEnabled = options.enabled
	cachedBaseUrl = options.baseUrl
	cachedApiKey = options.apiKey
}

function getBaseUrl() {
	return cachedBaseUrl?.replace(/\/$/, "")
}

function getHeaders() {
	const headers: Record<string, string> = {}
	if (cachedApiKey) {
		headers["api-key"] = cachedApiKey
		headers["Authorization"] = `Bearer ${cachedApiKey}`
	}
	return headers
}

export async function search_memories(query: string, user_id: string, agent_id: string) {
	if (!cachedEnabled || !cachedBaseUrl) return null
	try {
		const { data } = await axios.post(
			`${getBaseUrl()}/search`,
			{
				query,
				user_id,
				agent_id,
			},
			{ headers: getHeaders() },
		)
		return data
	} catch (error) {
		console.error("[Mem0] search_memories error", error)
		return null
	}
}

export async function store_memory(messages: any[], user_id: string, agent_id: string, metadata?: Record<string, any>) {
	if (!cachedEnabled || !cachedBaseUrl) return
	try {
		await axios.post(
			`${getBaseUrl()}/memories`,
			{
				messages,
				user_id,
				agent_id,
				metadata,
			},
			{ headers: getHeaders() },
		)
	} catch (error) {
		console.error("[Mem0] store_memory error", error)
	}
}
