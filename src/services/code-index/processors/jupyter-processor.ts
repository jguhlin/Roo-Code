import { readFile } from "fs/promises"
import { createHash } from "crypto"
import * as path from "path"
import { ICodeParser, CodeBlock } from "../interfaces"
import { NotebookCell, parseNotebook } from "../../../integrations/jupyter/notebook-utils"
import { MAX_BLOCK_CHARS, MIN_BLOCK_CHARS } from "../constants"

export class JupyterProcessor implements ICodeParser {
	async parseFile(
		filePath: string,
		options?: {
			content?: string
			fileHash?: string
		},
	): Promise<CodeBlock[]> {
		const ext = path.extname(filePath).toLowerCase()
		if (ext !== ".ipynb") {
			return []
		}

		let content: string
		let fileHash: string

		if (options?.content) {
			content = options.content
			fileHash = options.fileHash || this.createFileHash(content)
		} else {
			try {
				content = await readFile(filePath, "utf8")
				fileHash = this.createFileHash(content)
			} catch (error) {
				console.error(`Error reading file ${filePath}:`, error)
				return []
			}
		}

		try {
			const notebook = parseNotebook(content)
			const blocks: CodeBlock[] = []

			for (let i = 0; i < notebook.cells.length; i++) {
				const cell = notebook.cells[i]
				const cellContent = cell.source.join("")
				if (cellContent.length < MIN_BLOCK_CHARS) {
					continue
				}

				const cellBlocks = this.chunkCellContent(cell, cellContent, filePath, fileHash, i)
				blocks.push(...cellBlocks)
			}

			return blocks
		} catch (error) {
			console.error(`Error parsing notebook ${filePath}:`, error)
			return []
		}
	}

	private chunkCellContent(
		cell: NotebookCell,
		cellContent: string,
		filePath: string,
		fileHash: string,
		cellIndex: number,
	): CodeBlock[] {
		const blocks: CodeBlock[] = []
		const totalLength = cellContent.length
		let startIndex = 0

		while (startIndex < totalLength) {
			const endIndex = Math.min(startIndex + MAX_BLOCK_CHARS, totalLength)
			const chunkContent = cellContent.substring(startIndex, endIndex)

			const segmentHash = createHash("sha256")
				.update(`${filePath}-${cellIndex}-${startIndex}-${chunkContent}`)
				.digest("hex")

			blocks.push({
				file_path: filePath,
				identifier: `cell-${cellIndex}`,
				type: cell.cell_type,
				start_line: 0, // Placeholder, will need to calculate line numbers
				end_line: 0, // Placeholder, will need to calculate line numbers
				content: chunkContent,
				fileHash,
				segmentHash,
			})

			startIndex += MAX_BLOCK_CHARS
		}

		return blocks
	}

	private createFileHash(content: string): string {
		return createHash("sha256").update(content).digest("hex")
	}
}

export const jupyterProcessor = new JupyterProcessor()
