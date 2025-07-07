import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { ReferenceIndexStatusDot } from "./ReferenceIndexStatusBadge"
import type { IndexingStatus } from "@roo/ExtensionMessage"
// Mock VSCode webview API
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
		getState: () => undefined,
		setState: () => undefined,
	},
}))

// Mock translation context
vi.mock("@/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string, params?: any) => {
			const translations: Record<string, string> = {
				"chat:referenceIndexStatus.ready": "Reference index ready",
				"chat:referenceIndexStatus.indexing": `Indexing references... ${params?.percentage || 0}%`,
				"chat:referenceIndexStatus.indexed": "Reference index completed",
				"chat:referenceIndexStatus.error": "Reference index error",
				"chat:referenceIndexStatus.status": "Reference index status",
			}
			return translations[key] || key
		},
	}),
}))

// Mock tooltip hook
vi.mock("@/hooks/useTooltip", () => ({
	useTooltip: () => ({
		showTooltip: false,
		handleMouseEnter: vi.fn(),
		handleMouseLeave: vi.fn(),
		cleanup: vi.fn(),
	}),
}))

describe("ReferenceIndexStatusDot", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllTimers()
	})

	it("renders with default standby status", () => {
		render(<ReferenceIndexStatusDot />)

		const button = screen.getByRole("button")
		expect(button).toBeInTheDocument()
		expect(button).toHaveAttribute("aria-label", "Reference index ready")
	})

	it("sends message to request reference index status on mount", async () => {
		const { vscode } = await import("@src/utils/vscode")
		const mockVscode = vi.mocked(vscode)

		render(<ReferenceIndexStatusDot />)

		expect(mockVscode.postMessage).toHaveBeenCalledWith({
			type: "requestReferenceIndexStatus",
		})
	})

	it("updates status when receiving status update message", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate status update message
		const statusUpdate: IndexingStatus = {
			systemStatus: "Indexing",
			processedItems: 50,
			totalItems: 100,
			currentItemUnit: "references",
		}

		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: statusUpdate,
				},
			}),
		)

		await waitFor(() => {
			const button = screen.getByRole("button")
			expect(button).toHaveAttribute("aria-label", "Indexing references... 50%")
		})
	})

	it("applies correct styling for standby status", () => {
		render(<ReferenceIndexStatusDot />)

		const statusDot = screen.getByRole("button").querySelector("span")
		expect(statusDot).toHaveClass("bg-vscode-descriptionForeground/40")
	})

	it("applies correct styling for indexing status with animation", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate indexing status
		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: {
						systemStatus: "Indexing",
						processedItems: 25,
						totalItems: 100,
						currentItemUnit: "references",
					},
				},
			}),
		)

		await waitFor(() => {
			const statusDot = screen.getByRole("button").querySelector("span")
			expect(statusDot).toHaveClass("bg-blue-500/40", "animate-pulse")
		})
	})

	it("applies correct styling for indexed status", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate indexed status
		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: {
						systemStatus: "Indexed",
						processedItems: 100,
						totalItems: 100,
						currentItemUnit: "references",
					},
				},
			}),
		)

		await waitFor(() => {
			const statusDot = screen.getByRole("button").querySelector("span")
			expect(statusDot).toHaveClass("bg-green-500/40")
		})
	})

	it("applies correct styling for error status", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate error status
		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: {
						systemStatus: "Error",
						processedItems: 0,
						totalItems: 100,
						currentItemUnit: "references",
					},
				},
			}),
		)

		await waitFor(() => {
			const statusDot = screen.getByRole("button").querySelector("span")
			expect(statusDot).toHaveClass("bg-red-500/40")
		})
	})

	it("changes styling on hover", async () => {
		render(<ReferenceIndexStatusDot />)

		const button = screen.getByRole("button")

		fireEvent.mouseEnter(button)

		await waitFor(() => {
			const statusDot = button.querySelector("span")
			expect(statusDot).toHaveClass("bg-vscode-descriptionForeground/60")
		})
	})

	it("calculates progress percentage correctly", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate indexing with specific progress
		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: {
						systemStatus: "Indexing",
						processedItems: 75,
						totalItems: 150,
						currentItemUnit: "references",
					},
				},
			}),
		)

		await waitFor(() => {
			const button = screen.getByRole("button")
			expect(button).toHaveAttribute("aria-label", "Indexing references... 50%")
		})
	})

	it("handles zero total items gracefully", async () => {
		render(<ReferenceIndexStatusDot />)

		// Simulate indexing with zero total items
		fireEvent(
			window,
			new MessageEvent("message", {
				data: {
					type: "referenceIndexStatusUpdate",
					values: {
						systemStatus: "Indexing",
						processedItems: 10,
						totalItems: 0,
						currentItemUnit: "references",
					},
				},
			}),
		)

		await waitFor(() => {
			const button = screen.getByRole("button")
			expect(button).toHaveAttribute("aria-label", "Indexing references... 0%")
		})
	})

	it("cleans up event listeners on unmount", () => {
		const removeEventListenerSpy = vi.spyOn(window, "removeEventListener")
		const { unmount } = render(<ReferenceIndexStatusDot />)

		unmount()

		expect(removeEventListenerSpy).toHaveBeenCalledWith("message", expect.any(Function))
	})
})
