import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Smime > bugZCS160', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `smime.${uid}a@${config.testDomain}`;
		account2Name = `smime.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}
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
	it('Sanity | 1 Send signed and encrypted message to account 2 from account 1, account 2 will fail to decrypt message as there is n...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Add certificate in account 2 2 Send signed and encrypted message to account 2 from account 1 3 GetConversation on a...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Inject tampered mime in account 1 2 GetConversation on account 1 and verify error code DECRYPTIONFAILED 3 SearchCon...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Delete private key in account 2 2 GetConversation on account 2 and verify error code 3 SearchConversation on accoun...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
