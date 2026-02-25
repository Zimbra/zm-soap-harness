import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const config = require('./environment.json');
const argv = yargs(hideBin(process.argv)).argv;

// CLI (check argv first, then ZM_CLI_* env vars from mocha-run.js for parallel workers)
const cliString = (key, fallback) => {
	if (typeof argv[key] !== 'undefined' && argv[key] !== '') {
		return String(argv[key]).toUpperCase();
	}
	const envKey = 'ZM_CLI_' + key.toUpperCase();
	if (process.env[envKey]) {
		return String(process.env[envKey]).toUpperCase();
	}
	return String(fallback).toUpperCase();
};

const cliBoolean = (key, fallback) =>
	typeof argv[key] === 'undefined' || argv[key] === ''
		? Boolean(fallback)
		: argv[key] === 'true';

const isEnv = value => String(config.serverEnvironment).toUpperCase().includes(value);
const isNode = value => String(config.serverNode).toUpperCase().includes(value);

/* ---------------- CLI overrides ---------------- */
config.serverType = cliString('serverType', config.SERVER_TYPE);
config.serverNode = cliString('serverNode', config.SERVER_NODE);
config.serverEnvironment = cliString('env', config.SERVER_ENVIRONMENT);
config.chat = cliBoolean('chat', config.CHAT);
config.serial = cliBoolean('serial', config.SERIAL);
config.configure = cliBoolean('configure', config.CONFIGURE);
config.freshSetup = cliBoolean('freshSetup', config.FRESH_SETUP);
config.showConsoleLog = cliBoolean('showConsoleLog', config.SHOW_CONSOLE_LOG);

const serverConfig = config[config.serverEnvironment];
Object.assign(config, {
	serverHost: serverConfig.serverHost,
	clientHostURL: serverConfig.clientHostURL,
	serverHostURL: serverConfig.serverHostURL,
	serverUser: serverConfig.serverUser,
	adminPort: serverConfig.adminPort,
	clientPort: serverConfig.clientPort,
	smtpPort: serverConfig.smtpPort,
	adminPassword: process.env.ZIMBRA_ADMIN_PASSWORD,
	accountPassword: process.env.ZIMBRA_ACCOUNT_PASSWORD
});
config.serverDomain = isEnv('ZIMBRAX') ? 'zmc.com' : config.serverHost;
config.adminEmailAddress = `admin@${config.serverDomain}`;

// Chat
if (config.chat === true) {
	config.zulipServer = serverConfig.zulipServer;
	config.zulipSecret = process.env.ZIMBRA_ZULIP_SECRET;
}

// Multinode
if (isNode('MULTINODE')) {
	config.mailboxServerHost1 = serverConfig.STORE1.serverHost;
	config.mailboxServerHost2 = serverConfig.STORE2.serverHost;
}

// Sleep
if (isEnv('ZIMBRAX')) {
	Object.assign(config, {
		lowSleep: 1000, mediumSleep: 2000, highSleep: 3000, pollingInterval: 3000, soapResponseTimeout: 20000
	});
} else if (isNode('MULTINODE')) {
	Object.assign(config, {
		lowSleep: 500, mediumSleep: 1000, highSleep: 2000, pollingInterval: 3000, soapResponseTimeout: 20000
	});
} else {
	Object.assign(config, {
		lowSleep: 250, mediumSleep: 500, highSleep: 750, pollingInterval: 2000, soapResponseTimeout: 20000
	});
}

config.zulipServerIpAddress =
	/ ZIMBRA101_(MASTER|RELEASE|AUTOMATION) /.test(config.serverEnvironment)
		? process.env.ZIMBRA_ZULIP_SERVER_IP_RELEASE
		: process.env.ZIMBRA_ZULIP_SERVER_IP_DEV;

export const {
	serverType, serverNode, serverEnvironment, serverHost, serverUser,
	adminPort, clientPort, popPort, imapPort, smtpPort,
	chat, serial, configure, freshSetup, showConsoleLog,
	adminEmailAddress, adminPassword, accountPassword,
	zulipServer, zulipSecret, zulipServerIpAddress,
	testDomain, chatDomain, testCos,
	mailboxServerHost1, mailboxServerHost2
} = config;

export default {
	serverType, serverNode, serverEnvironment, serverHost, serverUser,
	adminPort, clientPort, popPort, imapPort, smtpPort,
	chat, serial, configure, freshSetup, showConsoleLog,
	adminEmailAddress, adminPassword, accountPassword,
	zulipServer, zulipSecret, zulipServerIpAddress,
	testDomain, chatDomain, testCos,
	mailboxServerHost1, mailboxServerHost2
};