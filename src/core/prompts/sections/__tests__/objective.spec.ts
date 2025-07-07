import { getObjectiveSection } from "../objective"
import type { CodeIndexManager } from "../../../../services/code-index/manager"
import type { ReferenceIndexManager } from "../../../../services/reference-index/manager"

describe("getObjectiveSection", () => {
	// Mock CodeIndexManager with codebase search available
	const mockCodeIndexManagerEnabled = {
		isFeatureEnabled: true,
		isFeatureConfigured: true,
		isInitialized: true,
	} as CodeIndexManager

	// Mock CodeIndexManager with codebase search unavailable
	const mockCodeIndexManagerDisabled = {
		isFeatureEnabled: false,
		isFeatureConfigured: false,
		isInitialized: false,
	} as CodeIndexManager

	// Mock ReferenceIndexManager with reference search available
	const mockReferenceIndexManagerEnabled = {
		isFeatureEnabled: true,
		isFeatureConfigured: true,
		isInitialized: true,
	} as ReferenceIndexManager

	// Mock ReferenceIndexManager with reference search unavailable
	const mockReferenceIndexManagerDisabled = {
		isFeatureEnabled: false,
		isFeatureConfigured: false,
		isInitialized: false,
	} as ReferenceIndexManager

	describe("when codebase_search is available", () => {
		it("should include codebase_search first enforcement in thinking process", () => {
			const objective = getObjectiveSection(mockCodeIndexManagerEnabled, mockReferenceIndexManagerDisabled)

			// Check that the objective includes the codebase_search enforcement
			expect(objective).toContain(
				"if the task involves understanding existing code or functionality, you MUST use the `codebase_search` tool",
			)
			expect(objective).toContain("BEFORE using any other search or file exploration tools")
		})
	})

	describe("when codebase_search is not available", () => {
		it("should not include codebase_search enforcement", () => {
			const objective = getObjectiveSection(mockCodeIndexManagerDisabled, mockReferenceIndexManagerDisabled)

			// Check that the objective does not include the codebase_search enforcement
			expect(objective).not.toContain("you MUST use the `codebase_search` tool")
		})
	})

	describe("when reference_search is available", () => {
		it("should include reference_search enforcement in thinking process", () => {
			const objective = getObjectiveSection(mockCodeIndexManagerDisabled, mockReferenceIndexManagerEnabled)

			// Check that the objective includes the reference_search enforcement
			expect(objective).toContain(
				"if the task involves understanding external library documentation or reference materials, you MUST use the `reference_search` tool",
			)
			expect(objective).toContain("BEFORE using any other search or file exploration tools")
		})
	})

	describe("when both search tools are available", () => {
		it("should include both codebase_search and reference_search enforcement", () => {
			const objective = getObjectiveSection(mockCodeIndexManagerEnabled, mockReferenceIndexManagerEnabled)

			// Check that the objective includes both search tool enforcements
			expect(objective).toContain("you MUST use the `codebase_search` tool")
			expect(objective).toContain("use the `reference_search` tool when appropriate")
		})
	})

	it("should maintain proper structure regardless of search tool availability", () => {
		const objectiveEnabled = getObjectiveSection(mockCodeIndexManagerEnabled, mockReferenceIndexManagerEnabled)
		const objectiveDisabled = getObjectiveSection(mockCodeIndexManagerDisabled, mockReferenceIndexManagerDisabled)

		// Check that all numbered items are present in both cases
		for (const objective of [objectiveEnabled, objectiveDisabled]) {
			expect(objective).toContain("1. Analyze the user's task")
			expect(objective).toContain("2. Work through these goals sequentially")
			expect(objective).toContain("3. Remember, you have extensive capabilities")
			expect(objective).toContain("4. Once you've completed the user's task")
			expect(objective).toContain("5. The user may provide feedback")
		}
	})

	it("should include thinking tags guidance regardless of search tool availability", () => {
		const objectiveEnabled = getObjectiveSection(mockCodeIndexManagerEnabled, mockReferenceIndexManagerEnabled)
		const objectiveDisabled = getObjectiveSection(mockCodeIndexManagerDisabled, mockReferenceIndexManagerDisabled)

		// Check that thinking tags guidance is included in both cases
		for (const objective of [objectiveEnabled, objectiveDisabled]) {
			expect(objective).toContain("<thinking></thinking> tags")
			expect(objective).toContain("analyze the file structure provided in environment_details")
			expect(objective).toContain("think about which of the provided tools is the most relevant")
		}
	})

	it("should include parameter inference guidance regardless of search tool availability", () => {
		const objectiveEnabled = getObjectiveSection(mockCodeIndexManagerEnabled, mockReferenceIndexManagerEnabled)
		const objectiveDisabled = getObjectiveSection(mockCodeIndexManagerDisabled, mockReferenceIndexManagerDisabled)

		// Check parameter inference guidance in both cases
		for (const objective of [objectiveEnabled, objectiveDisabled]) {
			expect(objective).toContain("Go through each of the required parameters")
			expect(objective).toContain(
				"determine if the user has directly provided or given enough information to infer a value",
			)
			expect(objective).toContain("DO NOT invoke the tool (not even with fillers for the missing params)")
			expect(objective).toContain("ask_followup_question tool")
		}
	})
})
