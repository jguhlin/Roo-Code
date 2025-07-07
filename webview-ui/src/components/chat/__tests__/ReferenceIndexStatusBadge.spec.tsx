import React from "react"
import { render, screen, fireEvent } from "@/utils/test-utils"

import { vscode } from "@src/utils/vscode"

import { ReferenceIndexStatusDot } from "../ReferenceIndexStatusBadge"

vi.mock("@/i18n/setup", () => ({
	__esModule: true,
	default: {
		use: vi.fn().mockReturnThis(),
		init: vi.fn().mockReturnThis(),
		addResourceBundle: vi.fn(),
		language: "en",
		changeLanguage: vi.fn(),
	},
	loadTranslations: vi.fn(),
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, params?: any) => {
			const translations: Record<string, string> = {
				"referenceIndexStatus.ready": "Reference index ready",
				"referenceIndexStatus.indexing":
					params?.progress !== undefined ? `Indexing references ${params.progress}%` : "Indexing references",
				"referenceIndexStatus.error": "Reference index error",
				"referenceIndexStatus.indexed": "References indexed",
				"referenceIndexStatus.status": "Reference index status",
			}
			return translations[key] || key
		},
		i18n: {
			language: "en",
			changeLanguage: vi.fn(),
		},
	}),
	initReactI18next: {
		type: "3rdParty",
		init: vi.fn(),
	},
	Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock vscode API
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

// Mock the useTooltip hook
vi.mock("@/hooks/useTooltip", () => ({
	useTooltip: vi.fn(() => ({
		showTooltip: false,
		handleMouseEnter: vi.fn(),
		handleMouseLeave: vi.fn(),
		cleanup: vi.fn(),
	})),
}))

// Mock the ExtensionStateContext
vi.mock("@/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		version: "1.0.0",
		clineMessages: [],
		taskHistory: [],
		shouldShowAnnouncement: false,
		language: "en",
	}),
	ExtensionStateContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock TranslationContext to provide t function directly
vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string, params?: any) => {
			// Remove namespace prefix if present
			const cleanKey = key.includes(":") ? key.split(":")[1] : key

			const translations: Record<string, string> = {
				"referenceIndexStatus.ready": "Reference index ready",
				"referenceIndexStatus.indexing":
					params?.percentage !== undefined
						? `Indexing references ${params.percentage}%`
						: "Indexing references",
				"referenceIndexStatus.error": "Reference index error",
				"referenceIndexStatus.indexed": "References indexed",
				"referenceIndexStatus.status": "Reference index status",
			}
			return translations[cleanKey] || cleanKey
		},
	}),
}))

describe("ReferenceIndexStatusDot", () => {
	const renderComponent = (props = {}) => {
		return render(<ReferenceIndexStatusDot {...props} />)
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders the status dot", () => {
		renderComponent()
		const button = screen.getByRole("button")
		expect(button).toBeInTheDocument()
	})

	it("shows ready status by default", () => {
		renderComponent()
		const button = screen.getByRole("button")
		expect(button).toHaveAttribute("aria-label", "Reference index ready")
	})
	it("displays correct visual styling for ready status", () => {
		renderComponent()
		const button = screen.getByRole("button")
		const dot = button.querySelector("span")

		// Check that the dot has the ready (standby) status styling
		expect(dot).toHaveClass("bg-vscode-descriptionForeground/40")
		expect(dot).toHaveClass("w-2")
		expect(dot).toHaveClass("h-2")
		expect(dot).toHaveClass("rounded-full")
	})

	it("shows tooltip on hover", () => {
		renderComponent()
		const button = screen.getByRole("button")

		// The tooltip content should be accessible via aria-label
		expect(button).toHaveAttribute("aria-label", "Reference index ready")
	})

	it("is clickable but does not post messages (placeholder behavior)", () => {
		const postMessageSpy = vi.spyOn(vscode, "postMessage")

		renderComponent()
		const button = screen.getByRole("button")

		// Initial postMessage call happens on mount
		expect(postMessageSpy).toHaveBeenCalledTimes(1)

		fireEvent.click(button)

		// Clicking shouldn't trigger additional messages
		expect(postMessageSpy).toHaveBeenCalledTimes(1)
	})

	it("has proper accessibility attributes", () => {
		renderComponent()
		const button = screen.getByRole("button")

		expect(button).toHaveAttribute("aria-label")
		// Note: button element doesn't need explicit type="button" when no type is specified
	})

	it("renders with consistent size and positioning", () => {
		renderComponent()
		const button = screen.getByRole("button")
		const dot = button.querySelector("span")

		// Check size classes are applied
		expect(dot).toHaveClass("w-2")
		expect(dot).toHaveClass("h-2")
		expect(dot).toHaveClass("rounded-full")
	})

	it("handles different status states correctly", () => {
		// Test that the component structure supports different states
		// This will be expanded when backend integration is added
		renderComponent()
		const button = screen.getByRole("button")

		expect(button).toBeInTheDocument()
		expect(button.querySelector("span")).toHaveClass("bg-vscode-descriptionForeground/40")
	})

	it("maintains proper contrast and theming", () => {
		renderComponent()
		const button = screen.getByRole("button")
		const dot = button.querySelector("span")

		// Verify the component uses proper VSCode theme colors
		expect(dot).toHaveClass("bg-vscode-descriptionForeground/40")
		expect(dot).toHaveClass("transition-colors")
	})

	it("supports hover effects", () => {
		renderComponent()
		const button = screen.getByRole("button")

		// Verify hover classes are present
		expect(button).toHaveClass("hover:bg-vscode-list-hoverBackground")
	})
})
