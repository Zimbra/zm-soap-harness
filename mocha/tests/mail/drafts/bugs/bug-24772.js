import path from 'node:path';
import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Drafts > Bugs > Bug 24772', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
	});

	beforeEach(function () {
		main.beforeEach(this.currentTest ? this : this.ctx);
	});

	afterEach(function () {
		main.afterEach(this.currentTest ? this : this.ctx);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | To Send a draft mail', async () => {
		// Create account1 with small quota
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">192932</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		// Create account2 with small quota
		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">192932</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Upload attachment file
		const filePath = path.resolve('data/contact/image1.jpg');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Save draft with attachment
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Check sending of draft</su>
					<mp ct="text/plain">
						<content>Send the draft mail</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SaveDraftRequest>`, account1Token
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0] : draftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft should have an id');

		// Send message from draft with attachment
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}">
					<e t="t" a="${account2Email}"/>
					<su>Check sending of draft</su>
					<mp ct="text/plain">
						<content>Send the draft mail</content>
					</mp>
					<attach>
						<mp mid="${draft.id}" part="2"/>
					</attach>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg, 'SendMsgResponse should contain m');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Delete the draft
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${draft.id}" op="delete"/>
			</MsgActionRequest>`, account1Token
		);

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		let searchRes;
		await new Promise(resolve => setTimeout(resolve, 5000));
		searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>subject:(Check sending of draft)</query>
				</SearchRequest>`, account2Token
			);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse.m, 'Message should be found');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];

		// Get message and verify attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgs[0].id}"/>
			</GetMsgRequest>`, account2Token
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msgParts = JSON.stringify(getMsgRes.GetMsgResponse);
		assert.include(msgParts, 'image/jpeg',
			'Message should contain image/jpeg attachment');
	});
});
