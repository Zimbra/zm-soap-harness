import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Prefs > Identities > Zimbraprefromdisplay > Primaryaccount', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

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

	async function ca() {
		const e = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${e}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(e);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
	}

	it('Functional | Modify zimbraPrefFromDisplay for default identity', async () => {
		const authToken = await ca();
		const displayName = `Display_${common.getUniqueString()}`;

		// Get identities
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(getRes.Fault, 'GetIdentities should not fault');
		const defaultIdentity = getRes.GetIdentitiesResponse?.identity?.[0] || getRes.GetIdentitiesResponse?.identity;
		const identityId = defaultIdentity?.id;
		assert.exists(identityId, 'Default identity should have an id');

		// Modify the identity
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay">${displayName}</a></identity></ModifyIdentityRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'ModifyIdentity should not fault');
	});


	it('Functional | Verify zimbraPrefFromDisplay after modify', async () => {
		const authToken = await ca();
		const displayName = `Verify_${common.getUniqueString()}`;

		// Get identities
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
		const identityId = getRes.GetIdentitiesResponse?.identity?.[0]?.id || getRes.GetIdentitiesResponse?.identity?.id;

		// Modify the identity
		await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay">${displayName}</a></identity></ModifyIdentityRequest>`, authToken);

		// Get identities
		const verifyRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(verifyRes.Fault, 'Verify should not fault');
	});


	it('Functional | Reset zimbraPrefFromDisplay to empty', async () => {
		const authToken = await ca();

		// Get identities
		const getRes = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);
		const identityId = getRes.GetIdentitiesResponse?.identity?.[0]?.id || getRes.GetIdentitiesResponse?.identity?.id;

		// Modify the identity
		const modRes = await soap.makeSOAPEnvelopeAccount(`<ModifyIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"><a name="zimbraPrefFromDisplay"></a></identity></ModifyIdentityRequest>`, authToken);

		// Verify response
		assert.notExists(modRes.Fault, 'Reset should not fault');
	});
});
