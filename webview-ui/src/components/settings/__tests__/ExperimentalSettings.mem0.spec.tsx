import { render, screen, fireEvent } from "@/utils/test-utils"
import { ExperimentalSettings } from "../ExperimentalSettings"

vi.mock("@/i18n/TranslationContext", () => ({ useAppTranslation: () => ({ t: (k: string) => k }) }))
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeCheckbox: ({ checked, onChange, children }: any) => (
		<label>
			<input type="checkbox" checked={checked} onChange={onChange} />
			{children}
		</label>
	),
	VSCodeTextField: ({ value, onChange }: any) => <input value={value} onChange={onChange} />,
	VSCodeLink: ({ children }: any) => <a>{children}</a>,
}))

describe("ExperimentalSettings mem0", () => {
	it("updates cached state", () => {
		const setCachedStateField = vi.fn()
		render(
			<ExperimentalSettings
				experiments={{}}
				setExperimentEnabled={() => {}}
				codebaseIndexModels={undefined}
				codebaseIndexConfig={undefined}
				referenceIndexModels={undefined}
				referenceIndexConfig={undefined}
				mem0Enabled={false}
				mem0ApiServerUrl=""
				llmConversationStoragePath=".roo/conversations"
				setCachedStateField={setCachedStateField}
			/>,
		)
		const checkbox = screen.getByRole("checkbox")
		fireEvent.click(checkbox)
		expect(setCachedStateField).toHaveBeenCalledWith("mem0Enabled", true)
	})
})
