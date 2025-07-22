import React from "react"
import type { NotebookCell } from "../../types/notebookTypes"

// Temporary button component until Shadcn is properly set up
const Button: React.FC<{
	children: React.ReactNode
	onClick?: () => void
	className?: string
	size?: "sm" | "md" | "lg"
	variant?: "primary" | "secondary" | "outline"
}> = ({ children, onClick, className = "", size = "md", variant = "primary" }) => {
	const sizeClasses = {
		sm: "py-1 px-2 text-xs",
		md: "py-2 px-3 text-sm",
		lg: "py-3 px-4 text-base",
	}

	const variantClasses = {
		primary: "bg-vscode-button-background text-vscode-button-foreground hover:bg-vscode-button-hoverBackground",
		secondary: "bg-vscode-badge-background text-vscode-badge-foreground hover:bg-vscode-badge-hoverBackground",
		outline:
			"border border-vscode-button-border text-vscode-button-foreground hover:bg-vscode-button-secondaryHoverBackground",
	}

	return (
		<button onClick={onClick} className={`rounded ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
			{children}
		</button>
	)
}

// Temporary card components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
	<div className={`rounded-lg overflow-hidden shadow ${className}`}>{children}</div>
)

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
	<div className={`border-b border-vscode-editorWidget-border ${className}`}>{children}</div>
)

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
	<h3 className={`font-semibold ${className}`}>{children}</h3>
)

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
	<div className={`p-4 ${className}`}>{children}</div>
)

interface NotebookViewerProps {
	cells: NotebookCell[]
	onExecuteCell?: (index: number) => void
	onEditCell?: (极index: number) => void
}

const NotebookViewer: React.FC<NotebookViewerProps> = ({ cells, onExecuteCell, onEditCell }) => {
	return (
		<div className="space-y-4">
			{cells.map((cell, index) => (
				<Card key={index} className="bg-vscode-editor-background border border-vscode-editorWidget-border">
					<CardHeader className="p-3 bg-vscode-editorWidget-background">
						<div className="flex justify-between items-center">
							<CardTitle className="text-vscode-editor-foreground text-sm">
								Cell {index + 1} • {cell.cell_type}
							</CardTitle>
							<div className="space-x-2">
								{cell.cell_type === "code" && (
									<Button size="sm" variant="secondary" onClick={() => onExecuteCell?.(index)}>
										Execute
									</Button>
								)}
								<Button size="sm" variant="outline" onClick={() => onEditCell?.(index)}>
									Edit
								</Button>
							</div>
						</div>
					</CardHeader>

					<CardContent className="p-3">
						{cell.cell_type === "code" ? (
							<pre className="font-mono text-sm text-vscode-editor-foreground bg-vscode-textBlockQuote-background p-3 rounded">
								{cell.source}
							</pre>
						) : (
							<div className="prose prose-invert max-w-none text-vscode-editor-foreground">
								{cell.source}
							</div>
						)}

						{cell.outputs && cell.outputs.length > 0 && (
							<div className="mt-3">
								<h4 className="text-vscode-editor-foreground text-sm font-medium mb-2">Outputs</h4>
								<div className="bg-vscode-textBlockQuote-background p-3 rounded">
									{cell.outputs.map((output: any, i: number) => (
										<pre key={i} className="font-mono text-sm text-vscode-editor-foreground">
											{output.text?.join("\n") || JSON.stringify(output.data)}
										</pre>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export default NotebookViewer
