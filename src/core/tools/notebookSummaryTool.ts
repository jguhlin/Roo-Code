import type { Notebook, NotebookCell } from "../../shared/notebookTypes"
import { parseNotebookFromString } from "../../integrations/notebook/notebookParser"
import { readFile } from "fs/promises"
import i18n from "../../i18n"

interface NotebookSummaryToolUse {
	path: string
	cell_range?: string
	detail_level?: "brief" | "detailed"
}

export const notebookSummaryTool = {
	name: "notebook_summary" as const,
	description: i18n.t("tools:notebookSummary.description"),
	parameters: {
		path: {
			type: "string",
			description: i18n.t("tools:notebookSummary.parameters.path"),
		},
		cell_range: {
			type: "string",
			description: i18n.t("tools:notebookSummary.parameters.cellRange"),
			optional: true,
		},
		detail_level: {
			type: "string",
			description: i18n.t("tools:notebookSummary.parameters.detailLevel"),
			optional: true,
		},
	},
	validate: (arg: any): NotebookSummaryToolUse => {
		if (typeof arg.path !== "string") {
			throw new Error(i18n.t("tools:notebookSummary.errors.pathRequired"))
		}
		return arg as NotebookSummaryToolUse
	},
	execute: async (arg: NotebookSummaryToolUse) => {
		const filePath = arg.path
		const cellRange = arg.cell_range
		const detailLevel = arg.detail_level || "brief"

		try {
			// Read and parse notebook
			const fileContent = await readFile(filePath, "utf-8")
			const notebook = parseNotebookFromString(fileContent)

			let startIdx = 0
			let endIdx = notebook.cells.length - 1

			// Parse cell range if provided
			if (cellRange) {
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
					throw new Error(i18n.t("tools:notebookSummary.errors.invalidRange"))
				}
			}

			// Generate summary
			let summary = `# Notebook Summary: ${filePath}\n`
			summary += `## Cells ${startIdx + 1} to ${endIdx + 1} of ${notebook.cells.length}\n\n`

			for (let i = startIdx; i <= endIdx; i++) {
				const cell = notebook.cells[i]
				summary += `### Cell ${i + 1}: ${cell.cell_type}\n`

				if (cell.cell_type === "code") {
					summary += "#### Source:\n```\n"
					summary += cell.source + "\n```\n"

					if (detailLevel === "detailed" && cell.outputs && cell.outputs.length > 0) {
						summary += "#### Outputs:\n"
						cell.outputs.forEach((output: any, idx: number) => {
							if (output.data && output.data["text/plain"]) {
								summary += `Output ${idx + 1}:\n${output.data["text/plain"].join("\n")}\n`
							} else if (output.text) {
								summary += `Output ${idx + 1}:\n${output.text.join("\n")}\n`
							}
						})
					}
				} else if (cell.cell_type === "markdown") {
					summary += "#### Content:\n"
					summary += cell.source + "\n"
				}

				summary += "\n"
			}

			return summary
		} catch (error) {
			throw new Error(
				i18n.t("tools:notebookSummary.errors.summaryFailed", {
					error: error instanceof Error ? error.message : String(error),
				}),
			)
		}
	},
}
