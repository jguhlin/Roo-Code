import { Task } from "../task/Task"
import { store_memory } from "../../services/mem0"
import { formatResponse } from "../prompts/responses"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"

export async function addMemoryTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const memory: string | undefined = block.params.memory
	const toolName = "add_memory"
	try {
		if (block.partial) {
			await cline.ask("tool", removeClosingTag("memory", memory), block.partial).catch(() => {})
			return
		} else {
			if (!memory) {
				cline.consecutiveMistakeCount++
				cline.recordToolError(toolName)
				pushToolResult(await cline.sayAndCreateMissingParamError(toolName, "memory"))
				return
			}

			const didApprove = await askApproval("tool", removeClosingTag("memory", memory))
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
			await store_memory(
				[{ role: "assistant", content: [{ type: "text", text: memory }] }],
				state.machineId ?? "",
				cline.taskId,
			)
			pushToolResult("memory stored")
			return
		}
	} catch (error) {
		await handleError("adding memory", error as Error)
		return
	}
}
