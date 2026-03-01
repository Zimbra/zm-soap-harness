import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Smime > ZCS-426', function () {
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
	it('Sanity | 1 Send encrypted msg from account1 to account2 2 GetConversation, SearchConversation and GetMessage on account 2 and ...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Disable smime feature for account2 and verify messages cannot be encrypted anymore', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Re-enable smime for account2 and verify messages can be decrypted again', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | 1 Disable smime for user1 Error should be given while sending encrypted email 2 Enable smime for user1 Encrypted emai...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
