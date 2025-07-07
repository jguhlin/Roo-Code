import React, { useState, useEffect, useMemo } from "react"
import { cn } from "@src/lib/utils"
import { vscode } from "@src/utils/vscode"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { useTooltip } from "@/hooks/useTooltip"
import type { IndexingStatus } from "@roo/ExtensionMessage"

interface ReferenceIndexStatusDotProps {
	className?: string
}

export const ReferenceIndexStatusDot: React.FC<ReferenceIndexStatusDotProps> = ({ className }) => {
	const { t } = useAppTranslation()
	const { showTooltip, handleMouseEnter, handleMouseLeave, cleanup } = useTooltip({ delay: 300 })
	const [isHovered, setIsHovered] = useState(false)

	// Using placeholder status until backend integration is complete
	const [referenceIndexStatus, setReferenceIndexStatus] = useState<IndexingStatus>({
		systemStatus: "Standby",
		processedItems: 0,
		totalItems: 0,
		currentItemUnit: "references",
	})

	useEffect(() => {
		// Request initial reference index status
		vscode.postMessage({ type: "requestReferenceIndexStatus" })

		// Set up message listener for status updates
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === "referenceIndexStatusUpdate") {
				const status = event.data.values as IndexingStatus
				setReferenceIndexStatus(status)
			}
		}
		window.addEventListener("message", handleMessage)

		return () => {
			window.removeEventListener("message", handleMessage)
			cleanup()
		}
	}, [cleanup])

	// Calculate progress percentage with memoization
	const progressPercentage = useMemo(
		() =>
			referenceIndexStatus.totalItems > 0
				? Math.round((referenceIndexStatus.processedItems / referenceIndexStatus.totalItems) * 100)
				: 0,
		[referenceIndexStatus.processedItems, referenceIndexStatus.totalItems],
	)

	// Get tooltip text with internationalization
	const getTooltipText = () => {
		switch (referenceIndexStatus.systemStatus) {
			case "Standby":
				return t("chat:referenceIndexStatus.ready")
			case "Indexing":
				return t("chat:referenceIndexStatus.indexing", { percentage: progressPercentage })
			case "Indexed":
				return t("chat:referenceIndexStatus.indexed")
			case "Error":
				return t("chat:referenceIndexStatus.error")
			default:
				return t("chat:referenceIndexStatus.status")
		}
	}

	const handleMouseEnterButton = () => {
		setIsHovered(true)
		handleMouseEnter()
	}

	const handleMouseLeaveButton = () => {
		setIsHovered(false)
		handleMouseLeave()
	}

	// Get status color classes based on status and hover state
	const getStatusColorClass = () => {
		const statusColors = {
			Standby: {
				default: "bg-vscode-descriptionForeground/40",
				hover: "bg-vscode-descriptionForeground/60",
			},
			Indexing: {
				default: "bg-blue-500/40 animate-pulse",
				hover: "bg-blue-500 animate-pulse",
			},
			Indexed: {
				default: "bg-green-500/40",
				hover: "bg-green-500",
			},
			Error: {
				default: "bg-red-500/40",
				hover: "bg-red-500",
			},
		}

		const colors =
			statusColors[referenceIndexStatus.systemStatus as keyof typeof statusColors] || statusColors.Standby
		return isHovered ? colors.hover : colors.default
	}

	return (
		<div className={cn("relative inline-block", className)}>
			<button
				onMouseEnter={handleMouseEnterButton}
				onMouseLeave={handleMouseLeaveButton}
				className={cn(
					"flex items-center justify-center w-7 h-7 rounded-md",
					"bg-transparent hover:bg-vscode-list-hoverBackground",
					"cursor-pointer transition-all duration-200",
					"opacity-85 hover:opacity-100 relative",
				)}
				aria-label={getTooltipText()}>
				{/* Status dot - using slightly different positioning to distinguish from codebase index */}
				<span
					className={cn(
						"inline-block w-2 h-2 rounded-full relative z-10 transition-colors duration-200",
						getStatusColorClass(),
					)}
				/>
				{/* Small reference indicator - a tiny square to distinguish from codebase index */}
				<span
					className={cn(
						"absolute top-1 right-1 w-1 h-1 rounded-sm",
						"bg-vscode-descriptionForeground/30 transition-colors duration-200",
						isHovered && "bg-vscode-descriptionForeground/60",
					)}
				/>
			</button>
			{showTooltip && (
				<div
					className={cn(
						"absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2",
						"px-2 py-1 text-xs font-medium text-vscode-foreground",
						"bg-vscode-editor-background border border-vscode-panel-border",
						"rounded shadow-lg whitespace-nowrap z-50",
					)}
					role="tooltip">
					{getTooltipText()}
					<div
						className={cn(
							"absolute top-full left-1/2 transform -translate-x-1/2",
							"w-0 h-0 border-l-4 border-r-4 border-t-4",
							"border-l-transparent border-r-transparent border-t-vscode-panel-border",
						)}
					/>
				</div>
			)}
		</div>
	)
}
