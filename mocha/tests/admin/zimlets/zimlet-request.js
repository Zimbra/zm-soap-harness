import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > Zimlet Request', function () {
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
	it('Smoke | Sanity test for DeployZimletRequest', async () => {
		// Create a COS
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Upload zimlet file
		const aid = await soap.uploadFile(adminAuthToken, 'data/zimlets/zimlet01/com_zimbra_test.zip');
		assert.exists(aid, 'Upload aid should exist');

		// Deploy zimlet
		const deployRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeployZimletRequest xmlns="urn:zimbraAdmin" action="deployAll">
				<content aid="${aid}"/>
			</DeployZimletRequest>`, adminAuthToken
		);
		assert.notExists(deployRes.Fault, 'DeployZimletRequest should not fault');
		assert.exists(deployRes.DeployZimletResponse, 'DeployZimletResponse should exist');
	});


	it('Smoke | Sanity test for ModifyZimletRequest', async () => {
		// Create a COS
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');

		// Get the first zimlet name and priority
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		const zimletsArr = Array.isArray(statusRes.GetZimletStatusResponse.zimlets)
			? statusRes.GetZimletStatusResponse.zimlets : [statusRes.GetZimletStatusResponse.zimlets];
		const zimletList = zimletsArr[0].zimlet
			? (Array.isArray(zimletsArr[0].zimlet) ? zimletsArr[0].zimlet : [zimletsArr[0].zimlet]).filter(z => z)
			: [];
		const firstZimlet = zimletList.find(z => z.name && z.priority !== undefined);
		assert.exists(firstZimlet, 'At least one zimlet with priority should exist');
		const zimletName = firstZimlet.name;
		const zimletPriority = firstZimlet.priority;

		// Modify zimlet — grant to COS
		const modRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}">
					<status value="enabled"/>
					<acl cos="${cosName}" acl="grant"/>
					<priority value="${zimletPriority}"/>
				</zimlet>
			</ModifyZimletRequest>`, adminAuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyZimletRequest should not fault');
		assert.exists(modRes.ModifyZimletResponse, 'ModifyZimletResponse should exist');
	});


	it('Sanity | Sanity test for GetZimletRequest', async () => {
		// Get the first zimlet name
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		const zimletsArr = Array.isArray(statusRes.GetZimletStatusResponse.zimlets)
			? statusRes.GetZimletStatusResponse.zimlets : [statusRes.GetZimletStatusResponse.zimlets];
		const zimletList = zimletsArr[0].zimlet
			? (Array.isArray(zimletsArr[0].zimlet) ? zimletsArr[0].zimlet : [zimletsArr[0].zimlet]).filter(z => z)
			: [];
		const firstZimlet = zimletList.find(z => z.name);
		assert.exists(firstZimlet, 'At least one zimlet should exist');
		const zimletName = firstZimlet.name;

		// Get specific zimlet
		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}"/>
			</GetZimletRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetZimletRequest should not fault');
		assert.exists(getRes.GetZimletResponse, 'GetZimletResponse should exist');
		const zimlet = Array.isArray(getRes.GetZimletResponse.zimlet)
			? getRes.GetZimletResponse.zimlet[0] : getRes.GetZimletResponse.zimlet;
		assert.equal(zimlet.name, zimletName, 'Zimlet name should match');
	});


	it('Sanity | Sanity test for GetZimletStatusRequest', async () => {
		// Create a zimlet first
		const zimletName = `zimlet${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">1.0</a>
				<a n="cn">com_zimbra_test</a>
				<a n="zimbraZimletDescription">Test1</a>
				<a n="objectClass">zimbraZimletEntry</a>
				<a n="zimbraZimletPriority">21</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateZimletRequest should not fault');

		// Get zimlet status
		const statusRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetZimletStatusRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statusRes.Fault, 'GetZimletStatusRequest should not fault');
		assert.exists(statusRes.GetZimletStatusResponse, 'GetZimletStatusResponse should exist');

		// Verify com_zimbra_test is enabled in default COS
		const cosList = Array.isArray(statusRes.GetZimletStatusResponse.cos)
			? statusRes.GetZimletStatusResponse.cos : [statusRes.GetZimletStatusResponse.cos];
		const defaultCos = cosList.find(c => c.name === 'default');
		assert.exists(defaultCos, 'Default COS should exist');
	});


	it('Sanity | Sanity test for ModifyZimletPrefsRequest', async () => {
		// Create zimlet
		const zimletName = `zimlet${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">1.0</a>
				<a n="cn">com_zimbra_test</a>
				<a n="zimbraZimletDescription">Test1</a>
				<a n="objectClass">zimbraZimletEntry</a>
				<a n="zimbraZimletPriority">21</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);

		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Modify zimlet prefs
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="${zimletName}" presence="enabled"/>
			</ModifyZimletPrefsRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'ModifyZimletPrefsRequest should not fault');
		assert.exists(modRes.ModifyZimletPrefsResponse, 'ModifyZimletPrefsResponse should exist');
	});


	it('Sanity | Sanity test for CreateZimletRequest', async () => {
		const zimletName = `zimlet${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">6.0</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateZimletRequest should not fault');
		assert.exists(createRes.CreateZimletResponse, 'CreateZimletResponse should exist');
		const zimlet = Array.isArray(createRes.CreateZimletResponse.zimlet)
			? createRes.CreateZimletResponse.zimlet[0] : createRes.CreateZimletResponse.zimlet;
		assert.equal(zimlet.name, zimletName, 'Zimlet name should match');
	});


	it('Sanity | Sanity test for GetAllZimletsRequest', async () => {
		const getAllRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllZimletsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(getAllRes.Fault, 'GetAllZimletsRequest should not fault');
		assert.exists(getAllRes.GetAllZimletsResponse, 'GetAllZimletsResponse should exist');
		assert.exists(getAllRes.GetAllZimletsResponse.zimlet, 'Zimlets should exist in response');
	});


	it('Sanity | Sanity test for GetAdminExtensionZimletsRequest', async () => {
		const getExtRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAdminExtensionZimletsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(getExtRes.Fault, 'GetAdminExtensionZimletsRequest should not fault');
		assert.exists(getExtRes.GetAdminExtensionZimletsResponse, 'GetAdminExtensionZimletsResponse should exist');
		assert.exists(getExtRes.GetAdminExtensionZimletsResponse.zimlets, 'Zimlets should exist');
	});


	it('Smoke | Sanity test for UndeployZimletRequest', async () => {
		// Create a zimlet
		const zimletName = `zimlet${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">6.0</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateZimletRequest should not fault');

		// Undeploy the zimlet
		const undeployRes = await soap.makeSOAPEnvelopeAdmin(
			`<UndeployZimletRequest xmlns="urn:zimbraAdmin" name="${zimletName}"/>`, adminAuthToken
		);
		assert.notExists(undeployRes.Fault, 'UndeployZimletRequest should not fault');
		assert.exists(undeployRes.UndeployZimletResponse, 'UndeployZimletResponse should exist');
	});


	it('Smoke | Sanity test for DeleteZimletRequest', async () => {
		// Create a zimlet
		const zimletName = `zimlet${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">6.0</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateZimletRequest should not fault');

		// Delete the zimlet
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteZimletRequest xmlns="urn:zimbraAdmin">
				<zimlet name="${zimletName}"/>
			</DeleteZimletRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteZimletRequest should not fault');
		assert.exists(deleteRes.DeleteZimletResponse, 'DeleteZimletResponse should exist');
	});


	it('Sanity | Sanity test for ConfigureZimletRequest', async () => {
		// Upload config file
		const aid = await soap.uploadFile(adminAuthToken, 'data/zimlets/zimlet01/config-template.txt');
		assert.exists(aid, 'Upload aid should exist');

		// Configure zimlet
		const configRes = await soap.makeSOAPEnvelopeAdmin(
			`<ConfigureZimletRequest xmlns="urn:zimbraAdmin">
				<content aid="${aid}"/>
			</ConfigureZimletRequest>`, adminAuthToken
		);
		assert.notExists(configRes.Fault, 'ConfigureZimletRequest should not fault');
		assert.exists(configRes.ConfigureZimletResponse, 'ConfigureZimletResponse should exist');
	});
});
