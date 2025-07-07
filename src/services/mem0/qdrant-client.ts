/**
 * Qdrant implementation for Mem0 memory storage
 * Provides local vector storage for memories when not using hosted mode
 */

import { QdrantClient, Schemas } from "@qdrant/js-client-rest"
import { createHash } from "crypto"
import { t } from "../../i18n"

export interface Mem0Memory {
	id: string
	content: string
	user_id: string
	agent_id: string
	metadata?: Record<string, any>
	created_at: string
	updated_at: string
	vector?: number[]
}

export interface Mem0SearchResult {
	id: string
	score: number
	payload: Mem0Memory
}

/**
 * Qdrant client for Mem0 memory storage operations
 */
export class Mem0QdrantClient {
	private client: QdrantClient
	private readonly collectionName: string
	private readonly qdrantUrl: string
	private readonly vectorSize = 1536 // Default vector size for text embeddings
	private readonly DISTANCE_METRIC = "Cosine"

	constructor(url: string, apiKey?: string, collectionName: string = "mem0_memories") {
		this.qdrantUrl = this.parseQdrantUrl(url)
		this.collectionName = collectionName

		try {
			const urlObj = new URL(this.qdrantUrl)

			// Determine port and protocol
			let port: number
			let useHttps: boolean

			if (urlObj.port) {
				port = Number(urlObj.port)
				useHttps = urlObj.protocol === "https:"
			} else {
				if (urlObj.protocol === "https:") {
					port = 443
					useHttps = true
				} else {
					port = 6333 // Default Qdrant port
					useHttps = false
				}
			}

			this.client = new QdrantClient({
				host: urlObj.hostname,
				https: useHttps,
				port: port,
				prefix: urlObj.pathname === "/" ? undefined : urlObj.pathname.replace(/\/+$/, ""),
				apiKey,
				headers: {
					"User-Agent": "Roo-Code-Mem0",
				},
			})
		} catch (urlError) {
			// Fallback for malformed URLs
			this.client = new QdrantClient({
				url: this.qdrantUrl,
				apiKey,
				headers: {
					"User-Agent": "Roo-Code-Mem0",
				},
			})
		}
	}

	/**
	 * Parse and normalize Qdrant URL
	 */
	private parseQdrantUrl(url: string): string {
		if (!url || url.trim() === "") {
			return "http://localhost:6333"
		}

		const trimmedUrl = url.trim()

		// Add protocol if missing
		if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://") && !trimmedUrl.includes("://")) {
			return trimmedUrl.includes(":") ? `http://${trimmedUrl}` : `http://${trimmedUrl}:6333`
		}

