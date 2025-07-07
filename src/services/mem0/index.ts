// Re-export main client functions for backward compatibility
export {
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
} from "./client"

// Export configuration and error types
export type { Mem0Config, Mem0QdrantConfig } from "./config"
export { Mem0ConfigManager, MEM0_API_KEY_REGEX, DEFAULT_CONFIG, ENV_VARS } from "./config"

// Export error classes
export {
	Mem0Error,
	Mem0InvalidApiKeyError,
	Mem0ConfigurationError,
	Mem0ApiError,
	Mem0NotInitializedError,
	Mem0HostedModeError,
	Mem0NetworkError,
	isMem0Error,
	formatMem0Error,
	isApiKeyError,
	isConfigurationError,
} from "./errors"
