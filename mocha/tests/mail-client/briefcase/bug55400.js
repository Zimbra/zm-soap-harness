import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Briefcase > bug55400', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name;
	let account1Id;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `account1.${uid}@${config.testDomain}`;

		// Create the test account
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(res.CreateAccountResponse?.account)
			? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
		account1Id = acct?.id;
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Mail attachment types shows file type unknown binary type for known file type like doc when copied from mail attachement', async () => {
		// Login as account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Inject the mime with attachments
		await soap.injectMime(
			acct1Auth,
			`${config.data}/bug55400/bug55400.txt`
		);
		await new Promise(r => setTimeout(r, 10000));

		// Search for the injected message
		const subject = '[Bj-eng-all] 2011 China RnD Public Holiday + Force Leave Arrangement';
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message">
				<query>subject:(${subject})</query>
			</SearchRequest>`, acct1Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const msgs = Array.isArray(searchRes.SearchResponse?.m)
			? searchRes.SearchResponse.m : [searchRes.SearchResponse?.m];
		assert.exists(msgs[0], 'Message should be found');
		const messageId = msgs[0].id;

		// Get the message to verify it has attachments
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${messageId}"/>
			</GetMsgRequest>`, acct1Auth
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');

		// Get briefcase folder id
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');

		// Save first attachment (.doc) to briefcase
		const save1 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase?.id}">
					<m id="${account1Id}:${messageId}" part="2.2.4"/>
				</doc>
			</SaveDocumentRequest>`, acct1Auth
		);
		assert.notExists(save1.Fault, 'SaveDocumentRequest for doc should not fault');
		const doc1 = Array.isArray(save1.SaveDocumentResponse?.doc)
			? save1.SaveDocumentResponse.doc[0] : save1.SaveDocumentResponse?.doc;
		assert.exists(doc1, 'Document 1 should be saved');

		// Verify document via REST servlet
		const restRes1 = await soap.restRequest(doc1.id, acct1Auth);
		assert.equal(restRes1.status, 200, 'REST response should be 200');

		// Save second attachment (.xlsx) to briefcase
		const save2 = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase?.id}">
					<m id="${account1Id}:${messageId}" part="2.2.2"/>
				</doc>
			</SaveDocumentRequest>`, acct1Auth
		);
		assert.notExists(save2.Fault, 'SaveDocumentRequest for xlsx should not fault');
		const doc2 = Array.isArray(save2.SaveDocumentResponse?.doc)
			? save2.SaveDocumentResponse.doc[0] : save2.SaveDocumentResponse?.doc;
		assert.exists(doc2, 'Document 2 should be saved');

		// Verify document via REST servlet
		const restRes2 = await soap.restRequest(doc2.id, acct1Auth);
		assert.equal(restRes2.status, 200, 'REST response should be 200');
	});
});
