import fs from "fs/promises"
import path from "path"
import type { Notebook, NotebookCell } from "../../shared/notebookTypes"

export async function parseNotebook(filePath: string): Promise<Notebook> {
	try {
		const fileContent = await fs.readFile(filePath, "utf-8")
		return parseNotebookFromString(fileContent)
	} catch (error) {
		throw new Error(`Failed to parse notebook: ${error instanceof Error ? error.message : String(error)}`)
	}
}

export function parseNotebookFromString(content: string): Notebook {
	const notebook = JSON.parse(content)

	// Validate notebook structure
	if (!notebook.cells || !Array.isArray(notebook.cells)) {
		throw new Error("Invalid notebook format: missing cells array")
	}

	// Map cells to our internal structure
	const cells: NotebookCell[] = notebook.cells.map((cell: any, index: number) => ({
		index: index + 1,
		cell_type: cell.cell_type || "code",
		source: Array.isArray(cell.source) ? cell.source.join("") : cell.source || "",
		outputs: cell.outputs || [],
		metadata: cell.metadata || {},
	}))

	return {
		metadata: notebook.metadata || {},
		nbformat: notebook.nbformat || 4,
		nbformat_minor: notebook.nbformat_minor || 0,
		cells,
	}
}

export function stringifyNotebook(notebook: Notebook): string {
	// Convert back to Jupyter notebook format
	const jupyterNotebook = {
		cells: notebook.cells.map((cell) => ({
			cell_type: cell.cell_type,
			source: cell.source,
			metadata: cell.metadata,
			outputs: cell.outputs,
		})),
		metadata: notebook.metadata,
		nbformat: notebook.nbformat,
		nbformat_minor: notebook.nbformat_minor,
	}

	return JSON.stringify(jupyterNotebook, null, 2)
}
