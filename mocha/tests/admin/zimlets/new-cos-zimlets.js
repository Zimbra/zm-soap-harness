import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > New Cos Zimlets', function () {
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
	it('Sanity | Check that zimlets from default are copied to a new COS when the COS is created', async () => {
		// Create a new COS
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		assert.equal(cos.name, cosName, 'COS name should match');

		// Get zimlet status to find default COS zimlets
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');

		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];

		// Get default COS zimlets
		const defaultCos = cosList.find(c => c.name === 'default');
		assert.exists(defaultCos, 'Default COS should exist');
		const defaultZimlets = Array.isArray(defaultCos.zimlet) ? defaultCos.zimlet : [defaultCos.zimlet];
		const defaultZimletNames = defaultZimlets.map(z => z.name).slice(0, 6);

		// Get new COS zimlets
		const newCos = cosList.find(c => c.name === cosName);
		assert.exists(newCos, 'New COS should exist in GetZimletStatusResponse');
		const newZimlets = newCos.zimlet ? (Array.isArray(newCos.zimlet) ? newCos.zimlet : [newCos.zimlet]) : [];
		const newZimletNames = newZimlets.map(z => z.name);

		// Verify that default zimlets are copied to new COS
		for (const zimletName of defaultZimletNames) {
			assert.include(newZimletNames, zimletName,
				`Zimlet ${zimletName} from default COS should be in new COS`);
		}
	});
});
