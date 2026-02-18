import globals from 'globals';
import js from '@eslint/js';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly'
			}
		},
		rules: {
			'no-var': 'error',
			'semi': [2, 'always'],
			'indent': ['error', 'tab'],
			'quotes': ['error', 'single'],
			'no-multiple-empty-lines': ['error'],
			'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
			'brace-style': ['error', '1tbs'],
			'eqeqeq': ['error', 'smart'],
			'no-shadow': 'error',
			'no-unused-vars': [
				'error',
				{
					'vars': 'all',
					'args': 'after-used',
					'ignoreRestSiblings': true
				}
			],
			'prefer-const': 'off',
			'require-atomic-updates': 'off',
			'guard-for-in': 'off',
			'no-loss-of-precision': 'off',
			'no-nonoctal-decimal-escape': 'off',
			'no-unsafe-optional-chaining': 'off',
			'no-useless-backreference': 'off',
			'no-useless-catch': 'off',
			'no-undef': 'off'
		}
	},
	{
		ignores: ['node_modules/**', 'test-reports/**']
	}
];
