declare const __LOGLEVEL__: 'info' | 'debug';

declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production';
	}
}

// Browser Extension API augmentations
declare global {
	interface Window {
		chrome?: typeof chrome;
		browser?: typeof browser;
	}
}

// Module declarations for non-TypeScript files
declare module '*.scss' {
	const content: string;
	export default content;
}

declare module '*.css' {
	const content: string;
	export default content;
}

declare module '*.png' {
	const content: string;
	export default content;
}

declare module '*.jpg' {
	const content: string;
	export default content;
}

declare module '*.jpeg' {
	const content: string;
	export default content;
}

declare module '*.gif' {
	const content: string;
	export default content;
}

declare module '*.svg' {
	const content: string;
	export default content;
}

export {}; 
