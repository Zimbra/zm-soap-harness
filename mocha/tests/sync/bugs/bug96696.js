import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sync > Bugs > Bug96696', function () {
	this.timeout(180 * 1000);
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
	it.skip('Sanity | Send message, sync and verify conversation id from sync response', async () => {
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
		let currentToken = syncRes1.SyncResponse.token;
		assert.exists(currentToken, 'SyncResponse should have a token');

		// Wait for mail to arrive at account2 and find its id
		let account2MsgId = null;
		for (let i = 0; i < 20; i++) {
			await new Promise(r => setTimeout(r, 3000));
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(${subject})</query>
				</SearchRequest>`, account2AuthToken
			);
			if (!searchRes.Fault && searchRes.SearchResponse) {
				const msgs = Array.isArray(searchRes.SearchResponse.m)
					? searchRes.SearchResponse.m
					: (searchRes.SearchResponse.m ? [searchRes.SearchResponse.m] : []);
				if (msgs.length > 0) {
					account2MsgId = msgs[0].id;
					break;
				}
			}
		}
		assert.exists(account2MsgId, 'Message should arrive in account2 inbox');

		// account2 replies to account1
		const sendRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${account2MsgId}" rt="r">
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

		// Poll for reply to appear via SyncRequest
		const maxWait = 175 * 1000;
		const interval = 5000;
		const start = Date.now();
		let convId = null;

		while (Date.now() - start < maxWait) {
			const res = await soap.makeSOAPEnvelopeAccount(
				`<SyncRequest token="${currentToken}" xmlns="urn:zimbraMail"/>`,
				account1AuthToken
			);

			assert.notExists(res.Fault, 'Response should not be a Fault');
			assert.exists(res.SyncResponse, 'SyncResponse should exist');

			currentToken = res.SyncResponse.token;
			const messages = Array.isArray(res.SyncResponse.m)
				? res.SyncResponse.m
				: (res.SyncResponse.m ? [res.SyncResponse.m] : []);
			const matchingMsg = messages.find(m => m.su === `Re: ${subject}`);

			if (matchingMsg && matchingMsg.cid) {
				convId = matchingMsg.cid;
				break;
			}
			await new Promise(r => setTimeout(r, interval));
		}
		assert.exists(convId, 'Reply message with cid should appear in sync response');

		// Verify conversation exists in sync response using updated token
		const finalSync = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest token="${currentToken}" xmlns="urn:zimbraMail"/>`,
			account1AuthToken
		);

		assert.notExists(finalSync.Fault, 'Response should not be a Fault');
		assert.exists(finalSync.SyncResponse, 'SyncResponse should exist');
		const syncConvs = Array.isArray(finalSync.SyncResponse.c)
			? finalSync.SyncResponse.c
			: (finalSync.SyncResponse.c ? [finalSync.SyncResponse.c] : []);

		const matchingConv = syncConvs.find(c => c.id === convId);
		assert.exists(matchingConv, 'Conversation matching cid should exist in sync response');
	});
});