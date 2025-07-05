import { Task } from "../task/Task"
import { search_memories } from "../../services/mem0"
import { formatResponse } from "../prompts/responses"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"

export async function searchMemoriesTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const query: string | undefined = block.params.query
	const toolName = "search_memories"
	try {
		if (block.partial) {
			await cline.ask("tool", removeClosingTag("query", query), block.partial).catch(() => {})
			return
		} else {
			if (!query) {
				cline.consecutiveMistakeCount++
				cline.recordToolError(toolName)
				pushToolResult(await cline.sayAndCreateMissingParamError(toolName, "query"))
				return
			}

			const didApprove = await askApproval("tool", removeClosingTag("query", query))
			if (!didApprove) {
				pushToolResult(formatResponse.toolDenied())
				return
			}

			const state = await cline.providerRef.deref()?.getState()
			if (!state?.mem0Enabled || !state.mem0ApiServerUrl) {
				pushToolResult(formatResponse.toolError("Mem0 is not enabled"))
				return
			}
			cline.consecutiveMistakeCount = 0
			const memories = await search_memories(query, state.machineId ?? "", cline.taskId)
			if (!memories || memories.length === 0) {
				pushToolResult("(no results)")
			} else {
				const out = memories.map((m: any) => m.text || m.memory).join("\n")
				pushToolResult(out)
			}
			return
		}
	} catch (error) {
		await handleError("searching memories", error as Error)
		return
	}
}
