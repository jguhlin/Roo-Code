import * as vscode from "vscode"
import { McpHub } from "../../services/mcp/McpHub"

class JupyterActivationStrategy {
	private fileWatcher: vscode.FileSystemWatcher
	private disposables: vscode.Disposable[] = []
	private updateTimer: NodeJS.Timeout | null = null
	private mcpHub: McpHub

	constructor(mcpHub: McpHub) {
		this.mcpHub = mcpHub
		this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/*.ipynb")
		this.disposables.push(
			this.fileWatcher.onDidCreate(() => this.debouncedUpdate()),
			this.fileWatcher.onDidDelete(() => this.debouncedUpdate()),
			this.fileWatcher,
		)
		this.debouncedUpdate()
	}

	private debouncedUpdate() {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
		}
		this.updateTimer = setTimeout(() => this.updateToolAvailability(), 500)
	}

	private async updateToolAvailability() {
		const jupyterFiles = await vscode.workspace.findFiles("**/*.ipynb", "**/node_modules/**", 1)
		const isToolAvailable = jupyterFiles.length > 0
		const jupyterTools = ["editNotebookTool", "executeCellTool", "readCellOutputTool", "summarizeNotebookTool"]

		for (const tool of jupyterTools) {
			const connection = this.mcpHub.findConnection(tool)
			if (connection) {
				connection.server.disabled = !isToolAvailable
			}
		}
		await this.mcpHub.notifyWebviewOfServerChanges()
	}

	public dispose() {
		this.disposables.forEach((d) => d.dispose())
		if (this.updateTimer) {
			clearTimeout(this.updateTimer)
		}
	}
}

export default JupyterActivationStrategy
