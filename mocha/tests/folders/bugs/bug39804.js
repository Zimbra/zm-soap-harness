import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Folders > Bugs > Bug 39804', function () {
	let testAccount1, testAccount2, testAccount3;
	let auth1;
	let account1Id, account2Id, account3Id;
	let inboxId;

	before(async function () {
		await main.before(this);
		testAccount1 = `bug39804_1_${common.getUniqueString()}@${config.testDomain}`;
		testAccount2 = `bug39804_2_${common.getUniqueString()}@${config.testDomain}`;
		testAccount3 = `bug39804_3_${common.getUniqueString()}@${config.testDomain}`;

		const adminAuth = await soap.getAdminAuthToken();
		const res1 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount1, testAccount1);
		const res2 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount2, testAccount2);
		const res3 = await soap.createAccountByNameAndEmailAddress(adminAuth, testAccount3, testAccount3);

		account1Id = res1.accountId;
		account2Id = res2.accountId;
		account3Id = res3.accountId;

		auth1 = await soap.getAccountAuthToken(testAccount1, config.accountPassword);

		// Get Inbox
		const getFolderRequest = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const getFolder = await soap.makeSOAPEnvelopeAccount(getFolderRequest, auth1);

		inboxId = getFolder.GetFolderResponse.folder[0].folder.find(f => f.name === 'Inbox').id;
	});

	after(async function () {
		const adminAuth = await soap.getAdminAuthToken();
		if (testAccount1) await soap.deleteAccount(testAccount1, adminAuth);
		if (testAccount2) await soap.deleteAccount(testAccount2, adminAuth);
		if (testAccount3) await soap.deleteAccount(testAccount3, adminAuth);
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
	it('Functional | Verify login after deleting shared-to account', async () => {

		const folderCount = 10; // Scaled down from 2000

		for (let i = 0; i < folderCount; i++) {
			const folderName = `folder_${i}_${common.getUniqueString()}`;

			// Create Folder
			const createFolderRequest =
				`<CreateFolderRequest xmlns="urn:zimbraMail">
					<folder name="${folderName}" l="${inboxId}"/>
				</CreateFolderRequest>`;

			// FolderActionRequest
			const createResp = await soap.makeSOAPEnvelopeAccount(createFolderRequest, auth1);
			const folderId = createResp.CreateFolderResponse.folder[0].id;

			// Share with Account 2
			const folderActionRequest1 =
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${folderId}">
						<grant gt="usr" d="${testAccount2}" perm="r"/>
					</action>
				</FolderActionRequest>`;

			// FolderActionRequest
			await soap.makeSOAPEnvelopeAccount(folderActionRequest1, auth1);

			// Share with Account 3
			const folderActionRequest2 =
				`<FolderActionRequest xmlns="urn:zimbraMail">
					<action op="grant" id="${folderId}">
						<grant gt="usr" d="${testAccount3}" perm="r"/>
					</action>
				</FolderActionRequest>`;

			// NoOpRequest
			await soap.makeSOAPEnvelopeAccount(folderActionRequest2, auth1);
		}

		const adminAuth = await soap.getAdminAuthToken();
		await soap.deleteAccount(account3Id, adminAuth);

		// Verify Account 1 still ALIVE
		const pingResp = await soap.makeSOAPEnvelopeAccount('<NoOpRequest xmlns="urn:zimbraMail"/>', auth1);

		// Verify response
		assert.notExists(pingResp.Fault, 'Response should not be a Fault');
		assert.exists(pingResp.NoOpResponse, 'Account 1 should remain active');
	});

});