		return trimmedUrl
	}

	/**
	 * Initialize the Qdrant collection for memories
	 */
	async initialize(): Promise<boolean> {
		try {
			const collectionInfo = await this.getCollectionInfo()
			let created = false

			if (collectionInfo === null) {
				// Create new collection
				await this.client.createCollection(this.collectionName, {
					vectors: {
						size: this.vectorSize,
						distance: this.DISTANCE_METRIC,
					},
				})
				created = true
			} else {
				// Check vector size compatibility
				const existingVectorSize = collectionInfo.config?.params?.vectors?.size
				if (existingVectorSize !== this.vectorSize) {
					console.warn(
						`[Mem0QdrantClient] Collection ${this.collectionName} exists with vector size ${existingVectorSize}, but expected ${this.vectorSize}. Recreating collection.`,
					)
					await this.client.deleteCollection(this.collectionName)
					await this.client.createCollection(this.collectionName, {
						vectors: {
							size: this.vectorSize,
							distance: this.DISTANCE_METRIC,
						},
					})
					created = true
				}
			}

			// Create payload indexes for efficient filtering
			await this.createPayloadIndexes()

			return created
		} catch (error: any) {
			const errorMessage = error?.message || error
			console.error(
				`[Mem0QdrantClient] Failed to initialize Qdrant collection "${this.collectionName}":`,
				errorMessage,
			)
			throw new Error(
				t("embeddings:vectorStore.qdrantConnectionFailed", { qdrantUrl: this.qdrantUrl, errorMessage }),
			)
		}
	}

	/**
	 * Create payload indexes for efficient memory filtering
	 */
	private async createPayloadIndexes(): Promise<void> {
		const indexes = [
			{ field: "user_id", schema: "keyword" },
			{ field: "agent_id", schema: "keyword" },
			{ field: "created_at", schema: "datetime" },
			{ field: "updated_at", schema: "datetime" },
		]

		for (const index of indexes) {
			try {
				await this.client.createPayloadIndex(this.collectionName, {
					field_name: index.field,
					field_schema: index.schema as any,
				})
			} catch (indexError: any) {
				const errorMessage = (indexError?.message || "").toLowerCase()
				if (!errorMessage.includes("already exists")) {
					console.warn(
						`[Mem0QdrantClient] Could not create payload index for ${index.field} on ${this.collectionName}. Details:`,
						indexError?.message || indexError,
					)
				}
			}
		}
	}

	/**
	 * Get collection info
	 */
	private async getCollectionInfo(): Promise<Schemas["CollectionInfo"] | null> {
		try {
			const collectionInfo = await this.client.getCollection(this.collectionName)
			return collectionInfo
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.warn(
					`[Mem0QdrantClient] Warning during getCollectionInfo for "${this.collectionName}". Collection may not exist:`,
					error.message,
				)
			}
			return null
		}
	}

	/**
	 * Store a memory in the vector database
	 */
	async storeMemory(memory: Mem0Memory): Promise<void> {
		if (!memory.vector || memory.vector.length !== this.vectorSize) {
			throw new Error("Memory must have a valid vector of the correct size")
		}

		try {
			await this.client.upsert(this.collectionName, {
				points: [
					{
						id: memory.id,
						vector: memory.vector,
						payload: {
							content: memory.content,
							user_id: memory.user_id,
							agent_id: memory.agent_id,
							metadata: memory.metadata || {},
							created_at: memory.created_at,
							updated_at: memory.updated_at,
						},
					},
				],
				wait: true,
			})
		} catch (error) {
			console.error("Failed to store memory:", error)
			throw error
		}
	}

	/**
	 * Search for memories using vector similarity
	 */
	async searchMemories(
		queryVector: number[],
		userId: string,
		agentId: string,
		limit: number = 10,
		minScore: number = 0.7,
	): Promise<Mem0SearchResult[]> {
		try {
			const filter = {
				must: [
					{
						key: "user_id",
						match: { value: userId },
					},
					{
						key: "agent_id",
						match: { value: agentId },
					},
				],
			}

			const searchRequest = {
				query: queryVector,
				filter,
				score_threshold: minScore,
				limit,
				params: {
					hnsw_ef: 128,
					exact: false,
				},
				with_payload: true,
			}

			const operationResult = await this.client.query(this.collectionName, searchRequest)

			return operationResult.points.map((point) => ({
				id: point.id as string,
				score: point.score || 0,
				payload: {
					id: point.id as string,
					content: (point.payload as any).content,
					user_id: (point.payload as any).user_id,
					agent_id: (point.payload as any).agent_id,
					metadata: (point.payload as any).metadata || {},
					created_at: (point.payload as any).created_at,
					updated_at: (point.payload as any).updated_at,
				},
			}))
		} catch (error) {
			console.error("Failed to search memories:", error)
			throw error
		}
	}

	/**
	 * Get a specific memory by ID
	 */
	async getMemory(memoryId: string): Promise<Mem0Memory | null> {
		try {
			const result = await this.client.retrieve(this.collectionName, {
				ids: [memoryId],
				with_payload: true,
			})

			if (result.length === 0) {
				return null
			}

			const point = result[0]
			return {
				id: point.id as string,
				content: (point.payload as any).content,
				user_id: (point.payload as any).user_id,
				agent_id: (point.payload as any).agent_id,
				metadata: (point.payload as any).metadata || {},
				created_at: (point.payload as any).created_at,
				updated_at: (point.payload as any).updated_at,
			}
		} catch (error) {
			console.error("Failed to get memory:", error)
			throw error
		}
	}

	/**
	 * Delete a memory by ID
	 */
	async deleteMemory(memoryId: string): Promise<boolean> {
		try {
			await this.client.delete(this.collectionName, {
				points: [memoryId],
				wait: true,
			})
			return true
		} catch (error) {
			console.error("Failed to delete memory:", error)
			return false
		}
	}

	/**
	 * List memories for a user/agent combination
	 */
	async listMemories(userId: string, agentId: string, limit: number = 100): Promise<Mem0Memory[]> {
		try {
			const filter = {
				must: [
					{
						key: "user_id",
						match: { value: userId },
					},
					{
						key: "agent_id",
						match: { value: agentId },
					},
				],
			}

			// Use scroll to get all matching points
			const scrollResult = await this.client.scroll(this.collectionName, {
				filter,
				limit,
				with_payload: true,
			})

			return scrollResult.points.map((point) => ({
				id: point.id as string,
				content: (point.payload as any).content,
				user_id: (point.payload as any).user_id,
				agent_id: (point.payload as any).agent_id,
				metadata: (point.payload as any).metadata || {},
				created_at: (point.payload as any).created_at,
				updated_at: (point.payload as any).updated_at,
			}))
		} catch (error) {
			console.error("Failed to list memories:", error)
			throw error
		}
	}

	/**
	 * Check if the collection exists
	 */
	async collectionExists(): Promise<boolean> {
		const collectionInfo = await this.getCollectionInfo()
		return collectionInfo !== null
	}

	/**
	 * Health check for Qdrant connection
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.getCollections()
			return true
		} catch (error) {
			console.error("Qdrant health check failed:", error)
			return false
		}
	}
}
