import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import { readNotebookCellOutput } from "../tools/read-cell-output"
import { parseNotebook } from "../notebook-utils"

vi.mock("vscode", () => ({
	workspace: {
		openTextDocument: vi.fn(),
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path })),
	},
}))

vi.mock("../notebook-utils", () => ({
	parseNotebook: vi.fn(),
}))

describe("readNotebookCellOutput", () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	it("should return success with no output message if cell has no output", async () => {
		const params = { filePath: "test.ipynb", cellIndex: 0 }
		const notebook = {
			cells: [{ outputs: [] }],
			metadata: {},
			nbformat: 4,
			nbformat_minor: 5,
		}

		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
			getText: () => JSON.stringify(notebook),
		} as any)
		vi.mocked(parseNotebook).mockReturnValue(notebook as any)

		const result = await readNotebookCellOutput(params)

		expect(result.success).toBe(true)
		expect(result.output).toBe("Cell has no output.")
	})

	it("should extract and return text output", async () => {
		const params = { filePath: "test.ipynb", cellIndex: 0 }
		const notebook = {
			cells: [
				{
					outputs: [
						{
							items: [
								{
									mime: "text/plain",
									data: new Uint8Array(Buffer.from("Hello, world!")),
								},
							],
						},
					],
				},
			],
			metadata: {},
			nbformat: 4,
			nbformat_minor: 5,
		}

		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
			getText: () => JSON.stringify(notebook),
		} as any)
		vi.mocked(parseNotebook).mockReturnValue(notebook as any)

		const result = await readNotebookCellOutput(params)

		expect(result.success).toBe(true)
		expect(result.output).toBe("Hello, world!")
	})

	it("should truncate long text output", async () => {
		const params = { filePath: "test.ipynb", cellIndex: 0 }
		const longText = "a".repeat(3000)
		const notebook = {
			cells: [
				{
					outputs: [
						{
							items: [
								{
									mime: "text/plain",
									data: new Uint8Array(Buffer.from(longText)),
								},
							],
						},
					],
				},
			],
			metadata: {},
			nbformat: 4,
			nbformat_minor: 5,
		}

		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
			getText: () => JSON.stringify(notebook),
		} as any)
		vi.mocked(parseNotebook).mockReturnValue(notebook as any)

		const result = await readNotebookCellOutput(params)

		expect(result.success).toBe(true)
		expect(result.output?.length).toBe(2000 + "... (truncated)".length)
		expect(result.output).toContain("... (truncated)")
	})

	it("should filter out binary output", async () => {
		const params = { filePath: "test.ipynb", cellIndex: 0 }
		const notebook = {
			cells: [
				{
					outputs: [
						{
							items: [
								{ mime: "image/png", data: new Uint8Array([1, 2, 3]) },
								{
									mime: "text/plain",
									data: new Uint8Array(Buffer.from("text")),
								},
							],
						},
					],
				},
			],
			metadata: {},
			nbformat: 4,
			nbformat_minor: 5,
		}

		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
			getText: () => JSON.stringify(notebook),
		} as any)
		vi.mocked(parseNotebook).mockReturnValue(notebook as any)

		const result = await readNotebookCellOutput(params)

		expect(result.success).toBe(true)
		expect(result.output).toBe("text")
	})

	it("should return an error for invalid file path", async () => {
		const params = { filePath: "test.txt", cellIndex: 0 }
		const result = await readNotebookCellOutput(params)
		expect(result.success).toBe(false)
		expect(result.error).toBe("Invalid notebook file path provided.")
	})

	it("should return an error for out-of-bounds cell index", async () => {
		const params = { filePath: "test.ipynb", cellIndex: 1 }
		const notebook = {
			cells: [{}],
			metadata: {},
			nbformat: 4,
			nbformat_minor: 5,
		}

		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue({
			getText: () => JSON.stringify(notebook),
		} as any)
		vi.mocked(parseNotebook).mockReturnValue(notebook as any)

		const result = await readNotebookCellOutput(params)

		expect(result.success).toBe(false)
		expect(result.error).toBe("Cell index 1 is out of bounds.")
	})
})
