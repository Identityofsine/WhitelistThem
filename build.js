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

const entryPoints = {
	background: 'src/background.js',
	index: 'src/index.ts',
};

// --- Lint function ---
async function lint() {
	const eslint = new ESLint();
	const results = await eslint.lintFiles(['src/**/*.ts']);
	const formatter = await eslint.loadFormatter('stylish');
	const resultText = formatter.format(results);
	console.log(resultText);
	const hasErrors = results.some(result => result.errorCount > 0);
	if (hasErrors) {
		console.error('❌ Linting failed.');
		return false; // Don't exit, just return false to indicate failure
	} else {
		console.log('✅ Linting passed.');
		return true;
	}
}

// --- Copy manifest ---
function copyManifest() {
	const manifestPath = `manifest/manifest.${target}`;
	const outputManifestPath = 'dist/manifest.json';
	if (!fs.existsSync(manifestPath)) {
		console.error(`❌ Manifest for target '${target}' not found.`);
		process.exit(1);
	}
	if (!fs.existsSync('dist')) {
		fs.mkdirSync('dist');
	}
	fs.copyFileSync(manifestPath, outputManifestPath);
	console.log(`📄 Copied manifest: ${manifestPath} → dist/manifest.json`);
}

// --- Build function ---
function build() {
	return esbuild.build({
		entryPoints,
		outdir: 'dist',
		bundle: true,
		platform: 'browser',
		target: ['chrome58', 'firefox57'],
		sourcemap: true,
		plugins: [sassPlugin()],
	});
}

// --- Combined pipeline ---
async function run() {
	const lintPassed = await lint();
	// Always proceed with copying manifest and building, even if lint fails
	copyManifest();
	await build();
	if (lintPassed) {
		console.log('✅ Build complete.');
	} else {
		console.log('⚠️ Build complete with lint errors.');
	}
}

// --- Watch mode ---
if (isWatch) {
	console.log('👀 Watching for changes...');
	chokidar.watch('src').on('change', async (changedPath) => {
		console.log(`🔄 Change detected: ${changedPath}`);
		try {
			await run();
		} catch (e) {
			console.error('❌ Build failed:', e.message);
		}
	});

	run();
} else {
	run();
}
