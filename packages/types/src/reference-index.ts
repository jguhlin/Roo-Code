import { z } from "zod"

/**
 * Reference Index Constants
 */
export const REFERENCE_INDEX_DEFAULTS = {
	MIN_SEARCH_RESULTS: 10,
	MAX_SEARCH_RESULTS: 200,
	DEFAULT_SEARCH_RESULTS: 50,
	SEARCH_RESULTS_STEP: 10,
	DEFAULT_SEARCH_MIN_SCORE: 0.4,
} as const

/**
 * ReferenceIndexConfig
 */

export const referenceIndexConfigSchema = z.object({
	referenceIndexEnabled: z.boolean().optional(),
	referenceIndexRootPath: z.string().optional(),
	referenceIndexQdrantUrl: z.string().optional(),
	referenceIndexEmbedderProvider: z.enum(["openai", "ollama", "openai-compatible", "gemini"]).optional(),
	referenceIndexEmbedderBaseUrl: z.string().optional(),
	referenceIndexEmbedderModelId: z.string().optional(),
	referenceIndexSearchMinScore: z.number().min(0).max(1).optional(),
	referenceIndexSearchMaxResults: z
		.number()
		.min(REFERENCE_INDEX_DEFAULTS.MIN_SEARCH_RESULTS)
		.max(REFERENCE_INDEX_DEFAULTS.MAX_SEARCH_RESULTS)
		.optional(),
})

export type ReferenceIndexConfig = z.infer<typeof referenceIndexConfigSchema>

/**
 * CodebaseIndexModels
 */

export const referenceIndexModelsSchema = z.object({
	openai: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	ollama: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	"openai-compatible": z.record(z.string(), z.object({ dimension: z.number() })).optional(),
	gemini: z.record(z.string(), z.object({ dimension: z.number() })).optional(),
})

export type ReferenceIndexModels = z.infer<typeof referenceIndexModelsSchema>

/**
 * CdebaseIndexProvider
 */

export const referenceIndexProviderSchema = z.object({
	codeIndexOpenAiKey: z.string().optional(),
	codeIndexQdrantApiKey: z.string().optional(),
	referenceIndexOpenAiCompatibleBaseUrl: z.string().optional(),
	referenceIndexOpenAiCompatibleApiKey: z.string().optional(),
	referenceIndexOpenAiCompatibleModelDimension: z.number().optional(),
	referenceIndexGeminiApiKey: z.string().optional(),
})

export type ReferenceIndexProvider = z.infer<typeof referenceIndexProviderSchema>
