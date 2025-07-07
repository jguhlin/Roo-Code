/**
 * Mem0 API Client
 * Enhanced client with configuration management, error handling, and mode switching
 */

import axios, { type AxiosError } from "axios"
import { Mem0ConfigManager, type Mem0Config } from "./config"
import {
	Mem0ApiError,
	Mem0InvalidApiKeyError,
	Mem0NetworkError,
	Mem0NotInitializedError,
	Mem0HostedModeError,
	formatMem0Error,
} from "./errors"
import { Mem0QdrantClient, type Mem0Memory, type Mem0SearchResult } from "./qdrant-client"
import { IEmbedder } from "../code-index/interfaces/embedder"

/**
 * Global configuration manager instance
 */
let configManager: Mem0ConfigManager | null = null

/**
 * Global Qdrant client for local mode
 */
let qdrantClient: Mem0QdrantClient | null = null

/**
 * Global embedder for local mode
 */
let embedder: IEmbedder | null = null

/**
 * Initialize or update Mem0 configuration
 */
export function configureMem0(options: Partial<Mem0Config> & { enabled: boolean }, localEmbedder?: IEmbedder): void {
	if (!configManager) {
		configManager = new Mem0ConfigManager()
	}

	configManager.updateConfig(options)

	// Validate configuration after update
	if (options.enabled && !configManager.isValidConfiguration()) {
		const config = configManager.getConfig()
		if (config.mode === "hosted" && !configManager.isValidApiKey(config.apiKey)) {
			throw new Mem0InvalidApiKeyError(config.apiKey)
		}
	}

	// Initialize local mode components if needed
	if (options.enabled && configManager.getConfig().mode === "local") {
		initializeLocalMode(localEmbedder)
	}
}

/**
 * Initialize local mode with Qdrant client
 */
async function initializeLocalMode(localEmbedder?: IEmbedder): Promise<void> {
	if (!configManager) {
		throw new Mem0NotInitializedError()
	}

	const qdrantConfig = configManager.getQdrantConfig()

	if (!qdrantConfig.enabled) {
		console.warn("[Mem0] Local mode requested but no Qdrant configuration available")
		return
	}

	try {
		// Initialize Qdrant client
		qdrantClient = new Mem0QdrantClient(qdrantConfig.url!, qdrantConfig.apiKey, qdrantConfig.collection)

		// Store embedder for local operations
		if (localEmbedder) {
			embedder = localEmbedder
		}

		// Initialize the collection
		await qdrantClient.initialize()

		console.log(`[Mem0] Local mode initialized with Qdrant at ${qdrantConfig.url}`)
	} catch (error) {
		console.error("[Mem0] Failed to initialize local mode:", error)
		throw error
	}
}

/**
 * Get current configuration manager
 */
function getConfigManager(): Mem0ConfigManager {
	if (!configManager) {
		throw new Mem0NotInitializedError()
	}
	return configManager
}

/**
 * Check if service is enabled and configured
 */
function isServiceReady(): boolean {
	try {
		const manager = getConfigManager()
		return manager.isEnabled()
	} catch {
		return false
	}
}

/**
 * Get current mode information
 */
export function getMem0Mode(): { mode: "local" | "hosted"; isEnabled: boolean } {
	try {
		const manager = getConfigManager()
		const config = manager.getConfig()
		return {
			mode: config.mode,
			isEnabled: manager.isEnabled(),
		}
	} catch {
		return { mode: "local", isEnabled: false }
	}
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): boolean {
	const manager = getConfigManager()
	return manager.isValidApiKey(apiKey)
}

/**
 * Make HTTP request with proper error handling
 */
async function makeRequest<T>(method: "GET" | "POST" | "PUT" | "DELETE", endpoint: string, data?: any): Promise<T> {
	const manager = getConfigManager()
	const baseUrl = manager.getBaseUrl()
	const headers = manager.getRequestHeaders()

	if (!baseUrl) {
		throw new Mem0ApiError("Base URL not configured")
	}

	try {
		const response = await axios({
			method,
			url: `${baseUrl}${endpoint}`,
			data,
			headers,
			timeout: 30000, // 30 second timeout
		})

		return response.data
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const axiosError = error as AxiosError

			if (axiosError.response) {
				// API returned an error response
				const statusCode = axiosError.response.status
				const responseData = axiosError.response.data

				if (statusCode === 401 || statusCode === 403) {
					throw new Mem0InvalidApiKeyError()
				}

				throw new Mem0ApiError(`API request failed: ${axiosError.message}`, statusCode, responseData)
			} else if (axiosError.request) {
				// Network error
				throw new Mem0NetworkError(axiosError)
			}
		}

		// Unknown error
		throw new Mem0NetworkError(error as Error)
	}
}

