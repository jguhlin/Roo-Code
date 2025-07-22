import { Anthropic } from "@anthropic-ai/sdk"

import type { ProviderSettings, ModelInfo } from "@roo-code/types"

import { ApiStream } from "./transform/stream"

import {
	GlamaHandler,
	AnthropicHandler,
	AwsBedrockHandler,
	OpenRouterHandler,
	VertexHandler,
	AnthropicVertexHandler,
	OpenAiHandler,
	OllamaHandler,
	LmStudioHandler,
	GeminiHandler,
	OpenAiNativeHandler,
	DeepSeekHandler,
	MoonshotHandler,
	MistralHandler,
	VsCodeLmHandler,
	UnboundHandler,
	RequestyHandler,
	HumanRelayHandler,
	FakeAIHandler,
	XAIHandler,
	GroqHandler,
	ChutesHandler,
	LiteLLMHandler,
	ClaudeCodeHandler,
} from "./providers"

export interface SingleCompletionHandler {
	completePrompt(prompt: string): Promise<string>
}

export interface ApiHandlerCreateMessageMetadata {
	mode?: string
	taskId: string
}

export interface ApiHandler {
	createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream

	getModel(): { id: string; info: ModelInfo }

	/**
	 * Counts tokens for content blocks
	 * All providers extend BaseProvider which provides a default tiktoken implementation,
	 * but they can override this to use their native token counting endpoints
	 *
	 * @param content The content to count tokens for
	 * @returns A promise resolving to the token count
	 */
	countTokens(content: Array<Anthropic.Messages.ContentBlockParam>): Promise<number>
}

export function buildApiHandler(configuration: ProviderSettings & { sessionId?: string }): ApiHandler {
	const { apiProvider, sessionId, ...options } = configuration

	switch (apiProvider) {
		case "anthropic":
			return new AnthropicHandler({ ...options, sessionId })
		case "claude-code":
			return new ClaudeCodeHandler({ ...options, sessionId })
		case "glama":
			return new GlamaHandler({ ...options, sessionId })
		case "openrouter":
			return new OpenRouterHandler({ ...options, sessionId })
		case "bedrock":
			return new AwsBedrockHandler({ ...options, sessionId })
		case "vertex":
			return options.apiModelId?.startsWith("claude")
				? new AnthropicVertexHandler({ ...options, sessionId })
				: new VertexHandler({ ...options, sessionId })
		case "openai":
			return new OpenAiHandler({ ...options, sessionId })
		case "ollama":
			return new OllamaHandler({ ...options, sessionId })
		case "lmstudio":
			return new LmStudioHandler({ ...options, sessionId })
		case "gemini":
			return new GeminiHandler({ ...options, sessionId })
		case "openai-native":
			return new OpenAiNativeHandler({ ...options, sessionId })
		case "deepseek":
			return new DeepSeekHandler({ ...options, sessionId })
		case "moonshot":
			return new MoonshotHandler({ ...options, sessionId })
		case "vscode-lm":
			return new VsCodeLmHandler({ ...options, sessionId })
		case "mistral":
			return new MistralHandler({ ...options, sessionId })
		case "unbound":
			return new UnboundHandler({ ...options, sessionId })
		case "requesty":
			return new RequestyHandler({ ...options, sessionId })
		case "human-relay":
			return new HumanRelayHandler()
		case "fake-ai":
			return new FakeAIHandler({ ...options, sessionId })
		case "xai":
			return new XAIHandler({ ...options, sessionId })
		case "groq":
			return new GroqHandler({ ...options, sessionId })
		case "chutes":
			return new ChutesHandler({ ...options, sessionId })
		case "litellm":
			return new LiteLLMHandler({ ...options, sessionId })
		default:
			apiProvider satisfies "gemini-cli" | undefined
			return new AnthropicHandler({ ...options, sessionId })
	}
}
