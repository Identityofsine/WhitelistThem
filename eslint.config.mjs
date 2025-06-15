import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parser: parserTs,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				project: './tsconfig.json',
			},
			globals: {
				...globals.node,
				...globals.browser,
				"chrome": "readonly",
				"browser": "readonly",
				"__LOGLEVEL__": "readonly",
			}
		},
		plugins: {
			'@typescript-eslint': eslintPluginTs,
		},
		rules: {
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'no-unused-vars': 'warn', // Disable base rule as it's already handled by @typescript-eslint
			'no-case-declarations': 'off', // Allow case declarations in switch statements
			'no-useless-escape': 'off', // Allow unnecessary escapes in strings

		},
	},
];
