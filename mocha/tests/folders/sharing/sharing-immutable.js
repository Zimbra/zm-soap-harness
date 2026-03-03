import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Sharing > Sharing Immutable', function () {
	let testAccount1, testAccount2;
	let auth1, auth2;
	let account1Id;

	before(async function () {
		await main.before(this);
		testAccount1 = `immutable1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `immutable2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		auth2 = await soap.getAccountAuthToken(testAccount2, config.accountPassword);

		account1Id = res1.accountId;

		// Grant 'manager' rights to Account2 on Account1's Root (Inherit)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// FolderActionRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const rootId = resp.GetFolderResponse.folder[0].id;

		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${rootId}">
					<grant gt="usr" d="${testAccount2}" perm="rwidxa"/>
				</action>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
	});

	beforeEach(async function () {
		await main.beforeEach(this);
	});

	afterEach(async function () {
		await main.afterEach(this);
	});

	const verifyImmutable = async (op, folderName, newName = null, newParent = null) => {
		// Get Acc1 folders to find ID
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);

		// Recursively collect all folders
		const allFolders = [];
		const collectFolders = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				allFolders.push(item);
				if (item.folder) collectFolders(item.folder);
			}
		};
		collectFolders(resp.GetFolderResponse.folder);

		const folder = allFolders.find(f => f.name === folderName);

		// Verify response
		assert.exists(folder, `Folder ${folderName} should exist`);

		let actionXml = '';
		if (op === 'delete') {
			actionXml =
				`<action op="delete" id="${account1Id}:${folder.id}"/>`;
		} else if (op === 'rename') {
			actionXml =
				`<action op="rename" id="${account1Id}:${folder.id}" name="${newName}"/>`;
		} else if (op === 'move') {
			actionXml =
				`<action op="move" id="${account1Id}:${folder.id}" l="${account1Id}:${newParent}"/>`;
		}

		const request =
			`<FolderActionRequest xmlns="urn:zimbraMail">${actionXml}</FolderActionRequest>`;
		const response = await soap.makeSOAPEnvelopeAccount(request, auth2, false);

		// Verify response
		assert.exists(response.Fault.Detail.Error,
			`Fault Error should exist when ${op} immutable folder ${folderName}`);
		assert.match(response.Fault.Reason.Text, /immutable/i,
			`Should fail with mail.IMMUTABLE_OBJECT for ${op} ${folderName}`);
	};

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify that a shared immutable folders cannot be hard deleted', async () => {
		const systemFolders = ['Inbox', 'Drafts', 'Junk', 'Trash', 'Sent', 'Contacts', 'Emailed Contacts', 'Calendar', 'Tasks', 'Chats'];
		for (const fname of systemFolders) {
			await verifyImmutable('delete', fname);
		}
	});


	it('Sanity | Verify that a shared immutable folders cannot be renamed', async () => {
		const systemFolders = ['Inbox', 'Drafts', 'Junk', 'Trash', 'Sent', 'Contacts', 'Emailed Contacts', 'Calendar', 'Tasks', 'Chats'];
		for (const fname of systemFolders) {
			await verifyImmutable('rename', fname, `rename_${common.getUniqueString()}`);
		}
	});


	it('Sanity | Verify that a shared immutable folders cannot be moved', async () => {
		// Create a custom folder to move TO
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const resp = await soap.makeSOAPEnvelopeAccount(getFolder, auth1);
		const inboxId = resp.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="target_${common.getUniqueString()}" l="${inboxId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const targetId = createResp.CreateFolderResponse.folder[0].id;

		const systemFolders = ['Inbox', 'Drafts', 'Junk', 'Trash', 'Sent', 'Contacts', 'Emailed Contacts', 'Calendar', 'Tasks', 'Chats'];
		for (const fname of systemFolders) {
			// Inbox cannot move to itself, but let's try moving Inbox to target? Or Target to Inbox?
			// "Cannot move system folder" -> try to move Inbox INTO target.
			// But skip if folder is 'Inbox' and target is inside 'Inbox'? Circular? 
			// XML test just tries moving everything to 'folder1'.
			await verifyImmutable('move', fname, null, targetId);
		}
	});

});
