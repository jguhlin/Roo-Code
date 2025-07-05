export function getReadReferenceFileDescription(): string {
	return `## read_reference_file
Description: Read a file from the reference index. Supports optional line ranges.
Parameters:
- path: (required) Path to the file relative to the reference root.
- start_line: (optional) Starting line number (1-based).
- end_line: (optional) Ending line number (inclusive).
Usage:
<read_reference_file>
<path>path/to/file.ts</path>
<start_line>1</start_line>
<end_line>50</end_line>
</read_reference_file>`
}
