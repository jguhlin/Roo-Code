import { HTMLAttributes } from "react"
import { FlaskConical } from "lucide-react"
import { VSCodeCheckbox, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { Trans } from "react-i18next"

import type { Experiments, CodebaseIndexConfig, CodebaseIndexModels } from "@roo-code/types"

import { EXPERIMENT_IDS, experimentConfigsMap } from "@roo/experiments"

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
        // For codebase index enabled toggle
        codebaseIndexEnabled?: boolean
        mem0Enabled?: boolean
        mem0ApiServerUrl?: string
        setCachedStateField?: SetCachedStateField<any>
}

export const ExperimentalSettings = ({
	experiments,
	setExperimentEnabled,
        codebaseIndexModels,
        codebaseIndexConfig,
        codebaseIndexEnabled,
        mem0Enabled,
        mem0ApiServerUrl,
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
							<ExperimentalFeature
								key={key}
								experimentKey={key}
								enabled={experiments[experimentId] ?? false}
								onChange={(enabled) => setExperimentEnabled(experimentId, enabled)}
							/>
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
                                </div>

                                {/* Mem0 Settings */}
                                <div className="mt-4">
                                        <div className="flex items-center gap-2">
                                                <VSCodeCheckbox
                                                        checked={mem0Enabled || false}
                                                        onChange={(e: any) => setCachedStateField && setCachedStateField("mem0Enabled", e.target.checked)}>
                                                        <span className="font-medium">{t("settings:mem0.enable.label")}</span>
                                                </VSCodeCheckbox>
                                        </div>
                                        <p className="text-vscode-descriptionForeground text-sm mt-1 ml-6">
                                                {t("settings:mem0.enable.description")}
                                        </p>
                                        {mem0Enabled && (
                                                <VSCodeTextField
                                                        value={mem0ApiServerUrl ?? ""}
                                                        onChange={(e: any) => setCachedStateField && setCachedStateField("mem0ApiServerUrl", e.target.value)}
                                                        placeholder={t("settings:mem0.enable.urlPlaceholder")}
                                                        className="ml-6 mt-2 w-full"
                                                />
                                        )}
                                </div>
                        </Section>
                </div>
        )
}
