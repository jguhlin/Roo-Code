import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as child_process from "child_process"
import { runNotebookCell } from "../tools/run-notebook-cell"

vi.mock("vscode", () => ({
	...vi.importActual("vscode"),
	workspace: {
		openTextDocument: vi.fn(),
	},
	Uri: {
		file: vi.fn(),
	},
	NotebookCellOutputItem: {
		text: vi.fn(),
	},
}))
vi.mock("fs/promises")
vi.mock("child_process")

const mockNotebook = {
	cells: [{ cell_type: "code", source: ['print("Hello World")'] }],
}

describe("runNotebookCell", () => {
	beforeEach(() => {
		;(vscode.Uri.file as vi.MockedFunction<typeof vscode.Uri.file>).mockImplementation((p: string) => ({
			fsPath: p,
			path: p,
		}))
		;(
			vscode.workspace.openTextDocument as vi.MockedFunction<typeof vscode.workspace.openTextDocument>
		).mockResolvedValue({
			getText: () => JSON.stringify(mockNotebook),
		} as any)
		;(
			vscode.NotebookCellOutputItem.text as vi.MockedFunction<typeof vscode.NotebookCellOutputItem.text>
		).mockImplementation((value: string, mime: string) => ({
			data: Buffer.from(value),
			mime,
		}))
		;(fs.writeFile as vi.MockedFunction<typeof fs.writeFile>).mockResolvedValue(undefined)
		;(fs.unlink as vi.MockedFunction<typeof fs.unlink>).mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("executes a code cell", async () => {
		vi.mocked(child_process.exec).mockImplementation(((
			command: string,
			options: any,
			callback: (error: null, stdout: string, stderr: string) => void,
		) => {
			callback(null, "Hello World", "")
			return {} as child_process.ChildProcess
		}) as any)

		const result = await runNotebookCell({ filePath: "test.ipynb", cellIndex: 0 })

		expect(result.success).toBe(true)
		expect(result.outputs).toHaveLength(1)
		expect(Buffer.from(result.outputs[0].data).toString()).toBe("Hello World")
	})
})
