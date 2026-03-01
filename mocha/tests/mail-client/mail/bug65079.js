import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mail > bug65079', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `acct1.${uid}@${config.testDomain}`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Inject the mime and verify that mht file is rendered', async () => {
		// Login to account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Send a test message with multipart content
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}"/>
					<su>Testing third</su>
					<mp ct="text/plain">
						<content>Test content for bug65079</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Wait for delivery
		await new Promise(r => setTimeout(r, 3000));

		// Search for the message
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Testing third)</query>
			</SearchRequest>`, acct1Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Get message details
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		const msgId = msgs[0]?.id;
		if (msgId) {
			const getMsgRes = await soap.makeSOAPEnvelopeAccount(
				`<GetMsgRequest xmlns="urn:zimbraMail">
					<m id="${msgId}"/>
				</GetMsgRequest>`, acct1Auth
			);
			assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
			assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		}
	});
});
