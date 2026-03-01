import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const config = require('./environment.json');

// Project root
config.projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
config.data = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

// Args
const argv = yargs(hideBin(process.argv)).option('serial', { type: 'boolean' })
	.option('jobs', { alias: ['j', 'workers'], type: 'number' }).parse();
const cliString = (envKey, fallback) => process.env[envKey] !== undefined
	? String(process.env[envKey]).toUpperCase()
	: String(fallback).toUpperCase();
const cliBoolean = (envKey, fallback) => process.env[envKey] !== undefined
	? String(process.env[envKey]).toUpperCase() === 'TRUE'
	: Boolean(fallback);

// Serial
const resolvedSerial = argv.serial !== undefined
	? argv.serial === true
	: cliBoolean('SERIAL', config.SERIAL);
process.env.SERIAL = String(resolvedSerial).toUpperCase();
config.serial = resolvedSerial;

// Argv
if (argv.env && !process.env.SERVER_ENVIRONMENT)
	process.env.SERVER_ENVIRONMENT = String(argv.env).toUpperCase();
if (argv.serverType && !process.env.SERVER_TYPE)
	process.env.SERVER_TYPE = String(argv.serverType).toUpperCase();
if (argv.serverNode && !process.env.SERVER_NODE)
	process.env.SERVER_NODE = String(argv.serverNode).toUpperCase();
if (argv.zimlet !== undefined && process.env.ZIMLET === undefined)
	process.env.ZIMLET = String(argv.zimlet);
if (argv.chat !== undefined && process.env.CHAT === undefined)
	process.env.CHAT = String(argv.chat);
if (argv.configure !== undefined && process.env.CONFIGURE === undefined)
	process.env.CONFIGURE = String(argv.configure);
if (argv.freshSetup !== undefined && process.env.FRESH_SETUP === undefined)
	process.env.FRESH_SETUP = String(argv.freshSetup);
if (argv.showConsoleLog !== undefined && process.env.SHOW_CONSOLE_LOG === undefined)
	process.env.SHOW_CONSOLE_LOG = String(argv.showConsoleLog);

// Server environment and node
const isEnv = value => String(config.serverEnvironment).toUpperCase().includes(value);
const isServerNode = value => String(config.serverNode).toUpperCase().includes(value);

/* ---------------- CLI / ENV overrides ---------------- */
config.serverType = cliString('SERVER_TYPE', config.SERVER_TYPE);
config.serverNode = cliString('SERVER_NODE', config.SERVER_NODE);
config.serverEnvironment = cliString('SERVER_ENVIRONMENT', config.SERVER_ENVIRONMENT);
config.zimlet = cliBoolean('ZIMLET', config.ZIMLET);
config.chat = cliBoolean('CHAT', config.CHAT);
config.configure = cliBoolean('CONFIGURE', config.CONFIGURE);
config.freshSetup = cliBoolean('FRESH_SETUP', config.FRESH_SETUP);
config.showConsoleLog = cliBoolean('SHOW_CONSOLE_LOG', config.SHOW_CONSOLE_LOG);

// Jobs logic (authoritative source = config.serial, CLI overrides always win)
if (argv.jobs !== undefined)
	process.env.JOBS = String(argv.jobs);
else if (argv.j !== undefined)
	process.env.JOBS = String(argv.j);
else if (argv.workers !== undefined)
	process.env.JOBS = String(argv.workers);
else if (process.env.JOBS === undefined)
	process.env.JOBS = resolvedSerial === true ? '1' : '20';
if (resolvedSerial === true) {
	process.env.JOBS = '1';
}

// Jobs → config
const parsedJobs = Number(process.env.JOBS);
config.jobs = Number.isInteger(parsedJobs) && parsedJobs > 0
	? parsedJobs
	: (resolvedSerial === true ? 1 : 20);

const serverConfig = config[config.serverEnvironment];
Object.assign(config, {
	serverHost: serverConfig.serverHost, clientHostURL: serverConfig.clientHostURL,
	serverHostURL: serverConfig.serverHostURL, serverUser: serverConfig.serverUser,
	adminPort: serverConfig.adminPort, clientPort: serverConfig.clientPort,
	smtpPort: serverConfig.smtpPort, adminPassword: process.env.ZIMBRA_ADMIN_PASSWORD,
	accountPassword: process.env.ZIMBRA_ACCOUNT_PASSWORD
});

// Domain and admin email
config.serverDomain = isEnv('ZIMBRAX') ? 'zmc.com' : config.serverHost;
config.adminEmailAddress = `admin@${config.serverDomain}`;

// Multinode
if (isServerNode('MULTINODE') || isEnv('MULTINODE')) {
	config.mailboxServerHost1 = serverConfig.STORE1.serverHost;
	config.mailboxServerHost2 = serverConfig.STORE2.serverHost;
}

// Chat
if (config.chat === true) {
	config.zulipServer = serverConfig.zulipServer;
	config.zulipSecret = process.env.ZIMBRA_ZULIP_SECRET;

	config.zulipServerIpAddress =
		/ZIMBRA101_(MASTER|RELEASE|AUTOMATION)/.test(config.serverEnvironment)
			? process.env.ZIMBRA_ZULIP_SERVER_IP_RELEASE
			: process.env.ZIMBRA_ZULIP_SERVER_IP_DEV;
}

// Sleep
if (isEnv('ZIMBRAX')) {
	Object.assign(config, {
		lowSleep: 1000, mediumSleep: 2000, highSleep: 3000, pollingInterval: 3000, soapResponseTimeout: 20000
	});
} else if (isServerNode('MULTINODE')) {
	Object.assign(config, {
		lowSleep: 500, mediumSleep: 1000, highSleep: 2000, pollingInterval: 3000, soapResponseTimeout: 20000
	});
} else {
	Object.assign(config, {
		lowSleep: 250, mediumSleep: 500, highSleep: 750, pollingInterval: 2000, soapResponseTimeout: 20000
	});
}

export default config;