/**
 * Search memories with enhanced error handling
 */
export async function search_memories(query: string, user_id: string, agent_id: string): Promise<any[] | null> {
	if (!isServiceReady()) {
		return null
	}

	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			const data = await makeRequest<any[]>("POST", "/search", {
				query,
				user_id,
				agent_id,
			})

			return Array.isArray(data) ? data : []
		} else {
			// Local mode with Qdrant
			return await searchMemoriesLocal(query, user_id, agent_id)
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return null
	}
}

/**
 * Search memories using local Qdrant storage
 */
async function searchMemoriesLocal(query: string, user_id: string, agent_id: string): Promise<any[] | null> {
	if (!qdrantClient || !embedder) {
		console.error("[Mem0] Local mode not properly initialized")
		return null
	}

	try {
		// Create embedding for the query
		const embeddingResponse = await embedder.createEmbeddings([query])
		if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
			console.error("[Mem0] Failed to create embedding for query")
			return null
		}

		const queryVector = embeddingResponse.embeddings[0]

		// Search for similar memories
		const searchResults = await qdrantClient.searchMemories(
			queryVector,
			user_id,
			agent_id,
			10, // limit
			0.7, // min score
		)

		// Convert to expected format
		return searchResults.map((result) => ({
			id: result.id,
			content: result.payload.content,
			score: result.score,
			user_id: result.payload.user_id,
			agent_id: result.payload.agent_id,
			metadata: result.payload.metadata,
			created_at: result.payload.created_at,
			updated_at: result.payload.updated_at,
		}))
	} catch (error) {
		console.error("[Mem0] Local search failed:", error)
		return null
	}
}

/**
 * Store memory with enhanced error handling
 */
export async function store_memory(
	messages: any[],
	user_id: string,
	agent_id: string,
	metadata?: Record<string, any>,
): Promise<boolean> {
	if (!isServiceReady()) {
		return false
	}

	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			await makeRequest("POST", "/memories", {
				messages,
				user_id,
				agent_id,
				metadata,
			})

			return true
		} else {
			// Local mode with Qdrant
			return await storeMemoryLocal(messages, user_id, agent_id, metadata)
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return false
	}
}

/**
 * Store memory using local Qdrant storage
 */
async function storeMemoryLocal(
	messages: any[],
	user_id: string,
	agent_id: string,
	metadata?: Record<string, any>,
): Promise<boolean> {
	if (!qdrantClient || !embedder) {
		console.error("[Mem0] Local mode not properly initialized")
		return false
	}

	try {
		// Extract content from messages for embedding
		const content = messages
			.map((msg) => (typeof msg === "string" ? msg : msg.content || JSON.stringify(msg)))
			.join(" ")

		// Create embedding for the content
		const embeddingResponse = await embedder.createEmbeddings([content])
		if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
			console.error("[Mem0] Failed to create embedding for memory content")
			return false
		}

		const vector = embeddingResponse.embeddings[0]
		const now = new Date().toISOString()

		// Create memory object
		const memory: Mem0Memory = {
			id: generateMemoryId(),
			content,
			user_id,
			agent_id,
			metadata: metadata || {},
			created_at: now,
			updated_at: now,
			vector,
		}

		// Store in Qdrant
		await qdrantClient.storeMemory(memory)

		return true
	} catch (error) {
		console.error("[Mem0] Local memory storage failed:", error)
		return false
	}
}

/**
 * Generate a unique memory ID
 */
function generateMemoryId(): string {
	return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get memory by ID
 */
export async function get_memory(memory_id: string): Promise<any | null> {
	if (!isServiceReady()) {
		return null
	}

	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			const data = await makeRequest("GET", `/memories/${memory_id}`)
			return data
		} else {
			// Local mode with Qdrant
			return await getMemoryLocal(memory_id)
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return null
	}
}

