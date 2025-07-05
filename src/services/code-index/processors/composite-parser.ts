import { ICodeParser, CodeBlock } from "../interfaces"

export class CompositeCodeParser implements ICodeParser {
	private parsers: ICodeParser[]

	constructor(parsers: ICodeParser[]) {
		this.parsers = parsers
	}

	async parseFile(
		filePath: string,
		options?: {
			content?: string
			fileHash?: string
		},
	): Promise<CodeBlock[]> {
		for (const parser of this.parsers) {
			const blocks = await parser.parseFile(filePath, options)
			if (blocks.length > 0) {
				return blocks
			}
		}
		return []
	}
}
