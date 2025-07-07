import { getCapabilitiesSection } from "../capabilities"
import type { CodeIndexManager } from "../../../../services/code-index/manager"
import type { ReferenceIndexManager } from "../../../../services/reference-index/manager"
import type { McpHub } from "../../../../services/mcp/McpHub"

describe("getCapabilitiesSection", () => {
	// Mock CodeIndexManager with codebase search available
	const mockCodeIndexManagerEnabled = {
		isFeatureEnabled: true,
		isFeatureConfigured: true,
		isInitialized: true,
		isReadyForUse: true,
	} as CodeIndexManager

	// Mock CodeIndexManager with codebase search unavailable
	const mockCodeIndexManagerDisabled = {
		isFeatureEnabled: false,
		isFeatureConfigured: false,
		isInitialized: false,
		isReadyForUse: false,
	} as CodeIndexManager

	// Mock ReferenceIndexManager with reference search available
	const mockReferenceIndexManagerEnabled = {
		isFeatureEnabled: true,
		isFeatureConfigured: true,
		isInitialized: true,
		isReadyForUse: true,
	} as ReferenceIndexManager

	// Mock ReferenceIndexManager with reference search unavailable
	const mockReferenceIndexManagerDisabled = {
		isFeatureEnabled: false,
		isFeatureConfigured: false,
		isInitialized: false,
		isReadyForUse: false,
	} as ReferenceIndexManager

	describe("when codebase_search is available", () => {
		it("should include codebase_search documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerEnabled,
				mockReferenceIndexManagerDisabled,
			)

			// Check that codebase_search documentation is included
			expect(capabilities).toContain("You can use the `codebase_search` tool")
			expect(capabilities).toContain("semantic searches across your entire codebase")
			expect(capabilities).toContain("finding functionally relevant code")
		})
	})

	describe("when codebase_search is not available", () => {
		it("should not include codebase_search documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerDisabled,
				mockReferenceIndexManagerDisabled,
			)

			// Check that codebase_search documentation is not included
			expect(capabilities).not.toContain("You can use the `codebase_search` tool")
			expect(capabilities).not.toContain("semantic searches across your entire codebase")
		})
	})

	describe("when reference_search is available", () => {
		it("should include reference_search documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerDisabled,
				mockReferenceIndexManagerEnabled,
			)

			// Check that reference_search documentation is included
			expect(capabilities).toContain("You can use the `reference_search` tool")
			expect(capabilities).toContain("semantic searches across external reference documentation and libraries")
			expect(capabilities).toContain("finding relevant documentation, API references, code examples")
		})
	})

	describe("when reference_search is not available", () => {
		it("should not include reference_search documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerEnabled,
				mockReferenceIndexManagerDisabled,
			)

			// Check that reference_search documentation is not included
			expect(capabilities).not.toContain("You can use the `reference_search` tool")
			expect(capabilities).not.toContain("semantic searches across external reference documentation")
		})
	})

	describe("when both search tools are available", () => {
		it("should include both codebase_search and reference_search documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerEnabled,
				mockReferenceIndexManagerEnabled,
			)

			// Check that both documentations are included
			expect(capabilities).toContain("You can use the `codebase_search` tool")
			expect(capabilities).toContain("You can use the `reference_search` tool")
		})
	})

	describe("when neither search tool is available", () => {
		it("should not include any search tool documentation", () => {
			const capabilities = getCapabilitiesSection(
				"/test/path",
				false,
				undefined,
				undefined,
				mockCodeIndexManagerDisabled,
				mockReferenceIndexManagerDisabled,
			)

			// Check that no search tool documentation is included
			expect(capabilities).not.toContain("You can use the `codebase_search` tool")
			expect(capabilities).not.toContain("You can use the `reference_search` tool")
		})
	})

	it("should always include core capabilities regardless of search tool availability", () => {
		const capabilitiesEnabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerEnabled,
			mockReferenceIndexManagerEnabled,
		)
		const capabilitiesDisabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerDisabled,
			mockReferenceIndexManagerDisabled,
		)

		// Check that core capabilities are always present
		for (const capabilities of [capabilitiesEnabled, capabilitiesDisabled]) {
			expect(capabilities).toContain("execute CLI commands on the user's computer")
			expect(capabilities).toContain("list files, view source code definitions")
			expect(capabilities).toContain("regex search, read and write files")
			expect(capabilities).toContain("ask follow-up questions")
		}
	})

	it("should include search_files documentation regardless of search tool availability", () => {
		const capabilitiesEnabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerEnabled,
			mockReferenceIndexManagerEnabled,
		)
		const capabilitiesDisabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerDisabled,
			mockReferenceIndexManagerDisabled,
		)

		// Check that search_files documentation is always present
		for (const capabilities of [capabilitiesEnabled, capabilitiesDisabled]) {
			expect(capabilities).toContain("search_files to perform regex searches")
			expect(capabilities).toContain("context-rich results that include surrounding lines")
		}
	})

	it("should include list_code_definition_names documentation regardless of search tool availability", () => {
		const capabilitiesEnabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerEnabled,
			mockReferenceIndexManagerEnabled,
		)
		const capabilitiesDisabled = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerDisabled,
			mockReferenceIndexManagerDisabled,
		)

		// Check that list_code_definition_names documentation is always present
		for (const capabilities of [capabilitiesEnabled, capabilitiesDisabled]) {
			expect(capabilities).toContain("list_code_definition_names tool")
			expect(capabilities).toContain("overview of source code definitions")
		}
	})

	it("should include MCP server documentation when mcpHub is provided", () => {
		const mockMcpHub = {} as McpHub // Mock MCP hub

		const capabilitiesWithMcp = getCapabilitiesSection(
			"/test/path",
			false,
			mockMcpHub,
			undefined,
			mockCodeIndexManagerEnabled,
			mockReferenceIndexManagerEnabled,
		)
		const capabilitiesWithoutMcp = getCapabilitiesSection(
			"/test/path",
			false,
			undefined,
			undefined,
			mockCodeIndexManagerDisabled,
			mockReferenceIndexManagerDisabled,
		)

		// Check that MCP documentation is included when mcpHub is provided
		expect(capabilitiesWithMcp).toContain("MCP servers that may provide additional tools")
		expect(capabilitiesWithMcp).toContain("accomplish tasks more effectively")

		// Check that MCP documentation is not included when mcpHub is not provided
		expect(capabilitiesWithoutMcp).not.toContain("MCP servers that may provide additional tools")
	})
})
