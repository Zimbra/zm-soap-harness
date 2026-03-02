import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Identities > Delete Identity', function () {
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
	it('Smoke | Delete identity by name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Delete the identity
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(delRes.Fault, 'DeleteIdentityRequest should not fault');
		assert.exists(delRes.DeleteIdentityResponse, 'DeleteIdentityResponse should exist');
	});


	it('Sanity | Delete identity by ID', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		const identityId = createRes.CreateIdentityResponse.identity[0].id;

		// Delete the identity
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity id="${identityId}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(delRes.Fault, 'DeleteIdentityRequest by ID should not fault');
		assert.exists(delRes.DeleteIdentityResponse, 'DeleteIdentityResponse should exist');
	});


	it('Sanity | Delete non-existent identity should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Delete the identity
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="nonexistent_${common.getUniqueString()}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(delRes.Fault, 'Delete non-existent identity should fault');
	});


	it('Functional | Delete identity and verify via GetIdentities', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Delete the identity
		await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Get identities
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetIdentitiesRequest should not fault');
		assert.exists(getRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');
	});


	it('Functional | Delete DEFAULT identity should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Delete the identity
		const delRes = await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="DEFAULT"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.exists(delRes.Fault, 'Delete DEFAULT identity should fault');
	});
});
