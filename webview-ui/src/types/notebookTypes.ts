export interface NotebookCell {
	cell_type: string
	source: string
	metadata?: any
	outputs?: any[]
}
