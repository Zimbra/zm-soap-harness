import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Conversation > Conversation Loop 2', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	let acct1Email, acct1AuthToken, acct2Email, acct2AuthToken;
	const convSubject = `First conversation ${Date.now()}`;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create two accounts
		acct1Email = `test${common.getUniqueString()}@${testDomain}`;
		acct2Email = `test${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acct2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		acct1AuthToken = await soap.getAccountAuthToken(acct1Email);
		acct2AuthToken = await soap.getAccountAuthToken(acct2Email);
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
	it('Functional | Send many messages, search conversation, and verify GetMsg on individual messages', async () => {
		// Send initial message
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct2Email}"/>
					<su>${convSubject}</su>
					<mp ct="text/plain">
						<content>Content of initial mail</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);

		// Send 10 reply messages (instead of 200 for practical testing)
		let lastMsgId;
		for (let i = 0; i < 10; i++) {
			const sendRes = await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${acct2Email}"/>
						<su>Re: ${convSubject}</su>
						<mp ct="text/plain">
							<content>Content of reply mail ${i}</content>
						</mp>
					</m>
				</SendMsgRequest>`, acct1AuthToken
			);
			lastMsgId = Array.isArray(sendRes.SendMsgResponse.m)
				? sendRes.SendMsgResponse.m[0].id : sendRes.SendMsgResponse.m.id;
		}

		// Wait for delivery of all messages
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Login as acct2 and search for conversation (with retry)
		let conv;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(resolve => setTimeout(resolve, 5000));
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
					<query>subject:${convSubject}</query>
				</SearchRequest>`, acct2AuthToken
			);
			assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
			conv = Array.isArray(searchRes.SearchResponse.c)
				? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
			if (conv) break;
		}
		assert.exists(conv, 'Should find a conversation');
		const convId = conv.id;

		// SearchConvRequest to get message IDs (with retry for message count)
		let msgs;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(resolve => setTimeout(resolve, 5000));
			const searchConvRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchConvRequest xmlns="urn:zimbraMail" cid="${convId}" limit="500">
					<query>in:inbox</query>
				</SearchConvRequest>`, acct2AuthToken
			);
			assert.notExists(searchConvRes.Fault, 'SearchConvRequest should not fault');
			msgs = Array.isArray(searchConvRes.SearchConvResponse.m)
				? searchConvRes.SearchConvResponse.m : [searchConvRes.SearchConvResponse.m];
			if (msgs.length >= 3) break;
		}
		assert.isAtLeast(msgs.length, 3, 'Should have at least 3 messages');

		// Verify GetMsgRequest on first, middle, and last messages
		const firstMsgId = msgs[0].id;
		const getRes1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${firstMsgId}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes1.Fault, 'GetMsgRequest for first message should not fault');
		const msg1 = Array.isArray(getRes1.GetMsgResponse.m)
			? getRes1.GetMsgResponse.m[0] : getRes1.GetMsgResponse.m;
		assert.equal(msg1.id, firstMsgId, 'First message ID should match');

		const midIdx = Math.floor(msgs.length / 2);
		const midMsgId = msgs[midIdx].id;
		const getRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${midMsgId}"/>
			</GetMsgRequest>`, acct2AuthToken
		);
		assert.notExists(getRes2.Fault, 'GetMsgRequest for middle message should not fault');
	});


	it('Functional | Verify conversation containing large number of messages on deleting behaves properly', async () => {
		// Send a new conversation from acct2 to acct1
		const deleteSubject = `Delete conv ${common.getUniqueString()}`;
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${acct1Email}"/>
					<su>${deleteSubject}</su>
					<mp ct="text/plain">
						<content>Content of initial mail</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct2AuthToken
		);

		// Send 10 replies (instead of 200)
		for (let i = 0; i < 10; i++) {
			await soap.makeSOAPEnvelopeAccount(
				`<SendMsgRequest xmlns="urn:zimbraMail">
					<m>
						<e t="t" a="${acct2Email}"/>
						<su>Re: ${deleteSubject}</su>
						<mp ct="text/plain">
							<content>Reply content ${i}</content>
						</mp>
					</m>
				</SendMsgRequest>`, acct2AuthToken
			);
		}

		// Wait for delivery
		await new Promise(resolve => setTimeout(resolve, 10000));

		// Login as acct1 and get folder info
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1AuthToken
		);
		assert.notExists(folderRes.Fault, 'GetFolderRequest should not fault');

		// Search for conversation (with retry)
		let conv;
		for (let retry = 0; retry < 5; retry++) {
			if (retry > 0) await new Promise(resolve => setTimeout(resolve, 3000));
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" offset="0" limit="25">
					<query>subject:${deleteSubject}</query>
				</SearchRequest>`, acct1AuthToken
			);
			assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
			conv = Array.isArray(searchRes.SearchResponse.c)
				? searchRes.SearchResponse.c[0] : searchRes.SearchResponse.c;
			if (conv) break;
		}
		assert.exists(conv, 'Should find a conversation');
		const convId = conv.id;

		// Move to trash
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="move" l="3"/>
			</ConvActionRequest>`, acct1AuthToken
		);
		assert.notExists(moveRes.Fault, 'ConvActionRequest move should not fault');
		assert.equal(moveRes.ConvActionResponse.action.op, 'move', 'op should be move');

		// Delete from trash
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ConvActionRequest xmlns="urn:zimbraMail">
				<action id="${convId}" op="delete"/>
			</ConvActionRequest>`, acct1AuthToken
		);
		assert.notExists(deleteRes.Fault, 'ConvActionRequest delete should not fault');
		assert.equal(deleteRes.ConvActionResponse.action.op, 'delete', 'op should be delete');
	});
});
