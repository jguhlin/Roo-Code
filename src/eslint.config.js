import { config } from "@roo-code/config-eslint"
import globals from "globals"

export default [
	...config,
	{
		files: ["**/*.mjs", "eslint.config.mjs"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
]
