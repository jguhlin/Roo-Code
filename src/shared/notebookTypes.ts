export interface NotebookCell {
	index: number
	cell_type: "code" | "markdown" | "raw"
	source: string
	outputs?: any[]
	metadata?: Record<string, any>
}

export interface Notebook {
	metadata: Record<string, any>
	nbformat: number
	nbformat_minor: number
	cells: NotebookCell[]
}
