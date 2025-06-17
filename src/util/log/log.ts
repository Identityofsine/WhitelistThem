
// this has to be compiled in from esbuild
const logLevel: 'debug' | 'info' = 'info'; // Default to 'info' level

console.log(`Log level is set to: ${logLevel}`);

export namespace log {

	export function debug(...args: any[]) {
		if (logLevel === 'debug') {
			console.debug(...args);
		}
	}

	export function trace(...args: any[]) {
		if (logLevel === 'debug') {
			console.trace(...args);
		}
	}

	export function info(...args: any[]) {
		if (logLevel === 'debug' || logLevel === 'info') {
			console.info(...args);
		}
	}


}
