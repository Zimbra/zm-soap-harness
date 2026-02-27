import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Folders > Bugs > Bug 66715', function () {
	let adminAuthToken;
	const accounts = [];

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();

		// Create 3 test accounts
		for (let i = 0; i < 3; i++) {
			const name =
				`bug66715_acct${i}_${common.getUniqueString()}@${config.testDomain}`;
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
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Retention property does not get observed for folders when shared with manager or admin rights 1', async () => {
		const acct1 = accounts[0]; // Owner
		const acct2 = accounts[1]; // Sharee

		// 1. Login user1. Get Inbox ID.
		let getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		let folderResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct1.authToken);

		// Find inbox
		const findFolder = (folders, name) => {
			if (!folders) return null;
			if (Array.isArray(folders)) {
				for (let f of folders) {
					if (f.name === name) return f;
					const found = findFolder(f.folder, name);
					if (found) return found;
				}
			} else {
				if (folders.name === name) return folders;
				return findFolder(folders.folder, name);
			}
			return null;
		};
		// Use 'Inbox' name? It should be standard.
		// XML uses ${globals.inbox}, usually 'Inbox'.
		const inbox = findFolder(folderResp.GetFolderResponse.folder, 'Inbox');
		assert.exists(inbox, 'Inbox found');
		const inboxId = inbox.id;

		// 2. Set retention policy on Inbox
		const setPolicy =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="retentionpolicy" id="${inboxId}">
					<retentionPolicy>
						<keep>
							<policy type="user" lifetime="31d"/>
						</keep>
						<purge/>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(setPolicy, acct1.authToken);

		// 3. Share with user2 (manager rights)
		const share =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${acct2.name}" perm="rwidax"/>
				</action>
			</FolderActionRequest>`;
		// Note: XML uses ${rights.manager} which is "rwidx". "rwidax" is "administer" access? 
		// XML prop: rights.manager = r w i d x
		// My perm above is rwidax (admin).
		// Let's match XML logic. 'rwidax' includes 'a' (admin).
		// XML test 1 uses rights.manager. XML test 2 uses rights.admin.
		// Let's use 'rwidx' here.
		const shareManager =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${acct2.name}" perm="rwidx"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(shareManager, acct1.authToken);

		// 4. Login user2. Create mountpoint.
		const mountName = `mount_66715_1_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct1.id}" rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct2.authToken);

		// 5. Verify retentionPolicy in response
		const link = mountResp.CreateMountpointResponse.link[0];
		assert.exists(link.retentionPolicy, 'Retention Policy should be returned');

		const policyObj = Array.isArray(link.retentionPolicy) ? link.retentionPolicy[0] : link.retentionPolicy;
		assert.exists(policyObj.keep, 'Keep policy should exist');

		const policies = Array.isArray(policyObj.keep[0].policy)
			? policyObj.keep[0].policy
			: [policyObj.keep[0].policy];

		const found = policies.some(p => p.lifetime === '31d');
		assert.isTrue(found, 'Policy lifetime 31d should be found');
	});


	it('Sanity | Retention property does not get observed for folders when shared with manager or admin rights 2', async () => {
		const acct1 = accounts[0]; // Owner (reusing, policy already set on Inbox)
		const acct3 = accounts[2]; // Sharee

		const getFolder = '<GetFolderRequest xmlns="urn:zimbraMail"/>';
		const folderResp = await soap.makeSOAPEnvelopeAccount(getFolder, acct1.authToken);
		// Find inbox explicitly again or reuse id
		// Better to be robust
		const findFolder = (folders, name) => {
			if (!folders) return null;
			if (Array.isArray(folders)) {
				for (let f of folders) {
					if (f.name === name) return f;
					const found = findFolder(f.folder, name);
					if (found) return found;
				}
			} else {
				if (folders.name === name) return folders;
				return findFolder(folders.folder, name);
			}
			return null;
		};
		const inbox = findFolder(folderResp.GetFolderResponse.folder, 'Inbox');
		const inboxId = inbox.id;

		// Policy already set in previous test, but we can set it again or assume it persists.
		// Let's set it again to be safe and independent.
		const setPolicy =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="retentionpolicy" id="${inboxId}">
					<retentionPolicy>
						<keep>
							<policy type="user" lifetime="31d"/>
						</keep>
						<purge/>
					</retentionPolicy>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(setPolicy, acct1.authToken);

		// 3. Share with user3 (admin rights)
		// rights.admin = "rwidxa"
		const shareAdmin =
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${inboxId}">
					<grant gt="usr" d="${acct3.name}" perm="rwidxa"/>
				</action>
			</FolderActionRequest>`;
		await soap.makeSOAPEnvelopeAccount(shareAdmin, acct1.authToken);

		// 4. Login user3. Create mountpoint.
		const mountName = `mount_66715_2_${common.getUniqueString()}`;
		const createMount =
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="1" name="${mountName}" zid="${acct1.id}" rid="${inboxId}" view="message"/>
			</CreateMountpointRequest>`;
		const mountResp = await soap.makeSOAPEnvelopeAccount(createMount, acct3.authToken);

		// 5. Verify retentionPolicy in response
		const link = mountResp.CreateMountpointResponse.link[0];
		assert.exists(link.retentionPolicy, 'Retention Policy should be returned');

		const policyObj = Array.isArray(link.retentionPolicy) ? link.retentionPolicy[0] : link.retentionPolicy;
		assert.exists(policyObj.keep, 'Keep policy should exist');

		const policies = Array.isArray(policyObj.keep[0].policy)
			? policyObj.keep[0].policy
			: [policyObj.keep[0].policy];

		const found = policies.some(p => p.lifetime === '31d');
		assert.isTrue(found, 'Policy lifetime 31d should be found');
	});

});
