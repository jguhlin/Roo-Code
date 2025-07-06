import { describe, it, expect, vi, beforeEach, afterEach, type MockedFunction } from "vitest"
import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as child_process from "child_process"
import { executeNotebookCell } from "../tools/execute-cell"

// Mock entire modules that have side effects or are external dependencies
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
	cells: [
		{ cell_type: "code", source: ['print("Hello World")'] },
		{ cell_type: "markdown", source: ["# Markdown Content"] },
		{ cell_type: "code", source: ["import os", 'os.system("rm -rf /tmp/testing/what")'] },
		{ cell_type: "code", source: ['print("Hello\\x00World")'] },
	],
}

describe("executeNotebookCell", () => {
	beforeEach(() => {
		// Provide mock implementations for vscode APIs
		;(vscode.Uri.file as any).mockImplementation((p: string) => ({
			fsPath: p,
			path: p,
		}))
		;(
			vscode.workspace.openTextDocument as MockedFunction<typeof vscode.workspace.openTextDocument>
		).mockResolvedValue({
			getText: () => JSON.stringify(mockNotebook),
		} as any)
		;(vscode.NotebookCellOutputItem.text as any).mockImplementation((value: string, mime: string) => ({
			data: Buffer.from(value),
			mime,
		}))

		// Mock file system operations
		;(fs.writeFile as any).mockResolvedValue(undefined)
		;(fs.unlink as any).mockResolvedValue(undefined)
	})

	afterEach(() => {
		// Ensure all mocks are cleared after each test
		vi.restoreAllMocks()
	})

	describe("Successful Execution", () => {
		it("should execute a code cell and return sanitized output", async () => {
			vi.mocked(child_process.exec).mockImplementation(((
				command: string,
				options: any,
				callback: (error: null, stdout: string, stderr: string) => void,
			) => {
				callback(null, "Hello World", "")
				return {} as child_process.ChildProcess
			}) as any)

			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 0,
			})

			expect(result.success).toBe(true)
			expect(result.error).toBeUndefined()
			expect(fs.writeFile).toHaveBeenCalledOnce()
			expect(child_process.exec).toHaveBeenCalledOnce()
			expect(fs.unlink).toHaveBeenCalledOnce()
			expect(result.outputs).toHaveLength(1)
			expect(Buffer.from(result.outputs[0].data).toString()).toBe("Hello World")
			expect(result.outputs[0].mime).toBe("text/plain")
		})

		it("should handle markdown cells correctly", async () => {
			const execMock = vi.spyOn(child_process, "exec")
			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 1,
			})

			expect(result.success).toBe(true)
			expect(execMock).not.toHaveBeenCalled()
			expect(result.outputs).toHaveLength(1)
			expect(Buffer.from(result.outputs[0].data).toString()).toBe("# Markdown Content")
			expect(result.outputs[0].mime).toBe("text/markdown")
		})

		it("should sanitize non-printable characters from output", async () => {
			vi.mocked(child_process.exec).mockImplementation(((
				command: string,
				options: any,
				callback: (error: null, stdout: string, stderr: string) => void,
			) => {
				callback(null, "Hello\\x00World", "")
				return {} as child_process.ChildProcess
			}) as any)

			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 3,
			})

			expect(result.success).toBe(true)
			expect(result.outputs).toHaveLength(1)
			expect(Buffer.from(result.outputs[0].data).toString()).toBe("HelloWorld")
		})
	})

	describe("Error Handling and Security", () => {
		it("should return an error for invalid file paths", async () => {
			const result = await executeNotebookCell({
				filePath: "test.txt",
				cellIndex: 0,
			})
			expect(result.success).toBe(false)
			expect(result.error).toBe("Invalid notebook file path")
		})

		it("should return an error for out-of-bounds cell index", async () => {
			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 99,
			})
			expect(result.success).toBe(false)
			expect(result.error).toBe("Invalid cell index: 99")
		})

		it("should block disallowed operations for security", async () => {
			const execMock = vi.spyOn(child_process, "exec")
			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 2,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe("Operation disallowed by security policy")
			expect(execMock).not.toHaveBeenCalled()
		})

		it("should handle errors during code execution", async () => {
			const execError = new Error("Kernel crashed")
			vi.mocked(child_process.exec).mockImplementation(((
				command: string,
				options: any,
				callback: (error: Error, stdout: string, stderr: string) => void,
			) => {
				callback(execError, "", "Error details")
				return {} as child_process.ChildProcess
			}) as any)

			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 0,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe("Kernel crashed")
		})

		it("should handle execution timeouts", async () => {
			const timeoutError = new Error("Timeout exceeded") as any
			timeoutError.code = "ETIMEDOUT" // Simulate timeout error code
			vi.mocked(child_process.exec).mockImplementation(((
				command: string,
				options: any,
				callback: (error: Error, stdout: string, stderr: string) => void,
			) => {
				callback(timeoutError, "", "")
				return {} as child_process.ChildProcess
			}) as any)

			const result = await executeNotebookCell({
				filePath: "test.ipynb",
				cellIndex: 0,
				timeout: 100,
			})

			expect(result.success).toBe(false)
			expect(result.error).toBe("Timeout exceeded")
		})
	})
})
