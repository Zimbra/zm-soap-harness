import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Create-Identity', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	it('Smoke | Create basic identity', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with from display name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Display Name</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with from address', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest with from address should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with reply-to enabled', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToAddress">reply@example.com</a>
					<a name="zimbraPrefReplyToDisplay">Reply Display</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest reply-to should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with signature', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create a signature first
		const sigRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="TestSig${common.getUniqueString()}">
					<content type="text/plain">Test Signature Content</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);
		assert.notExists(sigRes.Fault, 'CreateSignatureRequest should not fault');
		const sigId = sigRes.CreateSignatureResponse.signature[0].id;

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefDefaultSignatureId">${sigId}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest with sig should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity with all fields', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Full Display</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
					<a name="zimbraPrefReplyToEnabled">TRUE</a>
					<a name="zimbraPrefReplyToAddress">reply@test.com</a>
					<a name="zimbraPrefReplyToDisplay">Reply Display</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest all fields should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create duplicate identity name should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		const dupRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.exists(dupRes.Fault, 'Duplicate identity name should fault');
	});


	it('Functional | Create identity named DEFAULT should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="DEFAULT"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.exists(createRes.Fault, 'Creating identity named DEFAULT should fault');
	});


	it('Sanity | Create identity with zimbraPrefMailForwardingAddress', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Forward Display</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with send on behalf', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Send On Behalf</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity with when sent to address', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefWhenSentToEnabled">TRUE</a>
					<a name="zimbraPrefWhenSentToAddresses">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest when-sent-to should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity with when in folder attributes', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefWhenInFolderEnabled">TRUE</a>
					<a name="zimbraPrefWhenInFolderIds">2</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.exists(createRes.Fault, 'CreateIdentityRequest with zimbraPrefWhenInFolderEnabled should fault as unsupported');
	});


	it('Sanity | Create identity with mail composition preferences', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Compose Pref</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity and verify via admin GetAccount', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountId = createAcctRes.CreateAccountResponse.account[0].id;
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Admin Verify</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);

		const getRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin">
				<account by="id">${accountId}</account>
			</GetAccountRequest>`, adminAuthToken
		);
		assert.notExists(getRes.Fault, 'GetAccountRequest should not fault');
		assert.exists(getRes.GetAccountResponse, 'GetAccountResponse should exist');
	});


	it('Sanity | Create identity with empty name should fail', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name=""/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.exists(createRes.Fault, 'Empty identity name should fault');
	});


	it('Functional | Create maximum identities', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Create multiple identities
		for (let i = 0; i < 5; i++) {
			const identityName = `maxid${i}_${common.getUniqueString()}`;
			await soap.makeSOAPEnvelopeAccount(
				`<CreateIdentityRequest xmlns="urn:zimbraAccount">
					<identity name="${identityName}">
						<a name="zimbraPrefFromDisplay">Max${i}</a>
					</identity>
				</CreateIdentityRequest>`, accountAuthToken
			);
		}

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		assert.notExists(getRes.Fault, 'GetIdentitiesRequest should not fault');
		assert.exists(getRes.GetIdentitiesResponse, 'GetIdentitiesResponse should exist');
	});


	it('Sanity | Create identity with different from display values', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">Different Display Value</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity with forward reply signature', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const sigRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="FwdSig${common.getUniqueString()}">
					<content type="text/plain">Forward Signature</content>
				</signature>
			</CreateSignatureRequest>`, accountAuthToken
		);
		assert.notExists(sigRes.Fault, 'CreateSignatureRequest should not fault');
		const sigId = sigRes.CreateSignatureResponse.signature[0].id;

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefForwardReplySignatureId">${sigId}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest fwd sig should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with custom mail signature position', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefMailSignatureStyle">internet</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest sig position should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Verify identity ID is returned on create', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse.identity, 'identity should exist in response');
		assert.exists(createRes.CreateIdentityResponse.identity[0].id, 'identity id should exist');
	});


	it('Sanity | Create identity with read receipt setting', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">ReadReceipt</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity with long name', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `longidentityname_${common.getUniqueString()}_${'x'.repeat(50)}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest long name should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Sanity | Create identity with underscore and dash', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `test_identity-name_${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest special chars should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});


	it('Functional | Create identity and verify name in response', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.equal(createRes.CreateIdentityResponse.identity[0].name, identityName, 'Identity name should match');
	});


	it('Sanity | Create identity with compose format HTML', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">HTML Compose</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});

	it('Sanity | Create identity with WhenSentToEnabled', async () => {
		const accountEmail = `test.${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		const identityName = `id${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefFromDisplay">WhenSentTo Display</a>
					<a name="zimbraPrefWhenSentToEnabled">TRUE</a>
					<a name="zimbraPrefWhenSentToAddresses">${accountEmail}</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateIdentityRequest should not fault');
		assert.exists(createRes.CreateIdentityResponse, 'CreateIdentityResponse should exist');
	});
});
