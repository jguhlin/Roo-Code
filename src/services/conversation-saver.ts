import { promises as fs } from "fs"
import * as path from "path"
import { EXPERIMENT_IDS, experiments, experimentConfigsMap } from "../shared/experiments"
import type { Experiments } from "@roo-code/types"
import { ContextProxy } from "../core/config/ContextProxy"
import { getWorkspaceRoot } from "../core/environment"
import { safeWriteJson } from "../utils/safeWriteJson"

export class ConversationSaver {
	private storagePath: string

	constructor(
		private experiments: Experiments,
		private contextProxy: ContextProxy,
	) {
		const config = experimentConfigsMap.LLM_CONVERSATION_SAVING
		this.storagePath =
			(this.contextProxy.getGlobalState("llmConversationStoragePath") as string | undefined) ??
			(config.settings?.storagePath?.default || ".roo/conversations")
	}

	async saveConversation(conversation: any[], taskId: string) {
		if (!this.isEnabled()) return

		try {
			const root = await getWorkspaceRoot()
			const savePath = path.join(root, this.storagePath)
			// safeWriteJson creates directories automatically

			const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
			const filename = `conversation-${taskId}-${timestamp}.json`
			const filePath = path.join(savePath, filename)

			await safeWriteJson(filePath, conversation)
		} catch (error) {
			console.error("Failed to save conversation:", error)
		}
	}

	private isEnabled(): boolean {
		return experiments.isEnabled(this.experiments, EXPERIMENT_IDS.LLM_CONVERSATION_SAVING)
	}
}
