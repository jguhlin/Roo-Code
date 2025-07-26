import path from "path"
import { Task } from "../task/Task"
import { ClineSayTool } from "../../shared/ExtensionMessage"
import { formatResponse } from "../prompts/responses"
import { t } from "../../i18n"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { isPathOutsideWorkspace } from "../../utils/pathUtils"
import { getReadablePath } from "../../utils/path"
import { parseNotebook } from "../../integrations/notebook/notebookParser"
import { NotebookCell } from "../../shared/notebookTypes"

export function getNotebookViewToolDescription(blockName: string, blockParams: any): string {
	const path = blockParams.path || "unknown"
	return `[${blockName} for '${path}']`
}

interface NotebookViewParams {
	path: string
	cellRange?: string
}

export async function notebookViewTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	_removeClosingTag: RemoveClosingTag,
) {
	const params: NotebookViewParams = {
		path: block.params.path || "",
		cellRange: block.params["cell_range"] || undefined,
	}

	if (!params.path) {
		const errorMsg = await cline.sayAndCreateMissingParamError("notebook_view", "path")
		pushToolResult(`<error>${errorMsg}</error>`)
		return
	}

	const relPath = params.path
	const fullPath = path.resolve(cline.cwd, relPath)
	const isOutsideWorkspace = isPathOutsideWorkspace(fullPath)

	// Request approval
	const completeMessage = JSON.stringify({
		tool: "notebookView",
		path: getReadablePath(cline.cwd, relPath),
		isOutsideWorkspace,
		content: fullPath,
		reason: params.cellRange
			? t("tools:notebookView.cellRange", { range: params.cellRange })
			: t("tools:notebookView.fullNotebook"),
	} satisfies ClineSayTool)

	const { response, text, images } = await cline.ask("tool", completeMessage, false)

	if (response !== "yesButtonClicked") {
		if (text) await cline.say("user_feedback", text, images)
		cline.didRejectTool = true
		pushToolResult(`<notebook><path>${relPath}</path><status>Denied by user</status></notebook>`)
		return
	}

	if (text) await cline.say("user_feedback", text, images)

	try {
		// Parse notebook
		const notebook = await parseNotebook(fullPath)

		// Apply cell range filter if specified
		let cells: NotebookCell[] = notebook.cells
		if (params.cellRange) {
			const [start, end] = params.cellRange.split("-").map(Number)
			if (!isNaN(start) && !isNaN(end)) {
				cells = cells.slice(start - 1, end)
			}
		}

		// Generate XML representation
		const cellsXml = cells
			.map(
				(cell, index) => `
      <cell index="${index + 1}" type="${cell.cell_type}">
        <source><![CDATA[${cell.source}]]></source>
        ${cell.outputs ? `<outputs><![CDATA[${JSON.stringify(cell.outputs)}]]></outputs>` : ""}
        ${cell.metadata ? `<metadata><![CDATA[${JSON.stringify(cell.metadata)}]]></metadata>` : ""}
      </cell>
    `,
			)
			.join("\n")

		const notebookXml = `
      <notebook>
        <path>${relPath}</path>
        <metadata><![CDATA[${JSON.stringify(notebook.metadata)}]]></metadata>
        <cells>
          ${cellsXml}
        </cells>
      </notebook>
    `

		pushToolResult(notebookXml)
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : String(error)
		await handleError(`viewing notebook ${relPath}`, error instanceof Error ? error : new Error(errorMsg))
		pushToolResult(`<notebook><path>${relPath}</path><error>Error viewing notebook: ${errorMsg}</error></notebook>`)
	}
}
