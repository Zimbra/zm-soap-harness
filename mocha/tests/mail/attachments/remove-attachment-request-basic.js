import path from 'node:path';
import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Attachments > Remove Attachment Request Basic', function () {
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
	it('Sanity | Verify that RemoveAttachmentsRequest remove attachment from single attached msg', async () => {
		// Create accounts
		const account1Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account1Token = await soap.getAccountAuthToken(account1Email);

		const account2Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get briefcase folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account1Token
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = folders.find(f => f.name === 'Briefcase');

		// Upload file
		const filePath = path.resolve('data/contact/contact1.txt');
		const aid = await soap.uploadFile(account1Token, filePath);
		assert.exists(aid, 'Upload should return attachment id');

		// Save document to briefcase
		const saveDocRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase.id}">
					<upload id="${aid}"/>
				</doc>
			</SaveDocumentRequest>`, account1Token
		);
		assert.notExists(saveDocRes.Fault, 'SaveDocumentRequest should not fault');
		const doc = Array.isArray(saveDocRes.SaveDocumentResponse.doc)
			? saveDocRes.SaveDocumentResponse.doc[0]
			: saveDocRes.SaveDocumentResponse.doc;

		// Save draft with attachment
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<attach>
						<doc id="${doc.id}"/>
					</attach>
					<e t="f" a="${account1Email}"/>
				</m>
			</SaveDraftRequest>`, account1Token
		);
		assert.notExists(draftRes.Fault, 'SaveDraftRequest should not fault');
		const draft = Array.isArray(draftRes.SaveDraftResponse.m)
			? draftRes.SaveDraftResponse.m[0] : draftRes.SaveDraftResponse.m;

		// Send message with attachment from draft
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Email}"/>
					<su>Send with attachment</su>
					<mp ct="text/plain"/>
					<attach>
						<mp mid="${draft.id}" part="1"/>
					</attach>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account2Token = await soap.getAccountAuthToken(account2Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Send with attachment)</query>
			</SearchRequest>`, account2Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Remove attachment
		const removeRes = await soap.makeSOAPEnvelopeAccount(
			`<RemoveAttachmentsRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" part="2"/>
			</RemoveAttachmentsRequest>`, account2Token
		);
		assert.notExists(removeRes.Fault, 'RemoveAttachmentsRequest should not fault');
		assert.exists(removeRes.RemoveAttachmentsResponse,
			'RemoveAttachmentsResponse should exist');
	});


	it('Sanity | Verify that RemoveAttachmentsRequest remove attachments from msg with multiple attachment', async () => {
		// Create accounts
		const account3Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account3Token = await soap.getAccountAuthToken(account3Email);

		const account4Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Get briefcase folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, account3Token
		);
		assert.notExists(getFolderRes.Fault, 'GetFolderRequest should not fault');
		const root = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder[0]
			: getFolderRes.GetFolderResponse.folder;
		const folders = Array.isArray(root.folder) ? root.folder : [root.folder];
		const briefcase = folders.find(f => f.name === 'Briefcase');

		// Upload two files
		const file1 = path.resolve('data/email01/msg01.txt');
		const aid1 = await soap.uploadFile(account3Token, file1);
		const file2 = path.resolve('data/email01/msg02.txt');
		const aid2 = await soap.uploadFile(account3Token, file2);

		// Save both documents to briefcase
		const saveDoc1Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase.id}">
					<upload id="${aid1}"/>
				</doc>
			</SaveDocumentRequest>`, account3Token
		);
		assert.notExists(saveDoc1Res.Fault, 'SaveDocumentRequest 1 should not fault');
		const doc1 = Array.isArray(saveDoc1Res.SaveDocumentResponse.doc)
			? saveDoc1Res.SaveDocumentResponse.doc[0]
			: saveDoc1Res.SaveDocumentResponse.doc;

		const saveDoc2Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase.id}">
					<upload id="${aid2}"/>
				</doc>
			</SaveDocumentRequest>`, account3Token
		);
		assert.notExists(saveDoc2Res.Fault, 'SaveDocumentRequest 2 should not fault');
		const doc2 = Array.isArray(saveDoc2Res.SaveDocumentResponse.doc)
			? saveDoc2Res.SaveDocumentResponse.doc[0]
			: saveDoc2Res.SaveDocumentResponse.doc;

		// Save drafts with attachments
		const draft1Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<attach>
						<doc id="${doc1.id}"/>
					</attach>
					<e t="f" a="${account3Email}"/>
				</m>
			</SaveDraftRequest>`, account3Token
		);
		assert.notExists(draft1Res.Fault, 'SaveDraftRequest 1 should not fault');
		const draftMsg1 = Array.isArray(draft1Res.SaveDraftResponse.m)
			? draft1Res.SaveDraftResponse.m[0] : draft1Res.SaveDraftResponse.m;

		const draft2Res = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<attach>
						<doc id="${doc2.id}"/>
					</attach>
					<e t="f" a="${account3Email}"/>
				</m>
			</SaveDraftRequest>`, account3Token
		);
		assert.notExists(draft2Res.Fault, 'SaveDraftRequest 2 should not fault');

		// Send message with first attachment
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Email}"/>
					<e t="c" a="${account3Email}"/>
					<su>Send with attachment</su>
					<mp ct="text/plain"/>
					<attach>
						<mp mid="${draftMsg1.id}" part="1"/>
					</attach>
				</m>
			</SendMsgRequest>`, account3Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account4Token = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Send with attachment)</query>
			</SearchRequest>`, account4Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Remove attachments (parts 1 and 2)
		const removeRes = await soap.makeSOAPEnvelopeAccount(
			`<RemoveAttachmentsRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" part="1,2"/>
			</RemoveAttachmentsRequest>`, account4Token
		);
		assert.notExists(removeRes.Fault, 'RemoveAttachmentsRequest should not fault');
		assert.exists(removeRes.RemoveAttachmentsResponse,
			'RemoveAttachmentsResponse should exist');
	});


	it('Regression | Verify that RemoveAttachmentsRequest return error code for invalid part sent in request', async () => {
		// Create accounts
		const account3Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const account3Token = await soap.getAccountAuthToken(account3Email);

		const account4Email = `account${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Send message without attachment
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Email}"/>
					<e t="c" a="${account3Email}"/>
					<su>Send without attachment</su>
					<mp ct="text/plain"/>
				</m>
			</SendMsgRequest>`, account3Token
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Search for message as recipient
		const account4Token = await soap.getAccountAuthToken(account4Email);

		await new Promise(resolve => setTimeout(resolve, 2000));
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(Send without attachment)</query>
			</SearchRequest>`, account4Token
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse.m];
		const msgId = msgs[0].id;

		// Remove with invalid part "#" — should return service.INVALID_REQUEST
		const removeInvalidRes = await soap.makeSOAPEnvelopeAccount(
			`<RemoveAttachmentsRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" part="#"/>
			</RemoveAttachmentsRequest>`, account4Token, false
		);
		assert.exists(removeInvalidRes.Fault, 'Should return Fault for invalid part');
		assert.include(removeInvalidRes.Fault.Detail.Error.Code,
			'service.INVALID_REQUEST', 'Should return INVALID_REQUEST');

		// Remove with non-existent part "5" — should return mail.NO_SUCH_PART
		const removeNoPartRes = await soap.makeSOAPEnvelopeAccount(
			`<RemoveAttachmentsRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" part="5"/>
			</RemoveAttachmentsRequest>`, account4Token, false
		);
		assert.exists(removeNoPartRes.Fault, 'Should return Fault for non-existent part');
		assert.include(removeNoPartRes.Fault.Detail.Error.Code,
			'mail.NO_SUCH_PART', 'Should return NO_SUCH_PART');
	});
});
