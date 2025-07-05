export function getReferenceSearchDescription(): string {
	return `## reference_search
Description: Search the reference index for documentation or source examples relevant to the query. This uses semantic search on a read-only index of external libraries or docs. If needed, scope the search to a directory with the optional path parameter. Queries must be in English.
Parameters:
- query: (required) The search query. Prefer using the user's exact wording.
- path: (optional) Directory path within the reference root to search.
Usage:
<reference_search>
<query>Your question here</query>
<path>optional/subdir</path>
</reference_search>`
}
