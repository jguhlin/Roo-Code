import * as vscode from "vscode"

import { Task } from "../task/Task"
import { ReferenceIndexManager } from "../../services/reference-index/manager"
import { formatResponse } from "../prompts/responses"
import { VectorStoreSearchResult } from "../../services/reference-index/interfaces"
import { AskApproval, HandleError, PushToolResult, RemoveClosingTag, ToolUse } from "../../shared/tools"
import path from "path"

export async function referenceSearchTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const toolName = "reference_search"

	// --- Parameter Extraction and Validation ---
	let query: string | undefined = block.params.query
	let directoryPrefix: string | undefined = block.params.path

	query = removeClosingTag("query", query)

	if (directoryPrefix) {
		directoryPrefix = removeClosingTag("path", directoryPrefix)
		directoryPrefix = path.normalize(directoryPrefix)
	}

	const sharedMessageProps = {
		tool: "referenceSearch",
		query: query,
		path: directoryPrefix,
		isOutsideWorkspace: true,
	}

	if (block.partial) {
		await cline.ask("tool", JSON.stringify(sharedMessageProps), block.partial).catch(() => {})
		return
	}

	if (!query) {
		cline.consecutiveMistakeCount++
		pushToolResult(await cline.sayAndCreateMissingParamError(toolName, "query"))
		return
	}

	const didApprove = await askApproval("tool", JSON.stringify(sharedMessageProps))
	if (!didApprove) {
		pushToolResult(formatResponse.toolDenied())
		return
	}

	cline.consecutiveMistakeCount = 0

	try {
		const context = cline.providerRef.deref()?.context
		if (!context) {
			throw new Error("Extension context is not available.")
		}

		const manager = ReferenceIndexManager.getInstance(context)

		if (!manager) {
			throw new Error("ReferenceIndexManager is not available.")
		}

		if (!manager.isFeatureEnabled) {
			throw new Error("Reference Indexing is disabled in the settings.")
		}
		if (!manager.isFeatureConfigured) {
			throw new Error("Reference Indexing is not configured.")
		}

		const searchResults: VectorStoreSearchResult[] = await manager.searchIndex(query, directoryPrefix)

		if (!searchResults || searchResults.length === 0) {
			pushToolResult(`No relevant snippets found for the query: "${query}"`)
			return
		}

		const jsonResult = {
			query,
			results: [] as Array<{
				filePath: string
				score: number
				startLine: number
				endLine: number
				codeChunk: string
			}>,
		}

		searchResults.forEach((result) => {
			if (!result.payload) return
			if (!("filePath" in result.payload)) return

			const relativePath = result.payload.filePath

			jsonResult.results.push({
				filePath: relativePath,
				score: result.score,
				startLine: result.payload.startLine,
				endLine: result.payload.endLine,
				codeChunk: result.payload.codeChunk.trim(),
			})
		})

		const payload = { tool: "referenceSearch", content: jsonResult }
		await cline.say("reference_search_result", JSON.stringify(payload))

		const output = `Query: ${query}\nResults:\n\n${jsonResult.results
			.map(
				(result) =>
					`File path: ${result.filePath}\nScore: ${result.score}\nLines: ${result.startLine}-${result.endLine}\nCode Chunk: ${result.codeChunk}\n`,
			)
			.join("\n")}`

		pushToolResult(output)
	} catch (error: any) {
		await handleError(toolName, error)
	}
}
