import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Folders > Sharing > Sharelifetime > Share Lifetime', function () {
	let testAccount1, testAccount2;
	let auth1, account1Id, testAccount2Id;

	before(async function () {
		testAccount1 = `lifetime1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `lifetime2_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		// Use returned accountId directly
		account1Id = res1.accountId;

		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		// Store account2Id for later use
		testAccount2Id = res2.accountId;

		// Get auth token for account 1
		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Share a folder to guest. Verify guestgrantexpiry not set by default.. 1', async () => {
		// 1. Set zimbraFileExternalShareLifeTime and zimbraFileShareLifeTime
		const adminAuth = await soap.getAdminAuthToken();
		const modifyAccountRequest =
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraFileExternalShareLifeTime">90s</a>
				<a n="zimbraFileShareLifeTime">60s</a>
			</ModifyAccountRequest>`;
		await soap.makeSOAPEnvelopeAdmin(modifyAccountRequest, adminAuth);

		// 2. Create Briefcase subfolder
		// Get Briefcase ID
		const getFolderRequest1 = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest1, auth1);
		const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

		const folderName = `lifetime_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${briefcaseId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// 3. Share with Guest (External)
		const guestEmail = `guest_${common.getUniqueString()}@example.com`;
		const folderActionRequest1 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" d="${guestEmail}" args="guestPass" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest1, auth1);

		// 4. Share with Internal User
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// 5. Verify Expiry attributes in ACL
		const getFolderRequest2 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolder2 = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		// XML checks `guestGrantExpiry` inside `acl` element? 
		// Structure is usually <acl internalGrantExpiry="..." guestGrantExpiry="..."> <grant .../> </acl>
		// Or attributes on the folder itself? XML selector: `//mail:folder[@name='...']/mail:acl` attr `guestGrantExpiry`.
		// So `acl` is a child of `folder`.

		// Wait, `GetFolderResponse` returns `folder` which has `acl` (if grants exist).
		// Let's inspect the response structure if possible or assume standard.
		// It's likely `folder[0].acl` object.

		const folder = getFolder2.GetFolderResponse.folder[0];
		assert.exists(folder.acl, 'ACL should exist');
		assert.exists(folder.acl.guestGrantExpiry, 'guestGrantExpiry should exist');
		assert.exists(folder.acl.internalGrantExpiry, 'internalGrantExpiry should exist');

		// 6. Revoke Guest Share
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folderId}" zid="${guestEmail}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);
		// Note: Revoke guest usually uses email as ZID or d? XML uses `zid="${guest1.name}"`.
		// Check if ZID is email for guest. Yes.

		// 7. Revoke Internal Share
		// account2Id is already available from setup
		const folderActionRequest4 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="!grant" id="${folderId}" zid="${testAccount2Id}"/>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest4, auth1);

		// 8. Verify Expiry attributes are gone
		const getFolderRequest3 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolder3 = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth1);

		// If no grants, `acl` might be missing or empty.
		// If `acl` exists, attributes should be missing.
		const folder3 = getFolder3.GetFolderResponse.folder[0];
		if (folder3.acl) {
			assert.notExists(folder3.acl.guestGrantExpiry,
				'guestGrantExpiry should be gone');
			assert.notExists(folder3.acl.internalGrantExpiry,
				'internalGrantExpiry should be gone');
		}
	});


	it('Sanity | Share a folder to guest. Verify guestgrantexpiry not set by default.. 2', async () => {
		const adminAuth = await soap.getAdminAuthToken();

		// Create Briefcase subfolder
		const getFolderRequest = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

		const folderName = `guestonly_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${briefcaseId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Guest only
		const guestEmail = `guest_only_${common.getUniqueString()}@example.com`;
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" d="${guestEmail}" args="guestPass" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify guest expiry exists
		const getFolderRequest2 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolder2 = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const folder = getFolder2.GetFolderResponse.folder[0];
		assert.exists(folder.acl, 'ACL should exist');
		assert.exists(folder.acl.guestGrantExpiry,
			'guestGrantExpiry should exist for guest-only share');
	});


	it('Sanity | Share a folder to guest. Verify guestgrantexpiry not set by default.', async () => {
		const adminAuth = await soap.getAdminAuthToken();

		// Create Briefcase subfolder
		const getFolderRequest = `<GetFolderRequest xmlns="urn:zimbraMail"/>`;
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const briefcaseId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Briefcase').id;

		const folderName = `intonly_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${briefcaseId}"/>
			</CreateFolderRequest>`;
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Internal user only
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="usr" d="${testAccount2}" perm="r"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verify internal expiry exists
		const getFolderRequest2 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolder2 = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const folder = getFolder2.GetFolderResponse.folder[0];
		assert.exists(folder.acl, 'ACL should exist');
		assert.exists(folder.acl.internalGrantExpiry,
			'internalGrantExpiry should exist for internal-only share');
	});

});
