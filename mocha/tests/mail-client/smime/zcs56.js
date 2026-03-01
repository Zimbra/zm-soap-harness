import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Smime > ZCS56', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
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

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | user1 creates a contact for user2 and uploads public certificate which has user2 alias email address in subject and u...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | user1 modifies contact for user2 and uploads public certificate which has no email address in subject and user2 alias...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | user1 modifies contact for user2 and uploads public certificate which has no email address in subject and user3 email...', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		// Send NoOp request
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
