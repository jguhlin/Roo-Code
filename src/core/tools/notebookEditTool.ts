import type { Notebook, NotebookCell } from "../../shared/notebookTypes"
import { parseNotebookFromString, stringifyNotebook } from "../../integrations/notebook/notebookParser"
interface Tool<T> {
	name: string
	description: string
	parameters: Record<string, { type: string; description: string }>
	validate: (arg: any) => T
	execute: (arg: T, cwd: string, push: (content: string) => void) => Promise<string>
}
import { readFile, writeFile } from "fs/promises"
import i18n from "../../i18n"

interface NotebookEditToolUse {
	path: string
	cell_range: string
	content: string
}

export const notebookEditTool: Tool<NotebookEditToolUse> = {
	name: "notebook_edit" as const,
	description: i18n.t("tools:notebookEdit.description"),
	parameters: {
		path: {
			type: "string",
			description: i18n.t("tools:notebookEdit.parameters.path"),
		},
		cell_range: {
			type: "string",
			description: i18n.t("tools:notebookEdit.parameters.cellRange"),
		},
		content: {
			type: "string",
			description: i18n.t("tools:notebookEdit.parameters.content"),
		},
	},
	validate: (arg: any): NotebookEditToolUse => {
		if (typeof arg.path !== "string") {
			throw new Error(i18n.t("tools:notebookEdit.errors.pathRequired"))
		}
		if (typeof arg.cell_range !== "string") {
			throw new Error(i18n.t("tools:notebookEdit.errors.cellRangeRequired"))
		}
		if (typeof arg.content !== "string") {
			throw new Error(i18n.t("tools:notebookEdit.errors.contentRequired"))
		}
		return arg as NotebookEditToolUse
	},
	execute: async (arg: NotebookEditToolUse, cwd: string, push: (content: string) => void) => {
		const filePath = arg.path
		const cellRange = arg.cell_range
		const newContent = arg.content

		try {
			// Read and parse notebook
			const fileContent = await readFile(filePath, "utf-8")
			const notebook = parseNotebookFromString(fileContent)

			// Parse cell range
			let startIdx: number, endIdx: number
			if (cellRange.includes("-")) {
				;[startIdx, endIdx] = cellRange.split("-").map(Number)
			} else {
				startIdx = Number(cellRange)
				endIdx = startIdx
			}

			// Validate indices
			if (
				isNaN(startIdx) ||
				isNaN(endIdx) ||
				startIdx < 0 ||
				endIdx >= notebook.cells.length ||
				startIdx > endIdx
			) {
				throw new Error(i18n.t("tools:notebookEdit.errors.invalidRange"))
			}

			// Parse new content as JSON array of cells
			const newCells: NotebookCell[] = JSON.parse(newContent)

			// Validate new cells
			if (
				!Array.isArray(newCells) ||
				!newCells.every((cell) => typeof cell.cell_type === "string" && Array.isArray(cell.source))
			) {
				throw new Error(i18n.t("tools:notebookEdit.errors.invalidContent"))
			}

			// Replace cells in range
			notebook.cells.splice(startIdx, endIdx - startIdx + 1, ...newCells)

			// Write updated notebook
			await writeFile(filePath, stringifyNotebook(notebook))

			return i18n.t("tools:notebookEdit.success", {
				count: newCells.length,
				start: startIdx,
				end: endIdx,
				path: filePath,
			})
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error(i18n.t("tools:notebookEdit.errors.jsonParseError"))
			}
			throw error
		}
	},
}
