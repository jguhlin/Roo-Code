import { describe, it, expect, beforeEach, vi, type Mock } from "vitest"
import * as vscode from "vscode"
import JupyterActivationStrategy from "../activation-strategy"
import { McpHub } from "../../../services/mcp/McpHub"

vi.mock("vscode", () => ({
	workspace: {
		createFileSystemWatcher: vitest.fn(() => ({
			onDidCreate: vi.fn(),
			onDidDelete: vi.fn(),
			dispose: vi.fn(),
		})),
		findFiles: vi.fn(),
	},
}))

describe("JupyterActivationStrategy", () => {
	let strategy: JupyterActivationStrategy
	let mcpHubMock: McpHub

	beforeEach(() => {
		mcpHubMock = {
			findConnection: vi.fn(),
			notifyWebviewOfServerChanges: vi.fn(),
		} as unknown as McpHub
		strategy = new JupyterActivationStrategy(mcpHubMock)
	})

	it("should enable jupyter tools when a notebook is present", async () => {
		;(vscode.workspace.findFiles as Mock).mockResolvedValue(["/test/workspace/test.ipynb"])
		const findConnectionMock = mcpHubMock.findConnection as Mock
		const notebookConnection = { server: { disabled: true } }
		findConnectionMock.mockReturnValue(notebookConnection)

		await strategy["updateToolAvailability"]()

		expect(notebookConnection.server.disabled).toBe(false)
		expect(mcpHubMock.notifyWebviewOfServerChanges).toHaveBeenCalled()
	})

	it("should disable jupyter tools when no notebooks are present", async () => {
		;(vscode.workspace.findFiles as Mock).mockResolvedValue([])
		const findConnectionMock = mcpHubMock.findConnection as Mock
		const notebookConnection = { server: { disabled: false } }
		findConnectionMock.mockReturnValue(notebookConnection)

		await strategy["updateToolAvailability"]()

		expect(notebookConnection.server.disabled).toBe(true)
		expect(mcpHubMock.notifyWebviewOfServerChanges).toHaveBeenCalled()
	})
})
