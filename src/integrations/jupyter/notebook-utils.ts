import { safeWriteJson } from "../../utils/safeWriteJson"
import * as vscode from "vscode"
import * as path from "path"

export interface NotebookCell {
	cell_type: "code" | "markdown"
	source: string[]
	metadata?: Record<string, any>
	outputs?: {
		items: {
			mime: string
			data: Uint8Array
		}[]
	}[]
}

export interface NotebookContent {
	cells: NotebookCell[]
	metadata: Record<string, any>
	nbformat: number
	nbformat_minor: number
}

/**
 * Parses a notebook file content into structured data
 * @param content Raw notebook content
 * @returns Parsed notebook content
 * @throws Error if parsing fails or invalid notebook format
 */
export function parseNotebook(content: string): NotebookContent {
	try {
		const notebook = JSON.parse(content)

		// Validate basic notebook structure
		if (
			typeof notebook !== "object" ||
			!Array.isArray(notebook.cells) ||
			typeof notebook.metadata !== "object" ||
			typeof notebook.nbformat !== "number"
		) {
			throw new Error("Invalid notebook structure")
		}

		return notebook as NotebookContent
	} catch (error) {
		throw new Error(`Failed to parse notebook: ${error instanceof Error ? error.message : String(error)}`)
	}
}

/**
 * Validates notebook operations
 * @param notebook Notebook content
 * @param index Cell index to validate
 * @param operationType Operation being performed
 */
export function validateOperation(
	notebook: NotebookContent,
	index: number,
	operationType: "add" | "delete" | "modify",
) {
	const maxIndex = operationType === "add" ? notebook.cells.length : notebook.cells.length - 1
	if (index < 0 || index > maxIndex) {
		throw new Error(`Invalid cell index ${index} for ${operationType} operation`)
	}
}

/**
 * Writes notebook content to file with atomic write
 * @param filePath Path to notebook file
 * @param notebook Notebook content to write
 */
export async function writeNotebook(filePath: string, notebook: NotebookContent) {
	await safeWriteJson(filePath, notebook)
}

/**
 * Gets the notebook controller for a given document
 */
export async function getNotebookKernel(document: vscode.TextDocument): Promise<vscode.NotebookController | undefined> {
	const notebookType = "jupyter-notebook"

	const controller = vscode.notebooks.createNotebookController("jupyter-controller", notebookType, "Jupyter")

	controller.supportedLanguages = ["python"]

	// Get or create notebook document
	const notebook =
		vscode.workspace.notebookDocuments.find((doc) => doc.uri.toString() === document.uri.toString()) ||
		(await vscode.workspace.openNotebookDocument(document.uri))

	controller.updateNotebookAffinity(notebook, vscode.NotebookControllerAffinity.Preferred)

	return controller
}
