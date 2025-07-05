import { describe, expect, test, vi } from "vitest"
import { summarizeNotebook } from "../tools/summarize-notebook"
import * as fs from "fs/promises"

vi.mock("fs/promises", async () => {
	const actual = await vi.importActual("fs/promises")
	return {
		...actual,
		readFile: vi.fn(),
	}
})

const mockNotebook = {
	cells: [
		{ cell_type: "markdown", source: ["# Title"] },
		{ cell_type: "code", source: ["print('hello')"] },
		{ cell_type: "markdown", source: ["## Section 2"] },
		{ cell_type: "code", source: ["import pandas as pd", "df = pd.DataFrame()"] },
		{ cell_type: "markdown", source: ["### Subsection"] },
		{ cell_type: "code", source: ["df.head()"] },
		{ cell_type: "code", source: ["df.describe()"] },
	],
}

describe("summarizeNotebook", () => {
	test("should summarize a notebook successfully", async () => {
		vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockNotebook))

		const result = await summarizeNotebook({ filePath: "test.ipynb" })

		expect(result.success).toBe(true)
		expect(result.output).toContain("Notebook Summary:")
		expect(result.output).toContain("Chunk 1/2 summary:")
		expect(result.output).toContain("Chunk 2/2 summary:")
	})

	test("should handle large notebook by chunking", async () => {
		vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockNotebook))
		const result = await summarizeNotebook({ filePath: "test.ipynb" })
		expect(result.success).toBe(true)
		expect(result.output).not.toBeNull()
	})

	test("should return an error if file not found", async () => {
		vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"))
		const result = await summarizeNotebook({ filePath: "nonexistent.ipynb" })
		expect(result.success).toBe(false)
		expect(result.error).toBe("File not found")
	})

	test("should handle invalid JSON", async () => {
		vi.mocked(fs.readFile).mockResolvedValue("invalid json")
		const result = await summarizeNotebook({ filePath: "invalid.ipynb" })
		expect(result.success).toBe(false)
		expect(result.error).toContain("Unexpected token")
	})
})
