import { HTMLAttributes } from "react"
import { FlaskConical } from "lucide-react"
import { VSCodeCheckbox, VSCodeLink, VSCodeTextField, VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { Trans } from "react-i18next"

import type {
	Experiments,
	CodebaseIndexConfig,
	CodebaseIndexModels,
	ReferenceIndexConfig,
	ReferenceIndexModels,
} from "@roo-code/types"

import { EXPERIMENT_IDS, experimentConfigsMap } from "@roo/experiments"
import { CodeIndexPopover } from "@/components/chat/CodeIndexPopover"
import { ReferenceIndexPopover } from "@/components/chat/ReferenceIndexPopover"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { cn } from "@src/lib/utils"
import { buildDocLink } from "@src/utils/docLinks"

import { SetExperimentEnabled } from "./types"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { ExperimentalFeature } from "./ExperimentalFeature"
import { SetCachedStateField } from "./types"

type ExperimentalSettingsProps = HTMLAttributes<HTMLDivElement> & {
	experiments: Experiments
	setExperimentEnabled: SetExperimentEnabled
	// CodeIndexSettings props
	codebaseIndexModels: CodebaseIndexModels | undefined
	codebaseIndexConfig: CodebaseIndexConfig | undefined
	referenceIndexModels: ReferenceIndexModels | undefined
	referenceIndexConfig: ReferenceIndexConfig | undefined
	// For codebase index enabled toggle
	codebaseIndexEnabled?: boolean
	referenceIndexEnabled?: boolean
	mem0Enabled?: boolean
	mem0ApiServerUrl?: string
	llmConversationStoragePath?: string
	setCachedStateField?: SetCachedStateField<any>
}

export const ExperimentalSettings = ({
	experiments,
	setExperimentEnabled,
	codebaseIndexModels,
	codebaseIndexConfig,
	referenceIndexModels,
	referenceIndexConfig,
	codebaseIndexEnabled,
	referenceIndexEnabled,
	mem0Enabled,
	mem0ApiServerUrl,
	llmConversationStoragePath,
	setCachedStateField,
	className,
	...props
}: ExperimentalSettingsProps) => {
	const { t } = useAppTranslation()

	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			<SectionHeader>
				<div className="flex items-center gap-2">
					<FlaskConical className="w-4" />
					<div>{t("settings:sections.experimental")}</div>
				</div>
			</SectionHeader>

			<Section>
				{Object.entries(experimentConfigsMap)
					.filter(([key]) => key in EXPERIMENT_IDS)
					.map(([key]) => {
						const experimentId = EXPERIMENT_IDS[key as keyof typeof EXPERIMENT_IDS]
						return (
							<div key={key}>
								<ExperimentalFeature
									experimentKey={key}
									enabled={experiments[experimentId] ?? false}
									onChange={(enabled) => setExperimentEnabled(experimentId, enabled)}
								/>
								{experimentId === EXPERIMENT_IDS.LLM_CONVERSATION_SAVING &&
									experiments.llmConversationSaving && (
										<VSCodeTextField
											value={llmConversationStoragePath ?? ""}
											onChange={(e: any) =>
												setCachedStateField &&
												setCachedStateField("llmConversationStoragePath", e.target.value)
											}
											placeholder=".roo/conversations"
											className="w-full ml-6 mt-2"
											aria-label="Conversation Storage Path"
										/>
									)}
							</div>
						)
					})}

				{/* Codebase Indexing Enable/Disable Toggle */}
				<div className="mt-4">
					<div className="flex items-center gap-2">
						<VSCodeCheckbox
							checked={codebaseIndexEnabled || false}
							onChange={(e: any) => {
								const newEnabledState = e.target.checked
								if (setCachedStateField && codebaseIndexConfig) {
									setCachedStateField("codebaseIndexConfig", {
										...codebaseIndexConfig,
										codebaseIndexEnabled: newEnabledState,
									})
								}
							}}>
							<span className="font-medium">{t("settings:codeIndex.enableLabel")}</span>
						</VSCodeCheckbox>
					</div>
					<p className="text-vscode-descriptionForeground text-sm mt-1 ml-6">
						<Trans i18nKey="settings:codeIndex.enableDescription">
							<VSCodeLink
								href={buildDocLink("features/experimental/codebase-indexing", "settings")}
								style={{ display: "inline" }}></VSCodeLink>
						</Trans>
					</p>
					{codebaseIndexEnabled && (
						<div className="ml-6 mt-2">
							<CodeIndexPopover
								indexingStatus={{
									systemStatus: "Standby",
									processedItems: 0,
									totalItems: 0,
									currentItemUnit: "items",
								}}>
								<VSCodeButton>{t("settings:codeIndex.settingsTitle")}</VSCodeButton>
							</CodeIndexPopover>
						</div>
					)}
				</div>

				{/* Reference Index Enable/Disable Toggle */}
				<div className="mt-4">
					<div className="flex items-center gap-2">
						<VSCodeCheckbox
							checked={referenceIndexEnabled || false}
							onChange={(e: any) => {
								const newEnabledState = e.target.checked
								if (setCachedStateField && referenceIndexConfig) {
									setCachedStateField("referenceIndexConfig", {
										...referenceIndexConfig,
										referenceIndexEnabled: newEnabledState,
									})
								}
							}}>
							<span className="font-medium">{t("settings:referenceIndex.enableLabel")}</span>
						</VSCodeCheckbox>
					</div>
					<p className="text-vscode-descriptionForeground text-sm mt-1 ml-6">
						<Trans i18nKey="settings:referenceIndex.enableDescription">
							<VSCodeLink
								href={buildDocLink("features/experimental/reference-index", "settings")}
								style={{ display: "inline" }}></VSCodeLink>
						</Trans>
					</p>
					{referenceIndexEnabled && (
						<div className="ml-6 mt-2">
							<ReferenceIndexPopover
								indexingStatus={{
									systemStatus: "Standby",
									processedItems: 0,
									totalItems: 0,
									currentItemUnit: "items",
								}}>
								<VSCodeButton>{t("settings:codeIndex.settingsTitle")}</VSCodeButton>
							</ReferenceIndexPopover>
						</div>
					)}
				</div>

				{/* Mem0 Settings */}
				<div className="mt-4">
					<div className="flex items-center gap-2">
						<VSCodeCheckbox
							checked={mem0Enabled || false}
							onChange={(e: any) =>
								setCachedStateField && setCachedStateField("mem0Enabled", e.target.checked)
							}>
							<span className="font-medium">{t("settings:mem0.enable.label")}</span>
						</VSCodeCheckbox>
					</div>
					<p className="text-vscode-descriptionForeground text-sm mt-1 ml-6">
						{t("settings:mem0.enable.description")}
					</p>
					{mem0Enabled && (
						<VSCodeTextField
							value={mem0ApiServerUrl ?? ""}
							onChange={(e: any) =>
								setCachedStateField && setCachedStateField("mem0ApiServerUrl", e.target.value)
							}
							placeholder={t("settings:mem0.enable.urlPlaceholder")}
							className="ml-6 mt-2 w-full"
						/>
					)}
				</div>
			</Section>
		</div>
	)
}
