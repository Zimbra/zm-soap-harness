import { assert } from 'chai';
import config from '../conf/config.js';
import { main } from '../pages/main.js';
import { soap, server } from '../framework/backend/index.js';

describe('Zimbra Status', function () {
	this.timeout(60 * 1000);

	before(async () => {
		await main.before(this);
		await soap.getAdminAuthToken(config.adminEmailAddress);
	});
	beforeEach(async () => {
		await main.beforeEach(this);
	});
	afterEach(async () => {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial !== true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Serial Check zimbra server status', async () => {
		const services = ['mailbox', 'memcached', 'mta', 'onlyoffice'];
		const status = await server.runCommand('sudo su - zimbra -c \'zmcontrol status\'');
		for (const service of services) {

			// Verify response
			assert.match(status, new RegExp(`${service}\\s+Running`, 'i'), `Verify ${service} running after config change`);
		}
	});
});
