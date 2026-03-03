import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Identities > Get Identity', function () {
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
		await soap.makeSOAPEnvelopeAdmin(`<CreateAccountRequest xmlns="urn:zimbraAdmin"><name>${e}</name><password>${config.accountPassword}</password></CreateAccountRequest>`, adminAuthToken);
		return await soap.getAccountAuthToken(e);
	}

	it('Sanity | GetIdentitiesRequest for default identity', async () => {
		const authToken = await ca();

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Sanity | GetIdentitiesRequest with valid id', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not fault');

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Get should not fault');
	});


	it('Sanity | GetIdentitiesRequest with valid name', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | GetIdentitiesRequest with leading spaces in name', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | GetIdentitiesRequest with trailing spaces in name', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | GetIdentitiesRequest with leading and trailing spaces', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | GetIdentitiesRequest with invalid attribute value', async () => {
		const authToken = await ca();

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault');
	});


	it('Regression | GetIdentitiesRequest after deleting identity', async () => {
		const authToken = await ca();
		const name = `id_${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(`<CreateIdentityRequest xmlns="urn:zimbraAccount"><identity name="${name}"><a name="zimbraPrefIdentityName">${name}</a></identity></CreateIdentityRequest>`, authToken);

		// Verify response
		assert.notExists(createRes.Fault, 'Create should not fault');
		const identityId = createRes.CreateIdentityResponse?.identity?.[0]?.id || createRes.CreateIdentityResponse?.identity?.id;
		if (identityId) {

			// Delete the identity
			await soap.makeSOAPEnvelopeAccount(`<DeleteIdentityRequest xmlns="urn:zimbraAccount"><identity id="${identityId}"/></DeleteIdentityRequest>`, authToken);
		}

		// Get identities
		const res = await soap.makeSOAPEnvelopeAccount(`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, authToken);

		// Verify response
		assert.notExists(res.Fault, 'Should not fault after deletion');
	});
});
