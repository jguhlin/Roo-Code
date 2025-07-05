import { describe, it, expect, vi, beforeEach } from "vitest"
import { editNotebookFile } from "../tools/edit-notebook"
import * as vscode from "vscode"
import { NotebookContent } from "../notebook-utils"
import { safeWriteJson } from "../../../utils/safeWriteJson"

// Mock safeWriteJson to avoid actual file writes
vi.mock("../../../utils/safeWriteJson", () => ({
	safeWriteJson: vi.fn().mockResolvedValue(undefined),
}))

// Mock vscode workspace API
vi.mock("vscode", () => ({
	workspace: {
		openTextDocument: vi.fn(),
	},
	Uri: {
		file: (path: string) => ({ path }),
	},
}))

describe("editNotebookFile", () => {
	const mockNotebook: NotebookContent = {
		cells: [
			{
				cell_type: "code",
				source: ["print('Hello World')"],
			},
			{
				cell_type: "markdown",
				source: ["# Header"],
			},
		],
		metadata: {},
		nbformat: 4,
		nbformat_minor: 0,
	}

	const mockDocument = {
		getText: () => JSON.stringify(mockNotebook),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.workspace.openTextDocument as any).mockResolvedValue(mockDocument)
	})

	it("adds a new cell at specified index", async () => {
		const newCell = {
			cell_type: "code" as const,
			source: ["print('New Cell')"],
		}

		await editNotebookFile({
			filePath: "test.ipynb",
			operation: "add",
			index: 1,
			cell: newCell,
		})

		const updatedNotebook: NotebookContent = (safeWriteJson as any).mock.calls[0][1]
		expect(updatedNotebook.cells).toHaveLength(3)
		expect(updatedNotebook.cells[1]).toEqual(newCell)
	})

	it("adds a new cell at end when no index specified", async () => {
		const newCell = {
			cell_type: "markdown" as const,
			source: ["## New Markdown"],
		}

		await editNotebookFile({
			filePath: "test.ipynb",
			operation: "add",
			cell: newCell,
		})

		const updatedNotebook: NotebookContent = (safeWriteJson as any).mock.calls[0][1]
		expect(updatedNotebook.cells).toHaveLength(3)
		expect(updatedNotebook.cells[2]).toEqual(newCell)
	})

	it("deletes a cell at specified index", async () => {
		await editNotebookFile({
			filePath: "test.ipynb",
			operation: "delete",
			index: 0,
		})

		const updatedNotebook: NotebookContent = (safeWriteJson as any).mock.calls[0][1]
		expect(updatedNotebook.cells).toHaveLength(1)
		expect(updatedNotebook.cells[0].source[0]).toBe("# Header")
	})

	it("modifies cell content", async () => {
		await editNotebookFile({
			filePath: "test.ipynb",
			operation: "modify",
			index: 0,
			newContent: "print('Modified')",
		})

		const updatedNotebook: NotebookContent = (safeWriteJson as any).mock.calls[0][1]
		expect(updatedNotebook.cells[0].source[0]).toBe("print('Modified')")
	})

	it("throws error for invalid index on delete", async () => {
		await expect(
			editNotebookFile({
				filePath: "test.ipynb",
				operation: "delete",
				index: 10,
			}),
		).rejects.toThrow("Invalid cell index 10 for delete operation")
	})

	it("throws error for missing cell on add", async () => {
		await expect(
			editNotebookFile({
				filePath: "test.ipynb",
				operation: "add",
			}),
		).rejects.toThrow("Missing cell data for add operation")
	})

	it("throws error for missing newContent on modify", async () => {
		await expect(
			editNotebookFile({
				filePath: "test.ipynb",
				operation: "modify",
				index: 0,
			}),
		).rejects.toThrow("Missing new content for modify operation")
	})
})
