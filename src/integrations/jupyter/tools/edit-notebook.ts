import * as vscode from "vscode"
import { parseNotebook, validateOperation, writeNotebook, NotebookContent, NotebookCell } from "../notebook-utils"
import { safeWriteJson } from "../../../utils/safeWriteJson"

interface EditNotebookParams {
	filePath: string
	operation: "add" | "delete" | "modify"
	cell?: NotebookCell
	index?: number
	newContent?: string
}

/**
 * Jupyter Notebook Editor Tool
 *
 * Provides operations for manipulating Jupyter notebook cells:
 * - Add new cells (code or markdown)
 * - Delete existing cells
 * - Modify cell content
 *
 * Uses atomic writes to prevent data corruption.
 */
export async function editNotebookFile(params: EditNotebookParams): Promise<void> {
	const { filePath, operation } = params

	try {
		// Read and parse notebook file
		const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
		const notebook = parseNotebook(document.getText())

		// Perform requested operation
		switch (operation) {
			case "add":
				await handleAddCell(notebook, params)
				break
			case "delete":
				await handleDeleteCell(notebook, params)
				break
			case "modify":
				await handleModifyCell(notebook, params)
				break
			default:
				throw new Error(`Unsupported operation: ${operation}`)
		}

		// Write updated notebook
		await writeNotebook(filePath, notebook)
	} catch (error) {
		throw new Error(`Failed to edit notebook: ${error instanceof Error ? error.message : String(error)}`)
	}
}

async function handleAddCell(notebook: NotebookContent, params: EditNotebookParams) {
	const { cell, index = notebook.cells.length } = params

	if (!cell) {
		throw new Error("Missing cell data for add operation")
	}

	validateOperation(notebook, index, "add")

	// Insert cell at specified position
	notebook.cells.splice(index, 0, cell)
}

async function handleDeleteCell(notebook: NotebookContent, params: EditNotebookParams) {
	const { index } = params

	if (index === undefined) {
		throw new Error("Missing index for delete operation")
	}

	validateOperation(notebook, index, "delete")

	// Remove cell at specified index
	notebook.cells.splice(index, 1)
}

async function handleModifyCell(notebook: NotebookContent, params: EditNotebookParams) {
	const { index, newContent } = params

	if (index === undefined) {
		throw new Error("Missing index for modify operation")
	}

	if (!newContent) {
		throw new Error("Missing new content for modify operation")
	}

	validateOperation(notebook, index, "modify")

	// Update cell content
	notebook.cells[index].source = [newContent]
}

// Tool metadata for MCP registration
export const editNotebookTool = {
	name: "edit_notebook_file",
	description: "Manipulate Jupyter notebook cells (add, delete, modify)",
	inputSchema: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description: "Absolute path to the .ipynb file",
			},
			operation: {
				type: "string",
				enum: ["add", "delete", "modify"],
				description: "Operation to perform",
			},
			index: {
				type: "number",
				description: "Cell index (0-based) for delete/modify operations",
				optional: true,
			},
			cell: {
				type: "object",
				description: "Cell data for add operations",
				optional: true,
				properties: {
					cell_type: {
						type: "string",
						enum: ["code", "markdown"],
					},
					source: {
						type: "array",
						items: { type: "string" },
					},
					metadata: {
						type: "object",
						optional: true,
					},
				},
			},
			newContent: {
				type: "string",
				description: "New cell content for modify operations",
				optional: true,
			},
		},
		required: ["filePath", "operation"],
	},
}
