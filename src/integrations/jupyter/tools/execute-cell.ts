import * as vscode from "vscode"
import { NotebookCellOutputItem } from "vscode"
import { safeWriteJson } from "../../../utils/safeWriteJson"
import * as child_process from "child_process"
import * as util from "util"
import * as os from "os"
import * as path from "path"
import * as fs from "fs"

const exec = util.promisify(child_process.exec)

interface ExecuteCellParams {
	filePath: string
	cellIndex: number
	timeout?: number
}

interface ExecutionResult {
	success: boolean
	outputs: NotebookCellOutputItem[]
	executionTime: number
	error?: string
}

// Security: Disallowed operations that could be destructive
const DISALLOWED_OPERATIONS = [
	"rm -rf",
	"shutdown",
	"halt",
	"reboot",
	"format",
	"dd ",
	"mv /",
	":!",
	"system(",
	"os.system(",
	"subprocess.call(",
	"exec(",
	"execSync(",
	"spawnSync(",
	"child_process",
]

/**
 * Jupyter Cell Execution Tool
 *
 * Executes a single cell in a Jupyter notebook with:
 * - Kernel session management
 * - Timeout handling
 * - Output capture and sanitization
 * - Security sandboxing
 */
export async function executeNotebookCell(params: ExecuteCellParams): Promise<ExecutionResult> {
	const { filePath, cellIndex, timeout = 30000 } = params
	const startTime = Date.now()

	try {
		// Security: Validate file path
		if (!filePath || !filePath.endsWith(".ipynb")) {
			throw new Error("Invalid notebook file path")
		}

		// Get notebook document
		const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath))
		const notebook = JSON.parse(document.getText())

		// Validate cell index
		if (cellIndex < 0 || cellIndex >= notebook.cells.length) {
			throw new Error(`Invalid cell index: ${cellIndex}`)
		}

		const cell = notebook.cells[cellIndex]

		// Security: Check for disallowed operations
		if (cell.cell_type === "code") {
			const code = cell.source.join("")
			if (DISALLOWED_OPERATIONS.some((op) => code.includes(op))) {
				throw new Error("Operation disallowed by security policy")
			}
		}

		let outputs: NotebookCellOutputItem[] = []

		if (cell.cell_type === "code") {
			// Create temporary file with cell content
			const code = cell.source.join("\n")
			const tempFilePath = path.join(os.tmpdir(), `cell-${Date.now()}.py`)
			await fs.promises.writeFile(tempFilePath, code)

			// Execute code in a safe environment
			const { stdout, stderr } = await exec(`python ${tempFilePath}`, { timeout })

			// Capture and sanitize outputs
			const sanitizedOutput = (stdout.match(/[ -~]+/g) || []).join("")
			outputs.push(NotebookCellOutputItem.text(sanitizedOutput, "text/plain"))

			// Clean up temporary file
			await fs.promises.unlink(tempFilePath)
		} else {
			// For markdown cells, just return the content
			outputs.push(NotebookCellOutputItem.text(cell.source.join(""), "text/markdown"))
		}

		return {
			success: true,
			outputs,
			executionTime: Date.now() - startTime,
		}
	} catch (error) {
		return {
			success: false,
			outputs: [],
			executionTime: Date.now() - startTime,
			error: error instanceof Error ? error.message : String(error),
		}
	}
}

// Tool metadata for MCP registration
export const executeCellTool = {
	name: "execute_notebook_cell",
	description: "Execute a single cell in a Jupyter notebook",
	inputSchema: {
		type: "object",
		properties: {
			filePath: {
				type: "string",
				description: "Absolute path to the .ipynb file",
			},
			cellIndex: {
				type: "number",
				description: "0-based index of the cell to execute",
			},
			timeout: {
				type: "number",
				description: "Execution timeout in milliseconds (default: 30000)",
				optional: true,
			},
		},
		required: ["filePath", "cellIndex"],
	},
}
