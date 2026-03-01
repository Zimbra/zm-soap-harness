import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sync > Mountpoint > SyncRequest Contacts', function () {
	this.timeout(60 * 1000);
	let adminAuthToken = null;
	let account1Email = null, account1AuthToken = null, account1Id = null;
	let account2Email = null, account2AuthToken = null;
	let contactsFolderId = null;

	before(async () => {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		account1Email = account1Name;
		account1Id = createRes1.CreateAccountResponse.account[0].id;
		account1AuthToken = await soap.getAccountAuthToken(account1Email);

		// Create account2
		const account2Name = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${soap.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		account2Email = account2Name;
		account2AuthToken = await soap.getAccountAuthToken(account2Email);

		// Get account1 contacts folder id
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(getFolderRes.Fault, 'Response should not be a Fault');
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const contactsFolder = folders[0].folder.find(f => f.name === 'Contacts');
		contactsFolderId = contactsFolder.id;

		// Grant read access on contacts to account2
		const grantRes = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${contactsFolderId}" op="grant">
					<grant d="${account2Email}" gt="usr" perm="r"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(grantRes.Fault, 'Response should not be a Fault');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify that a new contact in a shared folder is listed in the SyncResponse', async () => {
		// Get sync token as account2 on shared contacts
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Create contact as account1
		const firstName = `first${common.getUniqueString()}`;
		const lastName = `last${common.getUniqueString()}`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">${firstName}</a>
					<a n="lastName">${lastName}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateContactResponse, 'CreateContactResponse should exist');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Sync as account2 - verify contact appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncContacts = Array.isArray(syncRes2.SyncResponse.cn)
			? syncRes2.SyncResponse.cn
			: (syncRes2.SyncResponse.cn ? [syncRes2.SyncResponse.cn] : []);
		const matchCn = syncContacts.find(c => c.id === `${account1Id}:${contactId}`);

		// Verify response
		assert.exists(matchCn, 'Contact should appear in SyncResponse');
	});


	it('Functional | Verify that a deleted contact in a shared folder is listed in the SyncResponse', async () => {
		// Create contact first
		const firstName = `first${common.getUniqueString()}`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">${firstName}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Delete contact as account1
		const deleteRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${contactId}"/>
			</ContactActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(deleteRes.Fault, 'Response should not be a Fault');

		// Wait for server to process deletion
		await new Promise(resolve => setTimeout(resolve, 3000));

		// Sync as account2 - verify deleted
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		assert.exists(syncRes2.SyncResponse.deleted,
			'SyncResponse should have deleted element');
		const delObj = syncRes2.SyncResponse.deleted;
		const deletedIds = String(delObj.ids || delObj.id || delObj || '');

		// Verify response
		assert.isNotEmpty(deletedIds,
			'SyncResponse should have deleted ids');
	});


	it('Functional | Verify that a new contact (moved) in a shared folder is listed in the SyncResponse', async () => {
		// Get trash folder
		const getFolderRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);
		const folders = Array.isArray(getFolderRes.GetFolderResponse.folder)
			? getFolderRes.GetFolderResponse.folder : [getFolderRes.GetFolderResponse.folder];
		const trashFolder = folders[0].folder.find(f => f.name === 'Trash');
		const trashId = trashFolder.id;

		// Create contact in trash
		const firstName = `first${common.getUniqueString()}`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${trashId}">
					<a n="firstName">${firstName}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Move contact to contacts folder
		const moveRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="move" id="${contactId}" l="${contactsFolderId}"/>
			</ContactActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(moveRes.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify moved contact
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncContacts = Array.isArray(syncRes2.SyncResponse.cn)
			? syncRes2.SyncResponse.cn
			: (syncRes2.SyncResponse.cn ? [syncRes2.SyncResponse.cn] : []);
		const matchCn = syncContacts.find(c => c.id === `${account1Id}:${contactId}`);

		// Verify response
		assert.exists(matchCn, 'Moved contact should appear in SyncResponse');
	});


	it('Functional | Verify that a modified contact in a shared folder is listed in the SyncResponse', async () => {
		// Create contact
		const firstName = `first${common.getUniqueString()}`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">${firstName}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Modify contact - add lastName
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyContactRequest xmlns="urn:zimbraMail" replace="0" force="1">
				<cn id="${contactId}">
					<a n="lastName">modified${common.getUniqueString()}</a>
				</cn>
			</ModifyContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Response should not be a Fault');
		assert.exists(modRes.ModifyContactResponse, 'ModifyContactResponse should exist');

		// Sync as account2 - verify modified contact
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncContacts = Array.isArray(syncRes2.SyncResponse.cn)
			? syncRes2.SyncResponse.cn
			: (syncRes2.SyncResponse.cn ? [syncRes2.SyncResponse.cn] : []);
		const matchCn = syncContacts.find(c => c.id === `${account1Id}:${contactId}`);

		// Verify response
		assert.exists(matchCn, 'Modified contact should appear in SyncResponse');
	});


	it('Functional | Verify that a tagged message in a shared folder is listed in the SyncResponse', async () => {
		// Create contact
		const firstName = `first${common.getUniqueString()}`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">${firstName}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Create tag as account1
		const tagName = `tag${common.getUniqueString()}`;

		// CreateTagRequest
		const createTagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="4"/>
			</CreateTagRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createTagRes.Fault, 'Response should not be a Fault');
		const tagId = createTagRes.CreateTagResponse.tag[0].id;

		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Tag the contact
		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<ContactActionRequest xmlns="urn:zimbraMail">
				<action op="tag" id="${contactId}" tag="${tagId}"/>
			</ContactActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(tagRes.Fault, 'Response should not be a Fault');

		// Sync as account2 - verify tagged contact appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncContacts = Array.isArray(syncRes2.SyncResponse.cn)
			? syncRes2.SyncResponse.cn
			: (syncRes2.SyncResponse.cn ? [syncRes2.SyncResponse.cn] : []);
		const matchCn = syncContacts.find(c => c.id === `${account1Id}:${contactId}`);

		// Verify response
		assert.exists(matchCn, 'Tagged contact should appear in SyncResponse');
	});


	it('Sanity | Verify that a emailed contact in a shared folder is listed in the SyncResponse', async () => {
		// Sync as account2 to get token
		const syncRes1 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}" xmlns="urn:zimbraMail"/>`,
			account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes1.Fault, 'Response should not be a Fault');
		const token = syncRes1.SyncResponse.token;

		// Create emailed contact in contacts folder as account1
		const email = `contact${common.getUniqueString()}@example.com`;

		// CreateContactRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn l="${contactsFolderId}">
					<a n="firstName">emailed${common.getUniqueString()}</a>
					<a n="email">${email}</a>
				</cn>
			</CreateContactRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const contactId = createRes.CreateContactResponse.cn[0].id;

		// Sync as account2 - verify emailed contact appears
		const syncRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SyncRequest l="${account1Id}:${contactsFolderId}"
				token="${token}" xmlns="urn:zimbraMail"/>`, account2AuthToken
		);

		// Verify response
		assert.notExists(syncRes2.Fault, 'Response should not be a Fault');
		const syncContacts = Array.isArray(syncRes2.SyncResponse.cn)
			? syncRes2.SyncResponse.cn
			: (syncRes2.SyncResponse.cn ? [syncRes2.SyncResponse.cn] : []);
		const matchCn = syncContacts.find(c => c.id === `${account1Id}:${contactId}`);

		// Verify response
		assert.exists(matchCn, 'Emailed contact should appear in SyncResponse');
	});
});
