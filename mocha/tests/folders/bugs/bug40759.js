import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Bugs > Bug 40759', function () {
	let adminAuthToken;
	const accounts = [];
	const dls = [];

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 4 test accounts
		for (let i = 0; i < 4; i++) {
			const name =
				`bug40759_acct${i}_${common.getUniqueString()}@${config.testDomain}`;
			const password = config.accountPassword;
			const createResp = await soap.createAccountByNameAndEmailAddress(adminAuthToken, name, name);
			const authToken = await soap.getAccountAuthToken(name, password);
			const accountId = createResp.accountId;
			accounts.push({ name, password, authToken, id: accountId });

		}
	});

	after(async function () {
		// Cleanup accounts
		if (accounts.length > 0) {
			for (const acct of accounts) {
				await soap.deleteAccount(acct.id, adminAuthToken);
			}
		}
		// Cleanup DLs
		if (dls.length > 0) {
			for (const dlId of dls) {
				// DeleteDistributionListRequest
				const deleteDl =
					`<DeleteDistributionListRequest xmlns="urn:zimbraAdmin">
						<id>${dlId}</id>
					</DeleteDistributionListRequest>`;
				await soap.makeSOAPEnvelopeAdmin(deleteDl, adminAuthToken);
			}
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Verify error does not occur - system failure - javalangClassCastException - LjavalangString 1', async () => {
		const listName = `dl_bug40759_1_${common.getUniqueString()}@${config.testDomain}`;

		// 1. Create DL
		const createDl =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${listName}</name>
			</CreateDistributionListRequest>`;
		const dlResp = await soap.makeSOAPEnvelopeAdmin(createDl, adminAuthToken);
		const dlId = dlResp.CreateDistributionListResponse.dl[0].id;

		dls.push(dlId);

		// 2. Add Account1 and Account2 to DL
		const addMember1 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${accounts[0].name}</dlm>
			</AddDistributionListMemberRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addMember1, adminAuthToken);

		const addMember2 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${accounts[1].name}</dlm>
			</AddDistributionListMemberRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addMember2, adminAuthToken);

		// 3. Login Account1 (A), create folder, share with DL
		const acct1 = accounts[0];
		const folderName = `folder_${common.getUniqueString()}`;

		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct1.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		const grantRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${listName}" gt="grp" perm="rwidax"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grantRequest, acct1.authToken);

		// 4. Admin: Add alias to DL
		const aliasName =
			`alias_bug40759_1_${common.getUniqueString()}@${config.testDomain}`;
		const addAlias =
			`<AddDistributionListAliasRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<alias>${aliasName}</alias>
			</AddDistributionListAliasRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addAlias, adminAuthToken);

		// 5. Login Account1 (A) - Verify GetFolderRequest works (no hang)
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		await soap.makeSOAPEnvelopeAccount(getFolder, acct1.authToken);

		// 6. Login Account2 (B), CreateMountpoint
		const acct2 = accounts[1];
		const mountName = `mount_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" view="message" rid="${folderId}" zid="${acct1.id}"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);
		assert.exists(mountResp.CreateMountpointResponse.link[0].id,
			'Mountpoint created successfully');
	});


	it('Sanity | Verify error does not occur - system failure - javalangClassCastException - LjavalangString 2', async () => {
		const listName = `dl_bug40759_2_${common.getUniqueString()}@${config.testDomain}`;

		// 1. Create DL
		const createDl =
			`<CreateDistributionListRequest xmlns="urn:zimbraAdmin">
				<name>${listName}</name>
			</CreateDistributionListRequest>`;
		const dlResp = await soap.makeSOAPEnvelopeAdmin(createDl, adminAuthToken);
		const dlId = dlResp.CreateDistributionListResponse.dl[0].id;

		dls.push(dlId);

		// 2. Add Account3 and Account4 to DL
		const addMember3 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${accounts[2].name}</dlm>
			</AddDistributionListMemberRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addMember3, adminAuthToken);

		const addMember4 =
			`<AddDistributionListMemberRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<dlm>${accounts[3].name}</dlm>
			</AddDistributionListMemberRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addMember4, adminAuthToken);

		// 3. Add Alias to DL BEFORE sharing? 
		// Steps in XML: 
		// 1) Create DL *add alias to it*.
		// 2) Assign members.
		// 3) Share folder with *DL alias*.

		const aliasName =
			`alias_bug40759_2_${common.getUniqueString()}@${config.testDomain}`;
		const addAlias =
			`<AddDistributionListAliasRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<alias>${aliasName}</alias>
			</AddDistributionListAliasRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addAlias, adminAuthToken);

		// 4. Login Account3 (C), create folder, share with DL ALIAS
		const acct3 = accounts[2];
		const folderName = `folder_${common.getUniqueString()}`;

		const createFolder =
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder name="${folderName}" l="1"/>
			</CreateFolderRequest>`;
		const folderResp = await soap.makeSOAPEnvelopeAccount(createFolder, acct3.authToken);
		const folderId = folderResp.CreateFolderResponse.folder[0].id;

		const grantRequest =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${folderId}" op="grant">
					<grant d="${aliasName}" gt="grp" perm="rwidax"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(grantRequest, acct3.authToken);

		// 5. Add another alias? XML Step 5: "Add an alias to the DL." (Wait, already did?)
		// XML does: Create DL, Add alias3. Create Account1,2.
		// Step 1 says: "Create a Zimbra distribution list (zimbraDistributionList) *add alias to it*."
		// ...
		// 5. Add an alias to the DL. -> <AddDistributionListAliasRequest ... alias6 ...>
		// My code implements adding alias BEFORE sharing as per Step 1 description?
		// Let's following XML flow:
		// XML 02 test:
		// Create accounts 3,4.
		// Create DL2, Add members 3,4. Add alias5.
		// Login 3. Create folder. Grant to alias5.
		// Admin: Add alias6.
		// Login 3. GetFolder.
		// Login 4. CreateMountpoint.

		const aliasName2 =
			`alias_bug40759_2b_${common.getUniqueString()}@${config.testDomain}`;
		const addAlias2 =
			`<AddDistributionListAliasRequest xmlns="urn:zimbraAdmin">
				<id>${dlId}</id>
				<alias>${aliasName2}</alias>
			</AddDistributionListAliasRequest>`;
		await soap.makeSOAPEnvelopeAdmin(addAlias2, adminAuthToken);

		// 6. Login Account3 (C) - Verify GetFolderRequest works
		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		await soap.makeSOAPEnvelopeAccount(getFolder, acct3.authToken);

		// 7. Login Account4 (D), CreateMountpoint
		const acct4 = accounts[3];
		const mountName = `mount_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" view="message" rid="${folderId}" zid="${acct3.id}"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct4.authToken);
		assert.exists(mountResp.CreateMountpointResponse.link[0].id,
			'Mountpoint created successfully');
	});

});
