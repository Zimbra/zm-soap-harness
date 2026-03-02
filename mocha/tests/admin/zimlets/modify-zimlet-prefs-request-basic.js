import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Zimlets > Modify Zimlet Prefs Request Basic', function () {
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
	it('Sanity | Verify that ModifyZimletPrefsRequest modify presence to disabled status', async () => {
		// Create a zimlet
		const zimletName = `zimlet${common.getUniqueString()}`;
		const createZimletRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateZimletRequest xmlns="urn:zimbraAdmin">
				<name>${zimletName}</name>
				<a n="zimbraZimletIndexingEnabled">TRUE</a>
				<a n="zimbraZimletVersion">1.0</a>
				<a n="zimbraZimletDescription">Test1</a>
				<a n="objectClass">zimbraZimletEntry</a>
				<a n="zimbraZimletPriority">21</a>
				<a n="zimbraZimletEnabled">TRUE</a>
			</CreateZimletRequest>`, adminAuthToken
		);
		assert.notExists(createZimletRes.Fault, 'CreateZimletRequest should not fault');

		// Create COS with the zimlet and com_zimbra_phone
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraZimletAvailableZimlets">${zimletName}</a>
				<a n="zimbraZimletAvailableZimlets">com_zimbra_phone</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account with COS
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Modify zimlet prefs to disabled
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="com_zimbra_phone" presence="disabled"/>
			</ModifyZimletPrefsRequest>`, accountToken
		);
		assert.notExists(modRes.Fault, 'ModifyZimletPrefsRequest should not fault');
		assert.exists(modRes.ModifyZimletPrefsResponse, 'ModifyZimletPrefsResponse should exist');

		// Verify via GetInfo
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount" sections="zimlets">
				<name>com_zimbra_phone</name>
			</GetInfoRequest>`, accountToken
		);
		assert.notExists(infoRes.Fault, 'GetInfoRequest should not fault');
		assert.exists(infoRes.GetInfoResponse, 'GetInfoResponse should exist');
	});


	it('Sanity | Verify that ModifyZimletPrefsRequest able to modify presence of a zimlet to enabled status', async () => {
		// Create COS with com_zimbra_phone
		const cosName = `cos${common.getUniqueString()}`;
		const cosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="zimbraZimletAvailableZimlets">com_zimbra_phone</a>
			</CreateCosRequest>`, adminAuthToken
		);
		assert.notExists(cosRes.Fault, 'CreateCosRequest should not fault');
		const cos = Array.isArray(cosRes.CreateCosResponse.cos)
			? cosRes.CreateCosResponse.cos[0] : cosRes.CreateCosResponse.cos;
		const cosId = cos.id;

		// Create account with COS
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Auth as account
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Disable first
		const disableRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="com_zimbra_phone" presence="disabled"/>
			</ModifyZimletPrefsRequest>`, accountToken
		);
		assert.notExists(disableRes.Fault, 'ModifyZimletPrefsRequest disable should not fault');

		// Enable again
		const enableRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="com_zimbra_phone" presence="enabled"/>
			</ModifyZimletPrefsRequest>`, accountToken
		);
		assert.notExists(enableRes.Fault, 'ModifyZimletPrefsRequest enable should not fault');
		assert.exists(enableRes.ModifyZimletPrefsResponse, 'ModifyZimletPrefsResponse should exist');

		// Verify via GetInfo
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			`<GetInfoRequest xmlns="urn:zimbraAccount" sections="zimlets">
				<name>com_zimbra_phone</name>
			</GetInfoRequest>`, accountToken
		);
		assert.notExists(infoRes.Fault, 'GetInfoRequest should not fault');
		assert.exists(infoRes.GetInfoResponse, 'GetInfoResponse should exist');
	});


	it('Regression | Verify that ModifyZimletPrefsRequest return serviceINVALIDREQUEST for invalid value', async () => {
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

		// Try empty presence value — should fail
		const emptyRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="com_zimbra_phone" presence=""/>
			</ModifyZimletPrefsRequest>`, accountToken, false
		);
		assert.exists(emptyRes.Fault, 'ModifyZimletPrefsRequest with empty presence should fault');
		assert.include(emptyRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');

		// Try invalid presence value — should fail
		const invalidRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyZimletPrefsRequest xmlns="urn:zimbraAccount">
				<zimlet name="com_zimbra_phone" presence="#!"/>
			</ModifyZimletPrefsRequest>`, accountToken, false
		);
		assert.exists(invalidRes.Fault, 'ModifyZimletPrefsRequest with invalid presence should fault');
		assert.include(invalidRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});
});
