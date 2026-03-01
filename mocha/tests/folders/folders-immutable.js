import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('Folders > Folders Immutable', function () {
	this.timeout(120 * 1000);
	let accountAuthToken;
	let folderIds = {};

	before(async function () {
		await main.before(this);
		const accountEmail = soap.testAccounts.testAccount1.emailAddress;
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);

		// Get all system folder ids
		const getFolderRequest = '<GetFolderRequest xmlns=\'urn:zimbraMail\'/>';
		const response = await soap.makeSOAPEnvelopeAccount(getFolderRequest, accountAuthToken);
		const folders = response.GetFolderResponse.folder[0].folder;

		folderIds.root = response.GetFolderResponse.folder[0].id;
		folderIds.inbox = folders.find(f => f.name === 'Inbox').id;
		folderIds.drafts = folders.find(f => f.name === 'Drafts').id;
		folderIds.junk = folders.find(f => f.name === 'Junk').id;
		folderIds.trash = folders.find(f => f.name === 'Trash').id;
		folderIds.sent = folders.find(f => f.name === 'Sent').id;
		folderIds.contacts = folders.find(f => f.name === 'Contacts').id;
		folderIds.calendar = folders.find(f => f.name === 'Calendar').id;
		const emailedContacts = folders.find(f => f.name === 'Emailed Contacts');
		if (emailedContacts) folderIds.emailed = emailedContacts.id;
		const tasks = folders.find(f => f.name === 'Tasks');
		if (tasks) folderIds.tasks = tasks.id;
		const chats = folders.find(f => f.name === 'Chats');
		if (chats) folderIds.chats = chats.id;
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
	it('Sanity | Verify that the immutable folders cannot be hard deleted', async () => {
		const systemFolders = ['inbox', 'drafts', 'junk', 'trash', 'sent', 'contacts', 'calendar'];

		for (const folderKey of systemFolders) {
			const folderId = folderIds[folderKey];
			if (!folderId) continue;

			const deleteRequest =
				`<FolderActionRequest xmlns='urn:zimbraMail'>
					<action op='delete' id='${folderId}'/>
				</FolderActionRequest>`;
			const response = await soap.makeSOAPEnvelopeAccount(deleteRequest, accountAuthToken, false);

			// Verify response
			assert.exists(response.Fault,
				`Verify Fault exists when deleting ${folderKey} folder`);
			const faultText = response.Fault.Reason ? response.Fault.Reason.Text : JSON.stringify(response.Fault);

			// Verify response
			assert.isTrue(faultText.includes('immutable') || faultText.includes('IMMUTABLE'),
				`Verify immutable error when deleting ${folderKey} folder, got: ${faultText}`
			);
		}
	});


	it('Sanity | Verify that the immutable folders cannot be renamed', async () => {
		const systemFolders = ['inbox', 'drafts', 'junk', 'trash', 'sent', 'contacts', 'calendar'];

		for (const folderKey of systemFolders) {
			const folderId = folderIds[folderKey];
			if (!folderId) continue;

			const renameRequest =
				`<FolderActionRequest xmlns='urn:zimbraMail'>
					<action op='rename' id='${folderId}' name='folder${common.getUniqueString()}'/>
				</FolderActionRequest>`;
			const response = await soap.makeSOAPEnvelopeAccount(renameRequest, accountAuthToken, false);

			// Verify response
			assert.exists(response.Fault,
				`Verify Fault exists when renaming ${folderKey} folder`);
			const faultText = response.Fault.Reason ? response.Fault.Reason.Text : JSON.stringify(response.Fault);

			// Verify response
			assert.isTrue(faultText.includes('immutable') || faultText.includes('IMMUTABLE'),
				`Verify immutable error when renaming ${folderKey} folder, got: ${faultText}`
			);
		}
	});


	it('Sanity | Verify that the immutable folders cannot be moved', async () => {
		// Create a target folder to move into
		const targetFolderName = `target ${common.getUniqueString()}`;
		const createRequest =
			`<CreateFolderRequest xmlns='urn:zimbraMail'>
				<folder name='${targetFolderName}' l='${folderIds.inbox}'/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResponse = await soap.makeSOAPEnvelopeAccount(createRequest, accountAuthToken);
		const targetId = createResponse.CreateFolderResponse.folder[0].id;
		const systemFolders = ['inbox', 'drafts', 'junk', 'trash', 'sent', 'contacts', 'calendar'];

		for (const folderKey of systemFolders) {
			const folderId = folderIds[folderKey];
			if (!folderId) continue;

			const moveRequest =
				`<FolderActionRequest xmlns='urn:zimbraMail'>
					<action op='move' id='${folderId}' l='${targetId}'/>
				</FolderActionRequest>`;
			const response = await soap.makeSOAPEnvelopeAccount(moveRequest, accountAuthToken, false);

			// Verify response
			assert.exists(response.Fault,
				`Verify Fault exists when moving ${folderKey} folder`);
			const faultText = response.Fault.Reason ? response.Fault.Reason.Text : JSON.stringify(response.Fault);

			// Verify response
			assert.isTrue(faultText.includes('immutable') || faultText.includes('IMMUTABLE'),
				`Verify immutable error when moving ${folderKey} folder, got: ${faultText}`
			);
		}
	});

});
