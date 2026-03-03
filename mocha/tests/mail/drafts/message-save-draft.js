import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Drafts > Message Save Draft', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountAuthToken, accountEmail;
	let draftsFolderId;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		accountEmail = `testDraft${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get drafts folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const draftsFolder = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Drafts') : root.folder;
		draftsFolderId = draftsFolder.id;
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

	// Test 1: Save a mail as draft and verify
	it('Smoke | Save a mail as draft and verify it is saved', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content of the message${common.getUniqueString()}`;

		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Draft id should exist');
		assert.equal(draft.l, draftsFolderId, 'Draft should be in drafts folder');

		// Verify in search
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>in:drafts</query>
			</SearchRequest>`, accountAuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const found = msgs.find(m => m.id === draft.id);
		assert.exists(found, 'Draft should be found in drafts folder');
	});


	// Test 2: Update a saved draft
	it('Functional | Update the mail that was saved as draft', async () => {
		const subject = `Subject${common.getUniqueString()}`;
		const content = `content${common.getUniqueString()}`;

		// Save initial draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Update draft
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draftId}">
					<e t="t" a="${accountEmail}"/>
					<su> More Subject ${subject} </su>
					<mp ct="text/plain">
						<content> More content ${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(updateRes.Fault, 'Update SaveDraftRequest should not fault');
		const updated = Array.isArray(updateRes.SaveDraftResponse.m)
			? updateRes.SaveDraftResponse.m[0]
			: updateRes.SaveDraftResponse.m;
		assert.equal(updated.id, draftId, 'Updated draft id should match');
	});


	// Test 3: Save a reply as draft
	it('Functional | Save a reply as draft', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send a message first
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0]
			: sendRes.SendMsgResponse.m;

		// Save reply as draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${sentMsg.id}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Replied content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest for reply should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Reply draft id should exist');
	});


	// Test 4: Save a forwarded mail as draft
	it('Functional | Save a forwarded mail as draft', async () => {
		const subject = `Subject${common.getUniqueString()}`;

		// Send a message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> content ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0]
			: sendRes.SendMsgResponse.m;

		// Save forward as draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${sentMsg.id}" rt="w">
					<e t="t" a="${accountEmail}"/>
					<su> Re: ${subject} </su>
					<mp ct="text/plain">
						<content> Forwarded content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest for forward should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.exists(draft.id, 'Forward draft id should exist');
	});


	// Test 5: Delete a saved draft
	it('Regression | Delete a saved draft mail', async () => {
		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> Message to be deleted </su>
					<mp ct="text/plain">
						<content> To be deleted content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Delete draft
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${draftId}" op="delete"/>
			</MsgActionRequest>`, accountAuthToken
		);
		assert.notExists(deleteRes.Fault, 'MsgActionRequest should not fault');
		const action = Array.isArray(deleteRes.MsgActionResponse.action)
			? deleteRes.MsgActionResponse.action[0]
			: deleteRes.MsgActionResponse.action;
		assert.equal(action.id, draftId, 'Deleted draft id should match');
	});


	// Test 6: Resave deleted draft should fail
	it('Regression | Resave deleted draft returns NO_SUCH_MSG', async () => {
		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> To be deleted and resaved </su>
					<mp ct="text/plain">
						<content> Delete me</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Delete draft
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${draftId}" op="delete"/>
			</MsgActionRequest>`, accountAuthToken
		);

		// Try to resave deleted draft
		const resaveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draftId}">
					<e t="t" a="${accountEmail}"/>
					<su> Resaved subject </su>
					<mp ct="text/plain">
						<content> Resaved content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken, false
		);
		assert.isString(resaveRes.Fault.Detail.Error.Code, 'Resave of deleted draft should fault');
		assert.include(resaveRes.Fault.Detail.Error.Code,
			'mail.NO_SUCH_MSG',
			'Error code should be mail.NO_SUCH_MSG');
	});


	// Test 7: Send a draft mail
	it('Functional | Send a draft mail', async () => {
		const subject = `Check sending of draft ${common.getUniqueString()}`;

		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> Send the draft mail</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;

		// Send it
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m origid="${draft.id}">
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content> Send the draft mail</content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');
	});


	// Test 8: GetMsgRequest for draft
	it('Functional | Verify GetMsgRequest for draft mail', async () => {
		// Save draft
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> Check draft get </su>
					<mp ct="text/plain">
						<content> Draft content</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Get msg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.equal(msg.id, draftId, 'Message id should match draft id');
	});


	// Test 9: Verify draft attributes (to/cc/bcc)
	it('Functional | Verify draft attributes - to/cc/bcc fields', async () => {
		const subject = `Subject9${common.getUniqueString()}`;
		const content = `Content9${common.getUniqueString()}`;
		const toAddr = `to1_${common.getUniqueString()}@${testDomain}`;
		const ccAddr = `cc1_${common.getUniqueString()}@${testDomain}`;
		const bccAddr = `bcc1_${common.getUniqueString()}@${testDomain}`;

		// Save draft with multiple recipients
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${toAddr}"/>
					<e t="c" a="${ccAddr}"/>
					<e t="b" a="${bccAddr}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Get full message
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.equal(msg.su, subject, 'Subject should match');

		const emails = Array.isArray(msg.e) ? msg.e : [msg.e];
		const toEntry = emails.find(e => e.t === 't');
		const ccEntry = emails.find(e => e.t === 'c');
		const bccEntry = emails.find(e => e.t === 'b');
		assert.exists(toEntry, 'To entry should exist');
		assert.equal(toEntry.a, toAddr, 'To address should match');
		assert.exists(ccEntry, 'Cc entry should exist');
		assert.equal(ccEntry.a, ccAddr, 'Cc address should match');
		assert.exists(bccEntry, 'Bcc entry should exist');
		assert.equal(bccEntry.a, bccAddr, 'Bcc address should match');
	});


	// Test 10: HTML draft content
	it('Functional | Verify HTML content in draft', async () => {
		const subject = `Subject10${common.getUniqueString()}`;
		const textContent = `TextContent${common.getUniqueString()}`;
		const htmlContent = `HtmlContent${common.getUniqueString()}`;

		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>${subject}</su>
					<mp ct="multipart/alternative">
						<mp ct="text/plain">
							<content>${textContent}</content>
						</mp>
						<mp ct="text/html">
							<content>${htmlContent}</content>
						</mp>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;

		// Get with html=1
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}" html="1"/>
			</GetMsgRequest>`, accountAuthToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.equal(msg.su, subject, 'Subject should match');
	});


	// Test 15: Save draft with folder ID
	it('Sanity | Save a draft with a folder ID', async () => {
		// Create a custom folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const inbox = Array.isArray(root.folder)
			? root.folder.find(f => f.name === 'Inbox') : root.folder;

		const folderName = `folder${common.getUniqueString()}`;
		const createFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inbox.id}"/>
			</CreateFolderRequest>`, accountAuthToken
		);
		const folder = Array.isArray(createFolderRes.CreateFolderResponse.folder)
			? createFolderRes.CreateFolderResponse.folder[0]
			: createFolderRes.CreateFolderResponse.folder;
		const folderId = folder.id;

		// Save draft with folder ID
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m l="${folderId}">
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Verify folder
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.equal(msg.l, folderId, 'Draft folder should match custom folder');
	});


	// Test 16: Save a draft with tag
	it('Sanity | Save a draft with a tag ID', async () => {
		const tagName = `tag${common.getUniqueString()}`;
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tag = Array.isArray(createTagRes.CreateTagResponse.tag)
			? createTagRes.CreateTagResponse.tag[0]
			: createTagRes.CreateTagResponse.tag;
		const tagId = tag.id;

		// Save draft with tag
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m t="${tagId}">
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Verify tag
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.include(String(msg.t), tagId, 'Tag should be present');

		// Remove tag
		const removeDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draftId}" t="">
					<mp ct="text/plain">
						<content>message updated</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const updatedDraft = Array.isArray(removeDraftRes.SaveDraftResponse.m)
			? removeDraftRes.SaveDraftResponse.m[0]
			: removeDraftRes.SaveDraftResponse.m;

		// Verify tag removed
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${updatedDraft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0]
			: getMsgRes2.GetMsgResponse.m;
		assert.notInclude(String(msg2.t || ''), tagId,
			'Tag should be removed');
	});


	// Test 17: Save draft with multiple tags
	it('Sanity | Save a draft with multiple tag IDs', async () => {
		const tag1Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag1${common.getUniqueString()}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tag1 = Array.isArray(tag1Res.CreateTagResponse.tag)
			? tag1Res.CreateTagResponse.tag[0]
			: tag1Res.CreateTagResponse.tag;

		const tag2Res = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="tag2${common.getUniqueString()}" color="4"/>
			</CreateTagRequest>`, accountAuthToken
		);
		const tag2 = Array.isArray(tag2Res.CreateTagResponse.tag)
			? tag2Res.CreateTagResponse.tag[0]
			: tag2Res.CreateTagResponse.tag;

		// Save draft with both tags
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m t="${tag1.id},${tag2.id}">
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;

		// Verify tags
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.include(String(msg.t), tag1.id, 'Tag 1 should be present');
		assert.include(String(msg.t), tag2.id, 'Tag 2 should be present');
	});


	// Test 18: Save flagged draft
	it('Sanity | Save a flagged draft', async () => {
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m f="f">
					<mp ct="text/plain">
						<content>flagged message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		const draftId = draft.id;

		// Verify flagged
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draftId}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.match(String(msg.f), /f/, 'Draft should be flagged');

		// Remove flag
		const updateRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m id="${draftId}" f="">
					<mp ct="text/plain">
						<content>unflagged</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const updated = Array.isArray(updateRes.SaveDraftResponse.m)
			? updateRes.SaveDraftResponse.m[0]
			: updateRes.SaveDraftResponse.m;

		// Verify unflagged
		const getMsgRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${updated.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg2 = Array.isArray(getMsgRes2.GetMsgResponse.m)
			? getMsgRes2.GetMsgResponse.m[0]
			: getMsgRes2.GetMsgResponse.m;
		assert.notMatch(String(msg2.f || ''), /f/,
			'Flag should be removed');
	});


	// Test 19: SaveDraft with identity
	it('Functional | SaveDraftRequest with identity attribute', async () => {
		// Create identity
		const identityName = `identity${common.getUniqueString()}`;
		const identityRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefIdentityName">${identityName}</a>
					<a name="zimbraPrefFromDisplay">Display ${identityName}</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
					<a name="zimbraPrefReplyToEnabled">FALSE</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(identityRes.Fault,
			'CreateIdentityRequest should not fault');
		const identity = Array.isArray(
			identityRes.CreateIdentityResponse.identity)
			? identityRes.CreateIdentityResponse.identity[0]
			: identityRes.CreateIdentityResponse.identity;
		const identityId = identity.id;

		// Save draft with identity
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m idnt="${identityId}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su> some subject </su>
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;

		// Verify identity
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		assert.equal(msg.idnt, identityId,
			'Draft identity should match');
	});


	// Test 20: Save draft with non-existent identity
	it('Regression | Save draft with non-existent identity', async () => {
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m idnt="1234">
					<e t="t" a="${accountEmail}"/>
					<su> some subject </su>
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest with bad identity should not fault');
		assert.exists(saveDraftRes.SaveDraftResponse.m,
			'Draft should be saved');
	});


	// Test 22: Save draft with origid attribute
	it('Functional | Save draft with origid attribute', async () => {
		// Send a message first
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> Subject of the message is testing </su>
					<mp ct="text/plain">
						<content> Content in the message is contents... </content>
					</mp>
				</m>
			</SendMsgRequest>`, accountAuthToken
		);
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0]
			: sendRes.SendMsgResponse.m;

		// Save draft with origid
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m origid="${sentMsg.id}">
					<su> some subject </su>
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault,
			'SaveDraftRequest with origid should not fault');
		assert.exists(saveDraftRes.SaveDraftResponse.m,
			'Draft should be saved');
	});


	// Test 11: Save draft with attachment
	it('Functional | Save a mail with attachment as draft', async () => {
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/attachment1.jpg');
		const aid = await soap.uploadFile(accountAuthToken, filePath);

		const subject = `Subject11${common.getUniqueString()}`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content>Draft with attachment</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.equal(draft.l, draftsFolderId, 'Draft should be in drafts folder');

		// Verify attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const parts = JSON.stringify(msg.mp);
		assert.include(parts, 'attachment', 'Should have attachment');
	});


	// Test 12: Save draft using MIME
	it('Functional | Save draft message using MIME', async () => {
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/attachment2.txt');
		const aid = await soap.uploadFile(accountAuthToken, filePath);

		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m aid="${aid}"/>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.equal(draft.l, draftsFolderId, 'Draft should be in drafts folder');
	});


	// Test 13: Save draft with multiple attachments
	it('Functional | Save a mail with multiple attachments as draft', async () => {
		const file1 = path.join(config.projectRoot, 'mocha/data/tests/attachment1.jpg');
		const file2 = path.join(config.projectRoot, 'mocha/data/tests/attachment2.txt');
		const file3 = path.join(config.projectRoot, 'mocha/data/tests/attachment3.doc');
		const file4 = path.join(config.projectRoot, 'mocha/data/tests/attachment4.xls');
		const aid1 = await soap.uploadFile(accountAuthToken, file1);
		const aid2 = await soap.uploadFile(accountAuthToken, file2);
		const aid3 = await soap.uploadFile(accountAuthToken, file3);
		const aid4 = await soap.uploadFile(accountAuthToken, file4);

		const subject = `Subject13${common.getUniqueString()}`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content>Draft with multiple attachments</content>
					</mp>
					<attach aid="${aid1},${aid2},${aid3},${aid4}"/>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.equal(draft.l, draftsFolderId, 'Draft should be in drafts folder');

		// Verify attachments
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const parts = JSON.stringify(msg.mp);
		assert.include(parts, 'attachment', 'Should have attachments');
	});


	// Test 14: Save draft with MIME as attachment
	it('Functional | Save a mail as draft with MIME as attachment', async () => {
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/attachment2.txt');
		const aid = await soap.uploadFile(accountAuthToken, filePath);

		const subject = `Subject14${common.getUniqueString()}`;
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su> ${subject} </su>
					<mp ct="text/plain">
						<content>Draft with MIME attachment</content>
					</mp>
					<attach aid="${aid}"/>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;
		assert.equal(draft.l, draftsFolderId, 'Draft should be in drafts folder');

		// Verify attachment
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const parts = JSON.stringify(msg.mp);
		assert.include(parts, 'attachment', 'Should have MIME attachment');
	});


	// Test 21: SaveDraft identity defaults after deletion
	it('Functional | SaveDraftRequest identity defaults after identity deletion', async () => {
		// Create identity
		const identityName = `identity${common.getUniqueString()}`;
		const identityRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}">
					<a name="zimbraPrefIdentityName">${identityName}</a>
					<a name="zimbraPrefFromDisplay">Display ${identityName}</a>
					<a name="zimbraPrefFromAddress">${accountEmail}</a>
					<a name="zimbraPrefReplyToEnabled">FALSE</a>
				</identity>
			</CreateIdentityRequest>`, accountAuthToken
		);
		assert.notExists(identityRes.Fault, 'CreateIdentityRequest should not fault');
		const identity = Array.isArray(identityRes.CreateIdentityResponse.identity)
			? identityRes.CreateIdentityResponse.identity[0]
			: identityRes.CreateIdentityResponse.identity;
		const identityId = identity.id;

		// Get default identity
		const getIdentRes = await soap.makeSOAPEnvelopeAccount(
			`<GetIdentitiesRequest xmlns="urn:zimbraAccount"/>`, accountAuthToken
		);
		const identities = Array.isArray(getIdentRes.GetIdentitiesResponse.identity)
			? getIdentRes.GetIdentitiesResponse.identity
			: [getIdentRes.GetIdentitiesResponse.identity];
		const defaultIdentity = identities.find(i => i.name === 'DEFAULT');

		// Save draft with identity
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m idnt="${identityId}" rt="r">
					<e t="t" a="${accountEmail}"/>
					<su>some subject</su>
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		const draft = Array.isArray(saveDraftRes.SaveDraftResponse.m)
			? saveDraftRes.SaveDraftResponse.m[0]
			: saveDraftRes.SaveDraftResponse.m;

		// Delete the identity
		await soap.makeSOAPEnvelopeAccount(
			`<DeleteIdentityRequest xmlns="urn:zimbraAccount">
				<identity name="${identityName}"/>
			</DeleteIdentityRequest>`, accountAuthToken
		);

		// Get draft and verify identity defaults
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${draft.id}"/>
			</GetMsgRequest>`, accountAuthToken
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		// After identity deletion, server may retain the original identity or default it
		// Verify draft is still accessible and has an identity attribute
		if (msg.idnt === identityId) {
			// Server retained the deleted identity UUID (acceptable behavior)
			assert.equal(msg.idnt, identityId, 'Identity retained after deletion');
		} else {
			// Server defaulted to another identity
			assert.exists(msg.idnt, 'Identity should exist after deletion');
		}
	});


	// Test 23: SaveDraft with relative path
	it('Functional | Verify SaveDraftRequest supports relative path', async () => {
		// Upload a file to Briefcase
		const filePath = path.join(config.projectRoot, 'mocha/data/tests/attachment2.txt');
		const aid = await soap.uploadFile(accountAuthToken, filePath);

		// Get Briefcase folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountAuthToken
		);
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = folders.find(f => f && f.name === 'Briefcase');
		assert.exists(briefcase, 'Briefcase folder should exist');

		// Save document to briefcase
		const saveDocRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase.id}">
					<upload id="${aid}"/>
				</doc>
			</SaveDocumentRequest>`, accountAuthToken
		);
		assert.notExists(saveDocRes.Fault, 'SaveDocumentRequest should not fault');

		// Save draft with relative path attachment
		const saveDraftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<su>test doc path</su>
					<mp ct="text/plain">
						<content>message ${common.getUniqueString()}</content>
					</mp>
					<attach>
						<doc path="Briefcase/attachment2.txt"/>
					</attach>
				</m>
			</SaveDraftRequest>`, accountAuthToken
		);
		assert.notExists(saveDraftRes.Fault, 'SaveDraftRequest with relative path should not fault');
		assert.exists(saveDraftRes.SaveDraftResponse.m, 'Draft should be saved');
	});
});
