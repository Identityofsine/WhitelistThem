const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');
const chokidar = require('chokidar');

// --- CLI args ---
const args = process.argv.slice(2);
const isWatch = args.includes('--watch');
const targetArg = args.find(arg => arg.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'chrome';
const isDebug = args.includes('--debug');
const isProduction = args.includes('--production');
const skipLint = args.includes('--skip-lint');
const skipTypeCheck = args.includes('--skip-typecheck');
const loglevel = isDebug ? 'debug' : 'info';

const entryPoints = {
	background: 'src/background.js',
	index: 'src/index.ts',
};

// --- Utility functions ---
function logWithTimestamp(message, type = 'info') {
	const timestamp = new Date().toLocaleTimeString();
	const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
	console.log(`${prefix} [${timestamp}] ${message}`);
}

function ensureDistDir() {
	if (!fs.existsSync('dist')) {
		fs.mkdirSync('dist', { recursive: true });
		logWithTimestamp('Created dist directory', 'info');
	}
}

// --- TypeScript check function ---
async function typeCheck() {
	if (skipTypeCheck) {
		logWithTimestamp('Skipping TypeScript type checking (--skip-typecheck flag)', 'warn');
		return true;
	}

	logWithTimestamp('Running TypeScript type checking...', 'info');
	const { spawn } = require('child_process');

	// Use the build config for more relaxed checking
	const configFlag = isProduction ? '--project ./tsconfig.json' : '--project ./tsconfig.build.json';

	return new Promise((resolve) => {
		const tsc = spawn('npx', ['tsc', '--noEmit', configFlag], {
			stdio: 'pipe',
			shell: true
		});

		let output = '';
		let errorOutput = '';

		tsc.stdout.on('data', (data) => {
			output += data.toString();
		});

		tsc.stderr.on('data', (data) => {
			errorOutput += data.toString();
		});

		tsc.on('close', (code) => {
			if (code === 0) {
				logWithTimestamp('TypeScript type checking passed', 'success');
				resolve(true);
			} else {
				logWithTimestamp('TypeScript type checking failed:', 'error');
				console.log(output || errorOutput);
				resolve(false);
			}
		});
	});
}

// --- Enhanced lint function ---
async function lint() {
	if (skipLint) {
		logWithTimestamp('Skipping linting (--skip-lint flag)', 'warn');
		return true;
	}

	logWithTimestamp('Running ESLint...', 'info');
	try {
		const eslint = new ESLint({
			fix: !isProduction, // Auto-fix in development
		});

		const results = await eslint.lintFiles([
			'src/**/*.ts',
			'src/**/*.tsx',
			'src/**/*.js',
		]);

		// Apply auto-fixes if not in production
		if (!isProduction) {
			await ESLint.outputFixes(results);
		}

		const formatter = await eslint.loadFormatter('stylish');
		const resultText = formatter.format(results);

		if (resultText) {
			console.log(resultText);
		}

		const hasErrors = results.some(result => result.errorCount > 0);
		const hasWarnings = results.some(result => result.warningCount > 0);

		if (hasErrors) {
			logWithTimestamp('Linting failed with errors', 'error');
			return false;
		} else if (hasWarnings) {
			logWithTimestamp('Linting passed with warnings', 'warn');
			return true;
		} else {
			logWithTimestamp('Linting passed', 'success');
			return true;
		}
	} catch (error) {
		logWithTimestamp(`ESLint error: ${error.message}`, 'error');
		return false;
	}
}

// --- Copy manifest with validation ---
function copyManifest() {
	const manifestPath = `manifest/manifest.${target}`;
	const outputManifestPath = 'dist/manifest.json';

	if (!fs.existsSync(manifestPath)) {
		logWithTimestamp(`Manifest for target '${target}' not found at ${manifestPath}`, 'error');
		process.exit(1);
	}

	try {
		// Validate JSON
		const manifestContent = fs.readFileSync(manifestPath, 'utf8');
		const manifest = JSON.parse(manifestContent);

		// Write formatted JSON
		fs.writeFileSync(outputManifestPath, JSON.stringify(manifest, null, 2));
		logWithTimestamp(`Copied and validated manifest: ${manifestPath} → dist/manifest.json`, 'success');
	} catch (error) {
		logWithTimestamp(`Invalid manifest JSON: ${error.message}`, 'error');
		process.exit(1);
	}
}

// --- Enhanced build function ---
async function build() {
	logWithTimestamp(`Building for ${target} (${isProduction ? 'production' : 'development'})...`, 'info');

	try {
		const result = await esbuild.build({
			entryPoints,
			outdir: 'dist',
			bundle: true,
			platform: 'browser',
			target: ['chrome88', 'firefox78'], // Updated targets
			format: 'iife',
			sourcemap: !isProduction,
			minify: isProduction,
			define: {
				__LOGLEVEL__: JSON.stringify(loglevel),
				'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
			},
			plugins: [
				sassPlugin({
					type: 'css',
					cache: true,
				}),
				// Custom plugin for path resolution
				{
					name: 'resolve-paths',
					setup(build) {
						build.onResolve({ filter: /^@\// }, args => {
							const pathWithoutPrefix = args.path.replace(/^@\//, '');
							return {
								path: path.resolve('./src', pathWithoutPrefix),
							};
						});
					},
				},
			],
			loader: {
				'.png': 'dataurl',
				'.jpg': 'dataurl',
				'.jpeg': 'dataurl',
				'.gif': 'dataurl',
				'.svg': 'text',
			},
			alias: {
				'@': path.resolve('./src'),
			},
			metafile: isDebug,
			logLevel: 'error', // Reduce esbuild noise
		});

		if (isDebug && result.metafile) {
			// Write build analysis
			fs.writeFileSync('dist/metafile.json', JSON.stringify(result.metafile, null, 2));
			logWithTimestamp('Build metafile written to dist/metafile.json', 'info');
		}

		logWithTimestamp('Build completed successfully', 'success');
		return true;
	} catch (error) {
		logWithTimestamp(`Build failed: ${error.message}`, 'error');
		if (error.errors) {
			error.errors.forEach(err => console.error(err));
		}
		return false;
	}
}

// --- Clean function ---
function clean() {
	if (fs.existsSync('dist')) {
		fs.rmSync('dist', { recursive: true, force: true });
		logWithTimestamp('Cleaned dist directory', 'info');
	}
}

// --- Combined pipeline ---
async function runBuild() {
	const startTime = Date.now();

	// Clean in production or if explicitly requested
	if (isProduction || args.includes('--clean')) {
		clean();
	}

	ensureDistDir();

	// Run checks in parallel where possible
	const [lintPassed, typeCheckPassed] = await Promise.all([
		lint(),
		typeCheck(),
	]);

	// Copy manifest (always do this)
	copyManifest();

	// Build regardless of lint/type check results in development
	const buildPassed = await build();

	const endTime = Date.now();
	const duration = ((endTime - startTime) / 1000).toFixed(2);

	if (buildPassed && lintPassed && typeCheckPassed) {
		logWithTimestamp(`✨ Build completed successfully in ${duration}s`, 'success');
		return true;
	} else if (buildPassed) {
		logWithTimestamp(`⚠️ Build completed with issues in ${duration}s`, 'warn');
		return true;
	} else {
		logWithTimestamp(`💥 Build failed in ${duration}s`, 'error');
		return false;
	}
}

// --- Watch mode with debouncing ---
if (isWatch) {
	logWithTimestamp('👀 Starting watch mode...', 'info');

	let buildTimeout;
	const debounceBuild = () => {
		clearTimeout(buildTimeout);
		buildTimeout = setTimeout(async () => {
			logWithTimestamp('🔄 Changes detected, rebuilding...', 'info');
			try {
				await runBuild();
			} catch (error) {
				logWithTimestamp(`Build error: ${error.message}`, 'error');
			}
		}, 200); // 200ms debounce
	};

	const watcher = chokidar.watch(['src/**/*', 'manifest/**/*'], {
		ignored: ['**/node_modules/**', '**/dist/**'],
		persistent: true,
	});

	watcher
		.on('change', (changedPath) => {
			logWithTimestamp(`📝 Changed: ${changedPath}`, 'info');
			debounceBuild();
		})
		.on('add', (addedPath) => {
			logWithTimestamp(`➕ Added: ${addedPath}`, 'info');
			debounceBuild();
		})
		.on('unlink', (removedPath) => {
			logWithTimestamp(`🗑️ Removed: ${removedPath}`, 'info');
			debounceBuild();
		});

	// Initial build
	runBuild().then(success => {
		if (success) {
			logWithTimestamp('👀 Watching for changes... (Press Ctrl+C to stop)', 'info');
		} else {
			logWithTimestamp('Initial build failed, but continuing to watch...', 'warn');
		}
	});

	// Graceful shutdown
	process.on('SIGINT', () => {
		logWithTimestamp('👋 Shutting down...', 'info');
		watcher.close();
		process.exit(0);
	});
} else {
	// Single build
	runBuild().then(success => {
		process.exit(success ? 0 : 1);
	});
}
