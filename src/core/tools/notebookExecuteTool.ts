import type { Notebook } from "../../shared/notebookTypes"
import { parseNotebookFromString } from "../../integrations/notebook/notebookParser"
import { readFile } from "fs/promises"
import i18n from "../../i18n"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

interface NotebookExecuteToolUse {
	path: string
	cell_range: string
}

export const notebookExecuteTool = {
	name: "notebook_execute" as const,
	description: i18n.t("tools:notebookExecute.description"),
	parameters: {
		path: {
			type: "string",
			description: i18n.t("tools:notebookExecute.parameters.path"),
		},
		cell_range: {
			type: "string",
			description: i18n.t("tools:notebookExecute.parameters.cellRange"),
		},
	},
	validate: (arg: any): NotebookExecuteToolUse => {
		if (typeof arg.path !== "string") {
			throw new Error(i18n.t("tools:notebookExecute.errors.pathRequired"))
		}
		if (typeof arg.cell_range !== "string") {
			throw new Error(i18n.t("tools:notebookExecute.errors.cellRangeRequired"))
		}
		return arg as NotebookExecuteToolUse
	},
	execute: async (arg: NotebookExecuteToolUse, cwd: string) => {
		const filePath = arg.path
		const cellRange = arg.cell_range

		try {
			// Parse cell range
			let startIdx: number, endIdx: number
			if (cellRange.includes("-")) {
				;[startIdx, endIdx] = cellRange.split("-").map(Number)
			} else {
				startIdx = Number(cellRange)
				endIdx = startIdx
			}

			// Read notebook to validate cell range
			const fileContent = await readFile(filePath, "utf-8")
			const notebook = parseNotebookFromString(fileContent)

			// Validate indices
			if (
				isNaN(startIdx) ||
				isNaN(endIdx) ||
				startIdx < 0 ||
				endIdx >= notebook.cells.length ||
				startIdx > endIdx
			) {
				throw new Error(i18n.t("tools:notebookExecute.errors.invalidRange"))
			}

			// Execute cells using Jupyter CLI
			const { stdout, stderr } = await execAsync(
				`jupyter nbconvert --execute --inplace --ExecutePreprocessor.start_index=${startIdx} --ExecutePreprocessor.end_index=${endIdx} ${filePath}`,
				{ cwd },
			)

			const result = stdout || stderr

			return i18n.t("tools:notebookExecute.success", {
				start: startIdx,
				end: endIdx,
				path: filePath,
				output: result,
			})
		} catch (error) {
			throw new Error(
				i18n.t("tools:notebookExecute.errors.executionFailed", {
					error: error instanceof Error ? error.message : String(error),
				}),
			)
		}
	},
}
