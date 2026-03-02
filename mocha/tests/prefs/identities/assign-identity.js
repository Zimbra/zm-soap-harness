import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Prefs > Identities > Assign Identity', function () {
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
	it('Smoke | Assign identity to account', async () => {
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

		const identityName = `identity${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Test Display</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Assign identity and verify via GetIdentities', async () => {
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

		const identityName = `identity${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Verify Display</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Get identities
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);

		// Verify response
		assert.notExists(getRes.Fault, 'GetIdentitiesRequest should not fault');
		assert.exists(getRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');
	});


	it('Sanity | Assign identity with reply-to address', async () => {
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

		const identityName = `identity${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">ReplyTo Display</a>
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToAddress">replyto@example.com</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateIdentityRequest with reply-to should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Assign multiple identities to same account', async () => {
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

		const id1 = `identity1${common.getUniqueString()}`;
		const id2 = `identity2${common.getUniqueString()}`;

		// Create an identity
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${id1}"><a name="zimbraPrefFromDisplay">First</a></identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${id2}"><a name="zimbraPrefFromDisplay">Second</a></identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Second CreateIdentityRequest should not fault');
		assert.exists(createRes2.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Regression | Assign identity with special characters in name', async () => {
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

		const identityName = `id-special_${common.getUniqueString()}`;

		// Create an identity
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Special Chars</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateIdentityRequest special chars should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});
});
