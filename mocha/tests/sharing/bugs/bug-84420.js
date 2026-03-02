import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Sharing > Bugs > Bug 84420', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Id, account1AuthToken;
	let account2Email, account2AuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Email = `user1.${common.getUniqueString()}@${testDomain}`;
		const res1 = await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account1Email, account1Email
		);
		account1Id = res1.accountId;
		account1AuthToken = await soap.getAccountAuthToken(account1Email, config.accountPassword);

		// Create account2
		account2Email = `user2.${common.getUniqueString()}@${testDomain}`;
		await soap.createAccountByNameAndEmailAddress(
			adminAuthToken, account2Email, account2Email
		);
		account2AuthToken = await soap.getAccountAuthToken(account2Email, config.accountPassword);
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
	it('Sanity | Cant move subfolders in shared email folder', async () => {
		// As account1: create nested folders under Inbox
		// Inbox > Folder1 > SubFolder1 > SubFolder2
		let res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const folders = res.GetFolderResponse.folder[0].folder;
		const inbox = folders.find(f => f.name === 'Inbox');

		// Verify response
		assert.exists(inbox, 'Inbox folder should exist');
		const inboxId = inbox.id;

		// Create Folder1 under Inbox
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="Folder1" l="${inboxId}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest for Folder1 should not fault');
		const folder1Id = res.CreateFolderResponse.folder[0].id;

		// Create SubFolder1 under Folder1
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubFolder1" l="${folder1Id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest for SubFolder1 should not fault');
		const subFolder1Id = res.CreateFolderResponse.folder[0].id;

		// Create SubFolder2 under SubFolder1
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="SubFolder2" l="${subFolder1Id}"/>
			</CreateFolderRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateFolderRequest for SubFolder2 should not fault');

		// Share Inbox with account2
		res = await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${account2Email}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'FolderActionRequest grant should not fault');
		const folderAction = Array.isArray(res.FolderActionResponse.action)
			? res.FolderActionResponse.action[0] : res.FolderActionResponse.action;
		assert.exists(folderAction, 'FolderActionResponse should contain action');

		// Send share notification
		res = await soap.makeSOAPEnvelopeAccount(
			`<SendShareNotificationRequest xmlns="urn:zimbraMail">
				<share l="${inboxId}" gt="usr" d="${account2Email}"/>
				<notes>test notes</notes>
			</SendShareNotificationRequest>`, account1AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'SendShareNotificationRequest should not fault');

		// Wait for notification delivery
		await new Promise(resolve => setTimeout(resolve, 5000));

		// As account2: mount the shared Inbox
		res = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest should not fault');
		const account2Folders = res.GetFolderResponse.folder[0].folder;
		const account2Inbox = account2Folders.find(f => f.name === 'Inbox');
		const account2InboxId = account2Inbox.id;

		const mountName = `sharedfolder.${common.getUniqueString()}`;

		// CreateMountpointRequest
		res = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${account2InboxId}" name="${mountName}"
					zid="${account1Id}" rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'CreateMountpointRequest should not fault');
		assert.exists(res.CreateMountpointResponse,
			'CreateMountpointResponse should exist');
		const mountId = res.CreateMountpointResponse.link[0].id;

		// Get folder structure of mounted inbox to find SubFolder2 and Folder1
		res = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${mountId}"/>
			</GetFolderRequest>`, account2AuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'GetFolderRequest for mount should not fault');

		// Navigate to find SubFolder2 and Folder1 IDs from the mounted structure
		const mountLink = res.GetFolderResponse.link
			? (Array.isArray(res.GetFolderResponse.link) ? res.GetFolderResponse.link[0] : res.GetFolderResponse.link)
			: res.GetFolderResponse.folder[0];

		// Verify response
		assert.exists(mountLink, 'Mount link should exist in response');

		// Find Folder1 and SubFolder2 in the nested structure
		const findFolder = (node, name) => {
			if (!node) return null;
			if (node.name === name) return node;
			const children = node.folder || [];
			const childArr = Array.isArray(children) ? children : [children];
			for (const child of childArr) {
				const found = findFolder(child, name);
				if (found) return found;
			}
			return null;
		};

		const remoteFold1 = findFolder(mountLink, 'Folder1');
		const remoteSubFold2 = findFolder(mountLink, 'SubFolder2');

		if (remoteFold1 && remoteSubFold2) {
			// Move SubFolder2 to Folder1 (from SubFolder1 to Folder1)
			res = await soap.makeSOAPEnvelopeAccount(
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="move" id="${remoteSubFold2.id}" l="${remoteFold1.id}"/>
				</FolderActionRequest>`, account2AuthToken
			);

			// Verify response
			assert.notExists(res.Fault, 'FolderActionRequest move should not fault');
			assert.exists(res.FolderActionResponse,
				'FolderActionResponse for move should exist');

			// Verify the folder structure after move
			res = await soap.makeSOAPEnvelopeAccount(
				`<GetFolderRequest xmlns="urn:zimbraMail">
					<folder l="${mountId}"/>
				</GetFolderRequest>`, account2AuthToken
			);

			// Verify response
			assert.notExists(res.Fault, 'GetFolderRequest after move should not fault');
		}
	});
});
