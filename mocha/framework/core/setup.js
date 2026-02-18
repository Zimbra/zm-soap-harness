import common from './common.js';

// Suppress Node.js warnings (e.g., TLS certificate warnings)
process.removeAllListeners('warning');

// Suppress NODE_TLS_REJECT_UNAUTHORIZED warning (workers + master)
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
if (typeof warning === 'string' && warning.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
	return;
}
return originalEmitWarning(warning, ...args);
};

async function init() {
	if (!process.env.CONFIG_INITIALIZE) {
		const context = {};
		await common.configuration(import.meta.url, context);
		process.env.CONFIG_INITIALIZE = 'true';
	}

	process.on('exit', () => {
		delete process.env.CONFIG_INITIALIZE;
	});
}

export async function runSetupOnce() {
	await init();
}

export const mochaGlobalSetup = async function () {
	await init();
};