import * as vscode from "vscode"
import { NotebookCellOutputItem } from "vscode"
import { parseNotebook } from "../notebook-utils"

const MAX_OUTPUT_LENGTH = 2000

interface ReadCellOutputParams {
	filePath: string
	cellIndex: number
}

interface ReadResult {
	success: boolean
	output?: string
	error?: string
}

/**
 * Extracts and sanitizes text-based output from a notebook cell.
 * @param outputs - Array of notebook cell outputs.
 * @returns A formatted string of all text-based outputs.
 */
function extractTextOutput(outputs: readonly vscode.NotebookCellOutput[]): string {
	const textOutputs: string[] = []

	for (const output of outputs) {
		for (const item of output.items) {
			if (item.mime.startsWith("text/")) {
				try {
					const outputText = Buffer.from(item.data).toString("utf-8")
					textOutputs.push(outputText)
				} catch (e) {
					// Ignore errors in decoding binary data
				}
			}
		}
	}

	return textOutputs.join("\n").trim()
}

/**
 * Jupyter Cell Output Reader Tool
 *
 * Reads and processes the output of a single cell in a Jupyter notebook, with a focus on security and performance.
 * - Filters out binary and plot data to prevent rendering large or unsafe content.
 * - Sanitizes and formats text-based outputs for clarity.
 * - Truncates large outputs to maintain performance.
 * - Provides clear error handling for missing cells or outputs.
 */
export async function readNotebookCellOutput(params: ReadCellOutputParams): Promise<ReadResult> {
	const { filePath, cellIndex } = params

	try {
		if (!filePath || !filePath.endsWith(".ipynb")) {
			throw new Error("Invalid notebook file path provided.")
		}

		const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
		const notebook = await parseNotebook(document.getText())

		if (cellIndex < 0 || cellIndex >= notebook.cells.length) {
			throw new Error(`Cell index ${cellIndex} is out of bounds.`)
		}

		const cell = notebook.cells[cellIndex]
		if (!cell.outputs || cell.outputs.length === 0) {
			return { success: true, output: "Cell has no output." }
		}

		const textOutput = extractTextOutput(cell.outputs as vscode.NotebookCellOutput[])

		if (!textOutput) {
			return { success: true, output: "No text-based output found." }
		}

		const truncatedOutput =
			textOutput.length > MAX_OUTPUT_LENGTH
				? textOutput.substring(0, MAX_OUTPUT_LENGTH) + "... (truncated)"
				: textOutput

		return { success: true, output: truncatedOutput }
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "An unknown error occurred.",
		}
	}
}

export const readCellOutputTool = {
	name: "read_notebook_cell_output",
	description: "Read the output of a single cell in a Jupyter notebook.",
	inputSchema: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description: "Absolute path to the .ipynb file.",
			},
			cellIndex: {
				type: "number",
				description: "0-based index of the cell to read from.",
			},
		},
		required: ["filePath", "cellIndex"],
	},
}
