import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Contacts > Bugs > Bug 48306', function () {
	this.timeout(120 * 1000);
	let adminAuthToken, accountEmail, accountToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		accountToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Import CSV with field delimiter and verify contact details', async () => {
		const csvContent = 'First Name,Last Name,E-mail Address,Birthday,Custom 1\nScruffy,Dog,scruffy@not.fatkudu.net,2003-08-28,Street Dog';

		// Import contacts
		const importRes = await soap.makeSOAPEnvelopeAccount(
			`<ImportContactsRequest xmlns="urn:zimbraMail" ct="csv">
				<content>${csvContent}</content>
			</ImportContactsRequest>`, accountToken
		);

		// Verify import response
		assert.notExists(importRes.Fault, 'Import should not be a Fault');
		const importCn = Array.isArray(importRes.ImportContactsResponse.cn)
			? importRes.ImportContactsResponse.cn[0] : importRes.ImportContactsResponse.cn;
		assert.equal(importCn.n, '1', 'Import should count 1 contact');
		assert.exists(importCn.ids, 'Import cn should have ids');
		const contactId = importCn.ids;

		// Get folder structure
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, accountToken
		);
		assert.notExists(folderRes.Fault, 'GetFolder should not fault');
		const rootFolder = Array.isArray(folderRes.GetFolderResponse.folder)
			? folderRes.GetFolderResponse.folder[0] : folderRes.GetFolderResponse.folder;
		const folders = Array.isArray(rootFolder.folder) ? rootFolder.folder : [rootFolder.folder];
		const inboxFolder = folders.find(f => f.name === 'Inbox');
		assert.exists(inboxFolder, 'Inbox folder should exist');
		assert.exists(inboxFolder.id, 'Inbox folder id should exist');
		const trashFolder = folders.find(f => f.name === 'Trash');
		assert.exists(trashFolder, 'Trash folder should exist');
		const sentFolder = folders.find(f => f.name === 'Sent');
		assert.exists(sentFolder, 'Sent folder should exist');

		// Get the imported contact
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetContactsRequest xmlns="urn:zimbraMail">
				<cn id="${contactId}"/>
			</GetContactsRequest>`, accountToken
		);

		// Verify contact details
		assert.notExists(getRes.Fault, 'GetContacts should not be a Fault');
		const getCn = Array.isArray(getRes.GetContactsResponse.cn)
			? getRes.GetContactsResponse.cn[0] : getRes.GetContactsResponse.cn;
		const getAttrs = getCn._attrs || {};
		const getAttr = (name) => getAttrs[name];
		assert.equal(getAttr('Custom 1'), 'Street Dog', 'Custom 1 should match');
		assert.equal(getAttr('email'), 'scruffy@not.fatkudu.net', 'email should match');
		assert.equal(getAttr('birthday'), '2003-08-28', 'birthday should match');
		assert.equal(getAttr('firstName'), 'Scruffy', 'firstName should match');
	});
});
