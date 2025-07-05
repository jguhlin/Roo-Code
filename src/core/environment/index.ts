import * as vscode from "vscode"
import { Uri } from "vscode"
import * as path from "path"
import * as os from "os"

declare const process: {
	cwd: () => string
}

export const getWorkspaceRoot = (): string => {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
}
