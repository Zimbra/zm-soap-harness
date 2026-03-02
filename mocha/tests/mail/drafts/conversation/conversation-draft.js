import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Mail > Drafts > Conversation > Conversation Draft', function () {
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
	it('Sanity | Saved draft reply of a conversation should show up in conversation search result', async () => {
		// Create test accounts
		const account1Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account2Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1AuthToken = await soap.getAccountAuthToken(account1Email);
		const account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Account 1 sends an email to account 2
		const subject = `Subject2${common.getUniqueString()}`;
		const content = `content of the second message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account1AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const message1 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Account 2 forwards back to account 1
		const fwdRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message1.id}" rt="w">
					<e t="t" a="${account1Email}"/>
					<su> Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content> $ Forwarded content : ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account2AuthToken
		);
		assert.notExists(fwdRes.Fault, 'Forward SendMsgRequest should not fault');

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Account 1 gets the conversation id
		let searchConvRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 3000));
			searchConvRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
					<query>in:inbox</query>
				</SearchRequest>`, account1AuthToken
			);
			if (searchConvRes.SearchResponse && searchConvRes.SearchResponse.c) break;
		}
		assert.notExists(searchConvRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchConvRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchConvRes.SearchResponse.c)
			? searchConvRes.SearchResponse.c : [searchConvRes.SearchResponse.c];
		const convId = convs[0].id;

		// Save draft reply with original id
		const fwdMsg = Array.isArray(fwdRes.SendMsgResponse.m)
			? fwdRes.SendMsgResponse.m[0] : fwdRes.SendMsgResponse.m;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${fwdMsg.id}" rt="r">
					<e t="t" a="${account1Email}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account1AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Get the conversation and verify it contains the draft
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, account1AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const conv = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		const convMsgs = Array.isArray(conv.m) ? conv.m : [conv.m];
		const draftInConv = convMsgs.find(m => String(m.id) === String(draft.id));
		assert.exists(draftInConv, 'Draft should be in the conversation');

		// GetMsgRequest for the draft
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, account1AuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse.m, 'GetMsgResponse should contain message');
	});


	it('Functional | Delete the parent message of the conversation but conversation will have saved draft reply', async () => {
		// Create test accounts
		const account3Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account4Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account3AuthToken = await soap.getAccountAuthToken(account3Email);
		const account4AuthToken = await soap.getAccountAuthToken(account4Email);

		// Account 3 sends an email to account 4
		const subject = `Subject2${common.getUniqueString()}`;
		const content = `content of the second message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account3AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const message3 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Account 4 forwards back to account 3
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message3.id}" rt="w">
					<e t="t" a="${account3Email}"/>
					<su> Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content> $ Forwarded content : ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account4AuthToken
		);

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// Account 3 gets the conversation id
		let searchConvRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 3000));
			searchConvRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
					<query>in:inbox</query>
				</SearchRequest>`, account3AuthToken
			);
			if (searchConvRes.SearchResponse && searchConvRes.SearchResponse.c) break;
		}
		assert.notExists(searchConvRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchConvRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchConvRes.SearchResponse.c)
			? searchConvRes.SearchResponse.c : [searchConvRes.SearchResponse.c];
		const convId = convs[0].id;

		// Delete the original message
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${message3.id}" op="delete"/>
			</MsgActionRequest>`, account3AuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');

		// Save draft reply with original id of deleted message
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${message3.id}" rt="r">
					<e t="t" a="${account4Email}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account3AuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0] : saveDraftRes.SaveDraftResponse.m;

		// Get conversation and verify it contains the draft
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, account3AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const conv2 = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		const convMsgs2 = Array.isArray(conv2.m) ? conv2.m : [conv2.m];
		const draftInConv = convMsgs2.find(m => String(m.id) === String(draft.id));
		assert.exists(draftInConv, 'Draft should be in the conversation');
	});


	it('Functional | Conversation should contain saved draft reply with same subject and with or without original id', async () => {
		// Create test accounts
		const account5Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account6Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account5Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account6Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account5AuthToken = await soap.getAccountAuthToken(account5Email);
		const account6AuthToken = await soap.getAccountAuthToken(account6Email);

		// Account 5 sends an email to account 6
		const subject = `Subject2${common.getUniqueString()}`;
		const content = `content of the message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account6Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account5AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const message5 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Account 6 forwards back to account 5
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message5.id}" rt="w">
					<e t="t" a="${account5Email}"/>
					<su> Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content> $ Forwarded content : ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account6AuthToken
		);

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account 5 gets the conversation id
		let searchConvRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 3000));
			searchConvRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
					<query>in:inbox</query>
				</SearchRequest>`, account5AuthToken
			);
			if (searchConvRes.SearchResponse && searchConvRes.SearchResponse.c) break;
		}
		assert.notExists(searchConvRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchConvRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchConvRes.SearchResponse.c)
			? searchConvRes.SearchResponse.c : [searchConvRes.SearchResponse.c];
		const convId = convs[0].id;

		// Save draft reply with same subject but WITHOUT origid (draft3)
		const saveDraft3Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account6Email}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account5AuthToken
		);
		assert.notExists(saveDraft3Res.Fault, 'SaveDraftRequest (draft3) should not fault');

		// Save draft reply with origid (draft4)
		const saveDraft4Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${message5.id}" rt="r">
					<e t="t" a="${account6Email}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account5AuthToken
		);
		assert.notExists(saveDraft4Res.Fault, 'SaveDraftRequest (draft4) should not fault');
		const draft4 = Array.isArray(saveDraft4Res.SaveDraftResponse.m)
			? saveDraft4Res.SaveDraftResponse.m[0] : saveDraft4Res.SaveDraftResponse.m;

		// Get conversation - verify draft4 is present
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, account5AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const conv3 = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		const convMsgs = Array.isArray(conv3.m) ? conv3.m : [conv3.m];
		const draft4InConv = convMsgs.find(m => String(m.id) === String(draft4.id));
		assert.exists(draft4InConv, 'Draft4 (with origid) should be in the conversation');
	});


	it('Sanity | Conversation should not contain draft with changed subject and without original id. Conversation does contain draft with changed subject but with original id.', async () => {
		// Create test accounts
		const account7Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		const account8Email = `testDraft${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account7Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account8Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account7AuthToken = await soap.getAccountAuthToken(account7Email);
		const account8AuthToken = await soap.getAccountAuthToken(account8Email);

		// Account 7 sends an email to account 8
		const subject = `Subject2${common.getUniqueString()}`;
		const content = `content of the second message${common.getUniqueString()}`;
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account8Email}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account7AuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const message7 = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;

		// Account 8 forwards back to account 7
		await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${message7.id}" rt="w">
					<e t="t" a="${account7Email}"/>
					<su> Fwd: ${subject}</su>
					<mp ct="text/plain">
						<content> $ Forwarded content : ${content}</content>
					</mp>
				</m>
			</SendMsgRequest>`, account8AuthToken
		);

		// Wait for message delivery
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Account 7 gets the conversation id
		let searchConvRes;
		for (let retry = 0; retry < 3; retry++) {
			if (retry > 0) await new Promise(r => setTimeout(r, 3000));
			searchConvRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="conversation" sortBy="dateDesc" offset="0" limit="25">
					<query>in:inbox</query>
				</SearchRequest>`, account7AuthToken
			);
			if (searchConvRes.SearchResponse && searchConvRes.SearchResponse.c) break;
		}
		assert.notExists(searchConvRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchConvRes.SearchResponse.c, 'Should find conversations');
		const convs = Array.isArray(searchConvRes.SearchResponse.c)
			? searchConvRes.SearchResponse.c : [searchConvRes.SearchResponse.c];
		const convId = convs[0].id;

		// Save draft with changed subject and without original id (draft5)
		const saveDraft5Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account8Email}"/>
					<su> new subject </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account7AuthToken
		);
		assert.notExists(saveDraft5Res.Fault, 'SaveDraftRequest (draft5) should not fault');
		const draft5 = Array.isArray(saveDraft5Res.SaveDraftResponse.m)
			? saveDraft5Res.SaveDraftResponse.m[0] : saveDraft5Res.SaveDraftResponse.m;

		// Save draft with changed subject but with original id (draft6)
		const saveDraft6Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${message7.id}" rt="r">
					<e t="t" a="${account8Email}"/>
					<su> New subject </su>
					<mp ct="text/plain">
						<content> Replied content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, account7AuthToken
		);
		assert.notExists(saveDraft6Res.Fault, 'SaveDraftRequest (draft6) should not fault');
		const draft6 = Array.isArray(saveDraft6Res.SaveDraftResponse.m)
			? saveDraft6Res.SaveDraftResponse.m[0] : saveDraft6Res.SaveDraftResponse.m;

		// Get conversation and verify draft6 is present but draft5 is not
		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, account7AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const conv3 = Array.isArray(getConvRes.GetConvResponse.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse.c;
		const convMsgs = Array.isArray(conv3.m) ? conv3.m : [conv3.m];
		const draft6InConv = convMsgs.find(m => String(m.id) === String(draft6.id));
		assert.exists(draft6InConv, 'Draft6 (with origid) should be in the conversation');
		const draft5InConv = convMsgs.find(m => String(m.id) === String(draft5.id));
		assert.notExists(draft5InConv,
			'Draft5 (without origid, changed subject) should NOT be in the conversation');
	});
});
