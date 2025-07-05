import * as fs from "fs/promises"
import path from "path"

import { Task } from "../task/Task"
import { ReferenceIndexManager } from "../../services/reference-index/manager"
import { AskApproval, HandleError, PushToolResult, RemoveClosingTag, ToolUse } from "../../shared/tools"

export async function readReferenceFileTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const toolName = "read_reference_file"

	let relPath: string | undefined = block.params.path
	const startLineStr: string | undefined = block.params.start_line
	const endLineStr: string | undefined = block.params.end_line

	relPath = removeClosingTag("path", relPath)

	const context = cline.providerRef.deref()?.context
	if (!context) {
		await handleError(toolName, new Error("Extension context unavailable."))
		return
	}

	const manager = ReferenceIndexManager.getInstance(context)

	if (!manager || !manager.isFeatureConfigured) {
		await handleError(toolName, new Error("Reference index not configured."))
		return
	}

	const root = manager.rootPath
	if (!relPath) {
		cline.consecutiveMistakeCount++
		pushToolResult(await cline.sayAndCreateMissingParamError(toolName, "path"))
		return
	}

	const absPath = path.resolve(root, relPath)

	const didApprove = await askApproval(
		"tool",
		JSON.stringify({ tool: "readReferenceFile", path: relPath, isOutsideWorkspace: true }),
	)
	if (!didApprove) {
		return
	}

	try {
		const content = await fs.readFile(absPath, "utf8")
		const start = startLineStr ? parseInt(startLineStr, 10) : undefined
		const end = endLineStr ? parseInt(endLineStr, 10) : undefined

		const lines = content.split(/\r?\n/)
		const sliced = start && end ? lines.slice(start - 1, end) : lines
		const numbered = sliced.map((l, idx) => `${start ? start + idx : idx + 1} | ${l}`).join("\n")

		pushToolResult(numbered)
	} catch (error) {
		await handleError(toolName, error as Error)
	}
}
