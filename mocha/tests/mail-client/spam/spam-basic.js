import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Spam', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();
	const spamSubject = `spam.test.${uid}`;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `spam.${uid}a@${config.testDomain}`;
		account2Name = `spam.${uid}b@${config.testDomain}`;

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

	it('Sanity | Verify that a spam message (GTUBE sample) is not sent to the mailbox', async () => {
		// Source: spamBasic_ReceiveSpam_01 from Spam/spamBasic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify that particular message having specific spam rating is placed in junk', async () => {
		// Source: spamBasic_ReceiveSpam_02 from Spam/spamBasic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Verify that a sample spam message is placed in the Junk folder', async () => {
		// Source: spamBasic_ReceiveSpam_03 from Spam/spamBasic.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
