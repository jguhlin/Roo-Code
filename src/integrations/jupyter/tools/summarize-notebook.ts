import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"

interface NotebookCell {
	cell_type: string
	source: string[] | string
}

interface NotebookSummaryParams {
	filePath: string
	maxTokens?: number
}

interface SummaryResult {
	success: boolean
	output?: string
	error?: string
}

function createSlidingWindowChunks<T>(items: T[], chunkSize: number, overlap: number): T[][] {
	const chunks = []
	let start = 0

	while (start < items.length) {
		const end = Math.min(start + chunkSize, items.length)
		chunks.push(items.slice(start, end))
		start += chunkSize - overlap
	}

	return chunks
}

export async function summarizeNotebook(params: NotebookSummaryParams): Promise<SummaryResult> {
	const { filePath, maxTokens = 2000 } = params

	try {
		const rawContent = await fs.readFile(filePath, "utf-8")
		const notebook = JSON.parse(rawContent)

		const cells = notebook.cells.map((cell: NotebookCell) => ({
			type: cell.cell_type,
			content: Array.isArray(cell.source) ? cell.source.join("\n") : cell.source,
		}))

		const chunks = createSlidingWindowChunks(cells, 5, 1)

		const chunkSummaries = []
		for (const [index, chunk] of chunks.entries()) {
			const summary = await summarizeChunk(chunk, index, chunks.length)
			chunkSummaries.push(summary)
			await new Promise((resolve) => setTimeout(resolve, 1000))
		}

		const finalSummary = await generateFinalSummary(chunkSummaries.join("\n"))

		return {
			success: true,
			output: finalSummary.slice(0, maxTokens),
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to summarize notebook",
		}
	}
}

async function summarizeChunk(chunk: any[], index: number, total: number): Promise<string> {
	return `Chunk ${index + 1}/${total} summary:\n${chunk.map((c) => `${c.type} cell: ${c.content.slice(0, 50)}...`).join("\n")}`
}

async function generateFinalSummary(chunksSummary: string): Promise<string> {
	return `Notebook Summary:\n${chunksSummary}`
}

export const summarizeNotebookTool = {
	name: "get_notebook_summary",
	description: "Generate a summarized analysis of Jupyter notebook contents",
	inputSchema: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description: "Path to .ipynb file",
			},
			maxTokens: {
				type: "number",
				description: "Maximum summary length in tokens",
				optional: true,
			},
		},
		required: ["filePath"],
	},
}
