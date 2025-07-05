import * as vscode from "vscode"
import { OpenAiEmbedder } from "./embedders/openai"
import { CodeIndexOllamaEmbedder } from "./embedders/ollama"
import { OpenAICompatibleEmbedder } from "./embedders/openai-compatible"
import { GeminiEmbedder } from "./embedders/gemini"
import { EmbedderProvider, getDefaultModelId, getModelDimension } from "../../shared/embeddingModels"
import { QdrantVectorStore } from "./vector-store/qdrant-client"
import { DirectoryScanner, FileWatcher } from "./processors"
import { codeParser } from "./processors/parser"
import { jupyterProcessor } from "./processors/jupyter-processor"
import { CompositeCodeParser } from "./processors/composite-parser"
import { ICodeParser, IEmbedder, IFileWatcher, IVectorStore } from "./interfaces"
import { CodeIndexConfigManager } from "./config-manager"
import { CacheManager } from "./cache-manager"
import { Ignore } from "ignore"

/**
 * Factory class responsible for creating and configuring code indexing service dependencies.
 */
export class CodeIndexServiceFactory {
	constructor(
		private readonly configManager: CodeIndexConfigManager,
		private readonly workspacePath: string,
		private readonly cacheManager: CacheManager,
	) {}

	/**
	 * Creates an embedder instance based on the current configuration.
	 */
	public createEmbedder(): IEmbedder {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider

		if (provider === "openai") {
			const apiKey = config.openAiOptions?.openAiNativeApiKey

			if (!apiKey) {
				throw new Error("OpenAI configuration missing for embedder creation")
			}
			return new OpenAiEmbedder({
				...config.openAiOptions,
				openAiEmbeddingModelId: config.modelId,
			})
		} else if (provider === "ollama") {
			if (!config.ollamaOptions?.ollamaBaseUrl) {
				throw new Error("Ollama configuration missing for embedder creation")
			}
			return new CodeIndexOllamaEmbedder({
				...config.ollamaOptions,
				ollamaModelId: config.modelId,
			})
		} else if (provider === "openai-compatible") {
			if (!config.openAiCompatibleOptions?.baseUrl || !config.openAiCompatibleOptions?.apiKey) {
				throw new Error("OpenAI Compatible configuration missing for embedder creation")
			}
			return new OpenAICompatibleEmbedder(
				config.openAiCompatibleOptions.baseUrl,
				config.openAiCompatibleOptions.apiKey,
				config.modelId,
			)
		} else if (provider === "gemini") {
			if (!config.geminiOptions?.apiKey) {
				throw new Error("Gemini configuration missing for embedder creation")
			}
			return new GeminiEmbedder(config.geminiOptions.apiKey)
		}

		throw new Error(`Invalid embedder type configured: ${config.embedderProvider}`)
	}

	/**
	 * Creates a vector store instance using the current configuration.
	 */
	public createVectorStore(): IVectorStore {
		const config = this.configManager.getConfig()

		const provider = config.embedderProvider as EmbedderProvider
		const defaultModel = getDefaultModelId(provider)
		// Use the embedding model ID from config, not the chat model IDs
		const modelId = config.modelId ?? defaultModel

		let vectorSize: number | undefined

		if (provider === "openai-compatible") {
			if (config.openAiCompatibleOptions?.modelDimension && config.openAiCompatibleOptions.modelDimension > 0) {
				vectorSize = config.openAiCompatibleOptions.modelDimension
			} else {
				// Fallback if not provided or invalid in openAiCompatibleOptions
				vectorSize = getModelDimension(provider, modelId)
			}
		} else if (provider === "gemini") {
			// Gemini's text-embedding-004 has a fixed dimension of 768
			vectorSize = 768
		} else {
			vectorSize = getModelDimension(provider, modelId)
		}

		if (vectorSize === undefined) {
			let errorMessage = `Could not determine vector dimension for model '${modelId}' with provider '${provider}'. `
			if (provider === "openai-compatible") {
				errorMessage += `Please ensure the 'Embedding Dimension' is correctly set in the OpenAI-Compatible provider settings.`
			} else {
				errorMessage += `Check model profiles or configuration.`
			}
			throw new Error(errorMessage)
		}

		if (!config.qdrantUrl) {
			// This check remains important
			throw new Error("Qdrant URL missing for vector store creation")
		}

		// Assuming constructor is updated: new QdrantVectorStore(workspacePath, url, vectorSize, apiKey?)
		return new QdrantVectorStore(this.workspacePath, config.qdrantUrl, vectorSize, config.qdrantApiKey)
	}

	/**
	 * Creates a directory scanner instance with its required dependencies.
	 */
	public createDirectoryScanner(
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		parser: ICodeParser,
		ignoreInstance: Ignore,
	): DirectoryScanner {
		return new DirectoryScanner(embedder, vectorStore, parser, this.cacheManager, ignoreInstance)
	}

	/**
	 * Creates a composite parser instance.
	 */
	public createParser(): ICodeParser {
		return new CompositeCodeParser([codeParser, jupyterProcessor])
	}

	/**
	 * Creates a file watcher instance with its required dependencies.
	 */
	public createFileWatcher(
		context: vscode.ExtensionContext,
		embedder: IEmbedder,
		vectorStore: IVectorStore,
		parser: ICodeParser,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
	): IFileWatcher {
		return new FileWatcher(this.workspacePath, context, cacheManager, embedder, vectorStore, parser, ignoreInstance)
	}

	/**
	 * Creates all required service dependencies if the service is properly configured.
	 * @throws Error if the service is not properly configured
	 */
	public createServices(
		context: vscode.ExtensionContext,
		cacheManager: CacheManager,
		ignoreInstance: Ignore,
	): {
		embedder: IEmbedder
		vectorStore: IVectorStore
		parser: ICodeParser
		scanner: DirectoryScanner
		fileWatcher: IFileWatcher
	} {
		if (!this.configManager.isFeatureConfigured) {
			throw new Error("Cannot create services: Code indexing is not properly configured")
		}

		const embedder = this.createEmbedder()
		const vectorStore = this.createVectorStore()
		const parser = this.createParser()
		const scanner = this.createDirectoryScanner(embedder, vectorStore, parser, ignoreInstance)
		const fileWatcher = this.createFileWatcher(context, embedder, vectorStore, parser, cacheManager, ignoreInstance)

		return {
			embedder,
			vectorStore,
			parser,
			scanner,
			fileWatcher,
		}
	}
}
