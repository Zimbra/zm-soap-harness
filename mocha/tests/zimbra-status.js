import { assert } from 'chai';
import config from '../conf/config.js';
import { main } from '../pages/main.js';
import { soap, server } from '../framework/backend/index.js';

describe('Admin > Server > Zimbra Status', function() {
	this.timeout(60 * 1000);
	let adminAuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken(config.adminEmailAddress);
	});
	beforeEach(async () => {
		await main.beforeEach(this.ctx);
	});
	afterEach(async () => {
		await main.afterEach(this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial !== true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Serial Check zimbra server status', async() => {
		const services = [ 'mailbox', 'memcached', 'mta', 'onlyoffice' ];
		const status = await server.runCommand('sudo su - zimbra -c \'zmcontrol status\'');
		for (const service of services) {
			assert.match(status, new RegExp(`${service}\\s+Running`, 'i'), `Verify ${service} running after config change`);
		}
	});
});
