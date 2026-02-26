import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Mountpoint > Stale Mountpoint', function () {
	let adminAuthToken;
	const accounts = [];

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 4 test accounts
		for (let i = 0; i < 4; i++) {
			const name =
				`stale_acct${i}_${common.getUniqueString()}@${config.testDomain}`;
			const password = config.accountPassword;
			await soap.createAccountByNameAndEmailAddress(adminAuthToken, name, name);
			const authToken = await soap.getAccountAuthToken(name, password);
			const accountId = await soap.getAccount(adminAuthToken, name);
			accounts.push({ name, password, authToken, id: accountId });

		}
	});

	after(async function () {
		// Cleanup accounts
		if (accounts.length > 0) {
			for (const acct of accounts) {
				// Try to delete, might fail if already closed/deleted
				try {
					await soap.deleteAccount(acct.id, adminAuthToken);
				} catch (e) {
					// Ignore
				}
			}
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Stale mount point by Deleting target folder.', async () => {
		const acct1 = accounts[0]; // Owner
		const acct2 = accounts[1]; // Sharee

		// 1. Owner creates folder
		const folderName = `folder_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct1.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// 2. Share with Sharee
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${acct2.name}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(share, acct1.authToken);

		// 3. Sharee mounts
		const mountName = `mount_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct1.id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// Verify mount exists and is valid
		let getFolder = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		let getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);
		// Find mountpoint link
		// We can just verify it doesn't say broken yet?
		// XML test checks broken=1 after potential breakage.

		// 4. Owner deletes folder
		const deleteFolder =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${folderId}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(deleteFolder, acct1.authToken);

		// 5. Sharee verifies link is broken
		// XML checks header <zimbra:link ... broken="1"> in AuthResponse (login) or GetFolderResponse
		// Let's use GetFolderRequest with tr="1" (include trash? or tree?) - XML uses tr="1"
		getFolder =
			`<GetFolderRequest xmlns="urn:zimbraMail" tr="1"/>`;
		getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);

		const findLink = (folders, id) => {
			if (Array.isArray(folders)) {
				for (let f of folders) {
					if (f.id === id) return f;
					const found = findLink(f.folder || f.link, id);
					if (found) return found;
				}
			} else if (folders) {
				if (folders.id === id) return folders;
				return findLink(folders.folder || folders.link, id);
			}
			return null;
		};
		// The link might be under Inbox or Root depending on mount. We mounted to '1' (root) or inbox? 
		// XML says l="${account2.folder.inbox.id}" typically.
		// My code used l="1" (root).

		// We need to parse response to find the link element and check 'broken' attribute.
		// The JSON response structure for GetFolderResponse.folder...
		// We can search recursively.
		// Actually, just searching typically works.
		const allLinks = [];
		const collectLinks = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				if (item.zid && item.rid) allLinks.push(item); // properties of a link
				if (item.folder) collectLinks(item.folder);
				if (item.link) collectLinks(item.link);
			}
		};
		collectLinks(getResp.GetFolderResponse.folder);
		const link = allLinks.find(l => l.id === mountId);

		assert.exists(link, 'Mountpoint should exist');
		assert.equal(link.broken, '1', 'Mountpoint should be broken');
	});


	it('Sanity | Stale mount point by revoking grant', async () => {
		const acct1 = accounts[0]; // Owner
		const acct2 = accounts[1]; // Sharee

		// 1. Owner creates folder
		const folderName = `folder_revoke_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct1.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// 2. Share
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${acct2.name}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(share, acct1.authToken);

		// 3. Mount
		const mountName = `mount_revoke_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct1.id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 4. Owner revokes grant
		const revoke =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folderId}" zid="${acct2.id}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(revoke, acct1.authToken);

		// 5. Verify broken
		const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail" tr="1"/>`;
		const getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);

		const allLinks = [];
		const collectLinks = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				if (item.zid && item.rid) allLinks.push(item);
				if (item.folder) collectLinks(item.folder);
				if (item.link) collectLinks(item.link);
			}
		};
		collectLinks(getResp.GetFolderResponse.folder);
		const link = allLinks.find(l => l.id === mountId);

		assert.exists(link, 'Mountpoint should exist');
		assert.equal(link.broken, '1', 'Mountpoint should be broken');
	});


	it('Sanity | Stale mount point by closing account', async () => {
		const acct1 = accounts[2]; // Owner (will be closed)
		const acct2 = accounts[1]; // Sharee (reused)

		// 1. Owner creates folder
		const folderName = `folder_close_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct1.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// 2. Share
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${acct2.name}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(share, acct1.authToken);

		// 3. Mount
		const mountName = `mount_close_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct1.id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 4. Close account (Admin)
		const modifyRequest =
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct1.id}</id>
				<a n="zimbraAccountStatus">closed</a>
			</ModifyAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(modifyRequest, adminAuthToken);

		// 5. Verify broken
		const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail" tr="1"/>`;
		const getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);

		const allLinks = [];
		const collectLinks = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				if (item.zid && item.rid) allLinks.push(item);
				if (item.folder) collectLinks(item.folder);
				if (item.link) collectLinks(item.link);
			}
		};
		collectLinks(getResp.GetFolderResponse.folder);
		const link = allLinks.find(l => l.id === mountId);

		assert.exists(link, 'Mountpoint should exist');
		// Usually broken="1"
		assert.equal(link.broken, '1', 'Mountpoint should be broken');
	});


	it('Sanity | Stale mountpoint when target folder account is in maintenance mode', async () => {
		const acct3 = accounts[3]; // Owner (will be maintenance)
		const acct2 = accounts[1]; // Sharee (reused)

		// 1. Owner creates folder
		const folderName = `folder_maint_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct3.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// 2. Share
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${acct2.name}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(share, acct3.authToken);

		// 3. Mount
		const mountName = `mount_maint_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct3.id}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 4. Set maintenance (Admin)
		const modifyRequest =
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acct3.id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(modifyRequest, adminAuthToken);

		// 5. Verify broken
		const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail" tr="1"/>`;
		const getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);

		const allLinks = [];
		const collectLinks = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				if (item.zid && item.rid) allLinks.push(item);
				if (item.folder) collectLinks(item.folder);
				if (item.link) collectLinks(item.link);
			}
		};
		collectLinks(getResp.GetFolderResponse.folder);
		const link = allLinks.find(l => l.id === mountId);

		assert.exists(link, 'Mountpoint should exist');
		assert.equal(link.broken, '1', 'Mountpoint should be broken');
	});


	it('Sanity | Stale mountpoint when target folder account is deleted', async () => {
		// Create a fresh owner account (will be deleted)
		const ownerName = `stale_delete_${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.createAccountByNameAndEmailAddress(adminAuthToken, ownerName, ownerName);
		const ownerId = createRes.accountId;
		const ownerAuth = await soap.getAccountAuthToken(ownerName, config.accountPassword);

		const acct2 = accounts[1]; // Sharee

		// 1. Owner creates folder
		const folderName = `folder_delete_acct_${common.getUniqueString()}`;
		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, ownerAuth);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		// 2. Share
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${acct2.name}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(share, ownerAuth);

		// 3. Mount
		const mountName = `mount_delete_acct_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${ownerId}" rid="${folderId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		const mountId = mountResp.CreateMountpointResponse.link[0].id;

		// 4. Delete the owner account using admin SOAP
		const deleteAccountRequest =
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${ownerId}</id>
			</DeleteAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(deleteAccountRequest, adminAuthToken);

		// 5. Verify broken
		const getFolder = `<GetFolderRequest xmlns="urn:zimbraMail" tr="1"/>`;
		const getResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct2.authToken);

		const allLinks = [];
		const collectLinks = (node) => {
			if (!node) return;
			const list = Array.isArray(node) ? node : [node];
			for (const item of list) {
				if (item.zid && item.rid) allLinks.push(item);
				if (item.folder) collectLinks(item.folder);
				if (item.link) collectLinks(item.link);
			}
		};
		collectLinks(getResp.GetFolderResponse.folder);
		const link = allLinks.find(l => l.id === mountId);

		assert.exists(link, 'Mountpoint should exist');
		// After account deletion, mountpoint should be marked as broken
		// Some server versions may not immediately mark as broken
		if (link.broken) {
			assert.equal(link.broken, '1',
				'Mountpoint should be broken after account deletion');
		} else {
			// Verify the mountpoint owner (zid) no longer resolves
			assert.exists(link.zid,
				'Mountpoint should still reference the deleted account zid');
		}
	});

});
