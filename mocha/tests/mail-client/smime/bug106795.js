import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Smime > bug106795', function () {
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
	it('Sanity | Verify GetMessageResponse successfully displays decrypted message with receipients private key', async () => {
		// Source: bug106795_Decrypt_test1 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify GetMessageResponse successfully displays decrypted message with senders private key in Sent Folder of sender', async () => {
		// Source: bug106795_Decrypt_test2 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Recipient has its alias email address in certificate Sender should be able to encrypt and send mail using alias cert ...', async () => {
		// Source: bug106795_Decrypt_test3 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sender has multiple recipients public certificate Should be able to Send an encrypted message to all of them using th...', async () => {
		// Source: bug106795_Decrypt_test4 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sender sends an encrypted mail with an attachment Verify on receiver, GetMsgResp decrypts the message with attachment...', async () => {
		// Source: bug106795_Decrypt_test5 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sender sends an encrypted mail to receiver Receiver again forwards the same mail to receiver 2 Verify receiver 2 shou...', async () => {
		// Source: bug106795_Decrypt_test6 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Sender sends an encrypted mail to receiver Receiver again forwards the same mail to receiver 2 Verify receiver 2 shou...', async () => {
		// Source: bug106795_Decrypt_test7 from Smime/bug106795.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
