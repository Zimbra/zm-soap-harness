import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sync > Bugs > Bug96696', function () {
	this.timeout(120 * 1000);
	let account1Email = null, account1AuthToken = null;
	let account2Email = null, account2AuthToken = null;

	before(async () => {
		await main.before(this.ctx);
		account1Email = soap.testAccounts.testAccount1.emailAddress;
		account1AuthToken = await soap.getAccountAuthToken(account1Email);
		account2Email = soap.testAccounts.testAccount2.emailAddress;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | login as the test account', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content of the message${common.getUniqueString()}`;

		// account1 sends mail to account2
		const sendRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes1.Fault, 'Response should not be a Fault');
		assert.exists(sendRes1.SendMsgResponse, 'SendMsgResponse should exist');
		const msgId1 = sendRes1.SendMsgResponse.m[0].id;
		assert.exists(msgId1, 'Message should have an id');

		// SyncRequest from account1
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			'<SyncRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		assert.exists(syncRes1.SyncResponse, 'SyncResponse should exist');
		const token1 = syncRes1.SyncResponse.token;
		assert.exists(token1, 'SyncResponse should have a token');

		// account2 replies to the mail
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${msgId1}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Forwarded content: ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(sendRes2.Fault, 'Response should not be a Fault');
		assert.exists(sendRes2.SendMsgResponse, 'SendMsgResponse should exist');

		// Wait for delivery then sync as account1 with token
		await new Promise(resolve => setTimeout(resolve, 5000));
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${token1}" xmlns="urn:zimbraMail"/>`, account1AuthToken
		);
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse, 'SyncResponse should exist');

		// Verify cid attribute is present on synced message
		const syncMessages = Array.isArray(syncRes2.SyncResponse.m)
			? syncRes2.SyncResponse.m : (syncRes2.SyncResponse.m ? [syncRes2.SyncResponse.m] : []);
		if (syncMessages.length > 0) {
			const convId = syncMessages[0].cid;
			assert.exists(convId, 'Synced message should have cid attribute');

			// Verify conversation exists in sync response
			const syncRes3 = await soap.makeSOAPEnvelopeAccount(
				`<SyncRequest token="${token1}" xmlns="urn:zimbraMail"/>`, account1AuthToken
			);
			assert.notExists(syncRes3.Fault, 'Response should not be a Fault');
			assert.exists(syncRes3.SyncResponse, 'SyncResponse should exist');
			const syncConvs = Array.isArray(syncRes3.SyncResponse.c)
				? syncRes3.SyncResponse.c : (syncRes3.SyncResponse.c ? [syncRes3.SyncResponse.c] : []);
			const matchingConv = syncConvs.find(c => c.id === convId);
			assert.exists(matchingConv, 'Conversation matching cid should exist in sync response');
		}
	});
});
