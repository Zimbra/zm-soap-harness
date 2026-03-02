import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > Ootb Zimlets', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Check Default Zimlets', async () => {
		// Get zimlet status
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		assert.exists(statusRes.GetZimletStatusResponse, 'GetZimletStatusResponse should exist');

		// Verify default enabled zimlets exist
		const zimlets = statusRes.GetZimletStatusResponse.zimlets;
		assert.exists(zimlets, 'zimlets section should exist');
		const zimletsArr = Array.isArray(zimlets) ? zimlets : [zimlets];
		const zimletList = (Array.isArray(zimletsArr[0].zimlet) ? zimletsArr[0].zimlet : [zimletsArr[0].zimlet]).filter(z => z);

		// Check enabled non-extension zimlets
		const phoneZimlet = zimletList.find(z => z.name === 'com_zimbra_phone' && z.status === 'enabled' && String(z.extension) !== 'true');
		assert.exists(phoneZimlet, 'com_zimbra_phone should be enabled and non-extension');

		const urlZimlet = zimletList.find(z => z.name === 'com_zimbra_url' && z.status === 'enabled' && String(z.extension) !== 'true');
		assert.exists(urlZimlet, 'com_zimbra_url should be enabled and non-extension');

		// Check enabled extension zimlets
		const hsmZimlet = zimletList.find(z => z.name === 'com_zimbra_hsm' && z.status === 'enabled' && String(z.extension) === 'true');
		assert.exists(hsmZimlet, 'com_zimbra_hsm should be enabled and extension');

		const convertdZimlet = zimletList.find(z => z.name === 'com_zimbra_convertd' && z.status === 'enabled' && String(z.extension) === 'true');
		assert.exists(convertdZimlet, 'com_zimbra_convertd should be enabled and extension');

		// Check default off zimlets are not present
		const offZimlets = ['com_zimbra_amzn', 'com_zimbra_bugz', 'com_zimbra_po', 'com_zimbra_sforce', 'com_zimbra_sms'];
		for (const name of offZimlets) {
			const found = zimletList.find(z => z.name === name);
			assert.notExists(found, `${name} should not be listed in zimlets`);
		}

		// Check priorities are set for enabled zimlets
		assert.match(String(phoneZimlet.priority), /\d+/, 'com_zimbra_phone should have numeric priority');
		assert.match(String(urlZimlet.priority), /\d+/, 'com_zimbra_url should have numeric priority');

		// Check default COS
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const defaultCos = cosList.find(c => c.name === 'default');
		assert.exists(defaultCos, 'Default COS should exist');
		const cosZimlets = Array.isArray(defaultCos.zimlet) ? defaultCos.zimlet : [defaultCos.zimlet];

		// com_zimbra_domainadmin should NOT be enabled in default COS
		const domainAdmin = cosZimlets.find(z => z.name === 'com_zimbra_domainadmin' && z.status === 'enabled');
		assert.notExists(domainAdmin, 'com_zimbra_domainadmin should not be enabled in default COS');

		// com_zimbra_phone should be enabled in default COS
		const cosPhone = cosZimlets.find(z => z.name === 'com_zimbra_phone' && z.status === 'enabled');
		assert.exists(cosPhone, 'com_zimbra_phone should be enabled in default COS');

		// com_zimbra_url should be enabled in default COS
		const cosUrl = cosZimlets.find(z => z.name === 'com_zimbra_url' && z.status === 'enabled');
		assert.exists(cosUrl, 'com_zimbra_url should be enabled in default COS');
	});
});
