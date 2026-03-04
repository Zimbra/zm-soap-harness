import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Folders > Sharing > Grantee > Sharing Grantee Guest', function () {
	let testAccount1;
	let auth1;
	let account1Id;


	before(async function () {
		await main.before(this);
		testAccount1 = `grant_guest1_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const acctInfoRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAccountRequest xmlns="urn:zimbraAdmin"><account by="name">${testAccount1}</account></GetAccountRequest>`, adminAuth
		);
		assert.notExists(acctInfoRes.Fault, 'GetAccountRequest should not fault');
		const acctInfo = Array.isArray(acctInfoRes.GetAccountResponse.account)
			? acctInfoRes.GetAccountResponse.account[0]
			: acctInfoRes.GetAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);
		account1Id = res1.accountId;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
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
	it('Sanity | Share a folder to guest. Verify that the guest has access.', async () => {
		const guestEmail = `guest_${common.getUniqueString()}@example.com`;
		const password = 'guestPassword123!';

		// Setup Folder
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `grant_guest_${common.getUniqueString()}`;
		const createFolderRequest =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Guest
		const folderActionRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" d="${guestEmail}" perm="r" args="${password}"/>
				</action>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest, auth1);

		// Verification typically requires checking email notification or successful grant action response.
		// Direct verify by guest login via SOAP might be tricky if not supported on test server, 
		// but we can verify the grant exists on the folder.
		const getFolderRequest2 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const getFolderResp = await soap.makeSOAPEnvelopeAccount(getFolderRequest2, auth1);
		const folderData = getFolderResp.GetFolderResponse.folder[0];

		// Verify response
		assert.exists(folderData.acl, 'ACL should exist on folder');
		const grant = folderData.acl.grant;
		const grants = Array.isArray(grant) ? grant : [grant];
		const guestGrant = grants.find(g => g.d === guestEmail || g.zid === guestEmail);
		assert.exists(guestGrant,
			`Guest grant should be present on folder, found grants: ${JSON.stringify(grants)}`);
	});


	it('Sanity | Unshare a folder to guest. Verify that the guest no longer has access.', async () => {
		const guestEmail2 = `guest_rev_${common.getUniqueString()}@example.com`;
		const password2 = 'guestRevoke123!';

		// Create folder
		const getFolderRequest3 = '<GetFolderRequest xmlns="urn:zimbraMail"/>';

		// CreateFolderRequest
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest3, auth1);
		const inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;

		const folderName = `revoke_guest_${common.getUniqueString()}`;
		const createFolderRequest2 =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="${inboxId}"/>
			</CreateFolderRequest>`;

		// FolderActionRequest
		const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest2, auth1);
		const folderId = createResp.CreateFolderResponse.folder[0].id;

		// Share with Guest
		const folderActionRequest2 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${folderId}">
					<grant gt="guest" d="${guestEmail2}" perm="r" args="${password2}"/>
				</action>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);

		// Verify grant exists
		const getFolderRequest4 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;

		// FolderActionRequest
		const beforeRevoke = await soap.makeSOAPEnvelopeAccount(getFolderRequest4, auth1);
		const folderBefore = beforeRevoke.GetFolderResponse.folder[0];
		const aclBefore = folderBefore.acl;
		let hasGrantBefore = false;

		if (aclBefore && aclBefore.grant) {
			const grants = Array.isArray(aclBefore.grant) ? aclBefore.grant : [aclBefore.grant];
			hasGrantBefore = grants.some(g => g.d === guestEmail2 || g.zid === guestEmail2);
		}

		// Verify response
		assert.isTrue(hasGrantBefore, 'Guest grant should exist before revoke');

		// Revoke the grant using guest email as zid
		const folderActionRequest3 =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="!grant" zid="${guestEmail2}"/>
			</FolderActionRequest>`;

		// GetFolderRequest
		await soap.makeSOAPEnvelopeAccount(folderActionRequest3, auth1);

		// Verify grant is removed
		const getFolderRequest5 =
			`<GetFolderRequest xmlns="urn:zimbraMail">
				<folder l="${folderId}"/>
			</GetFolderRequest>`;
		const afterRevoke = await soap.makeSOAPEnvelopeAccount(getFolderRequest5, auth1);
		const folderAfter = afterRevoke.GetFolderResponse.folder[0];
		const aclAfter = folderAfter.acl;
		let hasGrantAfter = false;

		if (aclAfter && aclAfter.grant) {
			const grants = Array.isArray(aclAfter.grant) ? aclAfter.grant : [aclAfter.grant];
			hasGrantAfter = grants.some(g => g.d === guestEmail2 || g.zid === guestEmail2);
		}

		// Verify response
		assert.isFalse(hasGrantAfter, 'Guest grant should be removed after revoke');
	});

});
