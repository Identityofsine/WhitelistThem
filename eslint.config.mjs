import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import parserTs from '@typescript-eslint/parser';
import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

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
				tsconfigRootDir: process.cwd(),
			},
			globals: {
				...globals.node,
				...globals.browser,
				...globals.webextensions,
				"chrome": "readonly",
				"browser": "readonly",
				"__LOGLEVEL__": "readonly",
			}
		},
		plugins: {
			'@typescript-eslint': eslintPluginTs,
			'import': importPlugin,
		},
		settings: {
			'import/resolver': {
				typescript: {
					alwaysTryTypes: true,
					project: './tsconfig.json',
				},
				node: {
					extensions: ['.js', '.jsx', '.ts', '.tsx']
				}
			}
		},
		rules: {
			// TypeScript specific rules
			'@typescript-eslint/no-unused-vars': ['error', { 
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			'@typescript-eslint/explicit-function-return-type': ['warn', {
				allowExpressions: true,
				allowTypedFunctionExpressions: true,
				allowHigherOrderFunctions: true
			}],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
			'@typescript-eslint/consistent-type-imports': ['error', {
				prefer: 'type-imports',
				disallowTypeAnnotations: false
			}],
			'@typescript-eslint/no-import-type-side-effects': 'error',

			// Import/Export rules
			'import/order': ['error', {
				groups: [
					'builtin',
					'external',
					'internal',
					'parent',
					'sibling',
					'index'
				],
				'newlines-between': 'always',
				alphabetize: {
					order: 'asc',
					caseInsensitive: true
				}
			}],
			'import/no-duplicates': 'error',
			'import/no-unresolved': 'error',
			'import/no-unused-modules': 'warn',
			'import/no-cycle': 'error',
			'import/newline-after-import': 'error',

			// General JavaScript/TypeScript rules
			'no-unused-vars': 'off', // Disabled in favor of @typescript-eslint version
			'no-case-declarations': 'off',
			'no-useless-escape': 'off',
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'error',
			'prefer-template': 'error',
			'template-curly-spacing': 'error',
			'arrow-spacing': 'error',
			'comma-dangle': ['error', 'always-multiline'],
			'semi': ['error', 'always'],
			'quotes': ['error', 'single', { avoidEscape: true }],
			'indent': ['error', 'tab', { SwitchCase: 1 }],
			'no-trailing-spaces': 'error',
			'eol-last': 'error',
			'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],

			// Browser Extension specific
			'no-undef': 'error',
			'no-unused-expressions': ['error', {
				allowShortCircuit: true,
				allowTernary: true
			}],
		},
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.browser,
			}
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'no-console': 'off', // Allow console in JS files (like build scripts)
		}
	},
	{
		files: ['build.js', '*.config.*'],
		languageOptions: {
			globals: {
				...globals.node,
				require: 'readonly',
				module: 'readonly',
				process: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
			}
		},
		rules: {
			'no-console': 'off',
			'@typescript-eslint/no-var-requires': 'off',
		}
	}
];
