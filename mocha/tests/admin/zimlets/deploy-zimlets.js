import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > Deploy Zimlets', function () {
	this.timeout(120 * 1000);
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
	it('Sanity | Deploy Zimlet', async () => {
		// Create a COS for the test
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		assert.exists(cosRes.CreateCosResponse, 'CreateCosResponse should exist');

		// Upload zimlet file
		const uploadRes = await soap.uploadFile(adminAuthToken, 'data/zimlets/zimlet01/com_zimbra_test.zip');
		assert.exists(uploadRes, 'Upload response should exist');
		const aid = uploadRes;

		// Deploy zimlet
		const deployRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeployZimletRequest xmlns="urn:zimbraAdmin" action="deployAll">
				<content aid="${aid}"/>
			</DeployZimletRequest>`, adminAuthToken
		);
		assert.notExists(deployRes.Fault, 'DeployZimletRequest should not fault');
		assert.exists(deployRes.DeployZimletResponse, 'DeployZimletResponse should exist');

		// Wait for deploy to complete
		await soap.waitFor(10000);

		// Verify zimlet is deployed
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');

		// Check default COS has the zimlet enabled
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const defaultCos = cosList.find(c => c.name === 'default');
		assert.exists(defaultCos, 'Default COS should exist');
		const cosZimlets = Array.isArray(defaultCos.zimlet) ? defaultCos.zimlet : [defaultCos.zimlet];
		const deployed = cosZimlets.find(z => z.name === 'com_zimbra_test' && z.status === 'enabled');
		assert.exists(deployed, 'com_zimbra_test should be enabled in default COS');

		// Check priority is set
		const zimletsArr = Array.isArray(statusRes.GetZimletStatusResponse.zimlets)
			? statusRes.GetZimletStatusResponse.zimlets : [statusRes.GetZimletStatusResponse.zimlets];
		const zimletList = (Array.isArray(zimletsArr[0].zimlet) ? zimletsArr[0].zimlet : [zimletsArr[0].zimlet]).filter(z => z);
		const zimletEntry = zimletList.find(z => z.name === 'com_zimbra_test');
		assert.exists(zimletEntry, 'com_zimbra_test should be in zimlet list');
		assert.match(String(zimletEntry.priority), /\d+/, 'Priority should be numeric');
	});
});