/**
 * Get memory using local Qdrant storage
 */
async function getMemoryLocal(memory_id: string): Promise<any | null> {
	if (!qdrantClient) {
		console.error("[Mem0] Local mode not properly initialized")
		return null
	}

	try {
		const memory = await qdrantClient.getMemory(memory_id)
		if (!memory) {
			return null
		}

		// Convert to expected format
		return {
			id: memory.id,
			content: memory.content,
			user_id: memory.user_id,
			agent_id: memory.agent_id,
			metadata: memory.metadata,
			created_at: memory.created_at,
			updated_at: memory.updated_at,
		}
	} catch (error) {
		console.error("[Mem0] Local get memory failed:", error)
		return null
	}
}

/**
 * Delete memory by ID
 */
export async function delete_memory(memory_id: string): Promise<boolean> {
	if (!isServiceReady()) {
		return false
	}

	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			await makeRequest("DELETE", `/memories/${memory_id}`)
			return true
		} else {
			// Local mode with Qdrant
			return await deleteMemoryLocal(memory_id)
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return false
	}
}

/**
 * Delete memory using local Qdrant storage
 */
async function deleteMemoryLocal(memory_id: string): Promise<boolean> {
	if (!qdrantClient) {
		console.error("[Mem0] Local mode not properly initialized")
		return false
	}

	try {
		await qdrantClient.deleteMemory(memory_id)
		return true
	} catch (error) {
		console.error("[Mem0] Local delete memory failed:", error)
		return false
	}
}

/**
 * List all memories for a user/agent
 */
export async function list_memories(user_id: string, agent_id: string, limit?: number): Promise<any[] | null> {
	if (!isServiceReady()) {
		return null
	}

	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			const params = new URLSearchParams({
				user_id,
				agent_id,
				...(limit && { limit: limit.toString() }),
			})

			const data = await makeRequest<any[]>("GET", `/memories?${params}`)
			return Array.isArray(data) ? data : []
		} else {
			// Local mode with Qdrant
			return await listMemoriesLocal(user_id, agent_id, limit)
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return null
	}
}

/**
 * List memories using local Qdrant storage
 */
async function listMemoriesLocal(user_id: string, agent_id: string, limit?: number): Promise<any[] | null> {
	if (!qdrantClient) {
		console.error("[Mem0] Local mode not properly initialized")
		return null
	}

	try {
		const memories = await qdrantClient.listMemories(user_id, agent_id, limit)

		// Convert to expected format
		return memories.map((memory) => ({
			id: memory.id,
			content: memory.content,
			user_id: memory.user_id,
			agent_id: memory.agent_id,
			metadata: memory.metadata,
			created_at: memory.created_at,
			updated_at: memory.updated_at,
		}))
	} catch (error) {
		console.error("[Mem0] Local list memories failed:", error)
		return null
	}
}

/**
 * Health check endpoint
 */
export async function health_check(): Promise<{ status: "ok" | "error"; mode: string; timestamp: number }> {
	try {
		const manager = getConfigManager()
		const config = manager.getConfig()

		if (!isServiceReady()) {
			return {
				status: "error",
				mode: config.mode,
				timestamp: Date.now(),
			}
		}

		if (config.mode === "hosted") {
			// Check if hosted mode is properly configured
			if (!manager.isValidApiKey(config.apiKey)) {
				throw new Mem0HostedModeError()
			}

			await makeRequest("GET", "/health")
		} else {
			// Local mode health check
			if (!qdrantClient) {
				throw new Error("Qdrant client not initialized")
			}

			const isHealthy = await qdrantClient.healthCheck()
			if (!isHealthy) {
				throw new Error("Qdrant health check failed")
			}
		}

		return {
			status: "ok",
			mode: config.mode,
			timestamp: Date.now(),
		}
	} catch (error) {
		console.error(formatMem0Error(error))
		return {
			status: "error",
			mode: "unknown",
			timestamp: Date.now(),
		}
	}
}

/**
 * Reset configuration (for testing)
 */
export function resetMem0Config(): void {
	configManager = null
	qdrantClient = null
	embedder = null
}
