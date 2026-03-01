import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Briefcase > BackupRequest MountedBriefcase', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name, account3Name;
	let account1Id, account2Id, account3Id;
	let briefcaseFolder1Id;
	const uid = common.getUniqueString();
	const sharedName2 = `share.${uid}a`;
	const sharedName3 = `share.${uid}b`;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `mp.${uid}a@${config.testDomain}`;
		account2Name = `mp.${uid}b@${config.testDomain}`;
		account3Name = `mp.${uid}c@${config.testDomain}`;

		// Create accounts
		for (const [name, setter] of [[account1Name, 'a1'], [account2Name, 'a2'], [account3Name, 'a3']]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (setter === 'a1') account1Id = acct?.id;
			if (setter === 'a2') account2Id = acct?.id;
			if (setter === 'a3') account3Id = acct?.id;
		}

		// Login as account1 and setup briefcase
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Get briefcase folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');
		const briefcaseId = briefcase?.id;

		// Create subfolder in briefcase
		const subRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="${briefcaseId}" name="folder${uid}"/>
			</CreateFolderRequest>`, acct1Auth
		);
		const sub = Array.isArray(subRes.CreateFolderResponse?.folder)
			? subRes.CreateFolderResponse.folder[0] : subRes.CreateFolderResponse?.folder;
		briefcaseFolder1Id = sub?.id;

		// Upload a file and save to briefcase
		const uploadAid = await soap.uploadFile(
			acct1Auth, `${config.data}/contact/contact1.txt`
		);
		await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcaseFolder1Id}">
					<upload id="${uploadAid}"/>
				</doc>
			</SaveDocumentRequest>`, acct1Auth
		);

		// Grant access to account2 (full rights)
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action id="${briefcaseId}" op="grant">
					<grant d="${account2Name}" gt="usr" perm="rwidax"/>
				</action>
			</FolderActionRequest>`, acct1Auth
		);

		// Grant read access to account3
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcaseId}">
					<grant gt="usr" d="${account3Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1Auth
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Backup (full) and restore an account with a Mount Point Verify the Mount Point is backed up and restored', async () => {
		// Login as account2
		const acct2Auth = await soap.getAccountAuthToken(account2Name);

		// Get briefcase folder for account2
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');

		// Create mountpoint to account1's briefcase folder
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${briefcase?.id}" name="${sharedName2}"
					zid="${account1Id}" rid="${briefcaseFolder1Id}" view="document"/>
			</CreateMountpointRequest>`, acct2Auth
		);
		assert.notExists(mpRes.Fault, 'CreateMountpointRequest should not fault');
		const link = Array.isArray(mpRes.CreateMountpointResponse?.link)
			? mpRes.CreateMountpointResponse.link[0] : mpRes.CreateMountpointResponse?.link;
		const sharedId = link?.id;

		// Verify mountpoint works - search documents
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:briefcase/${sharedName2}</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Backup account2 (full)
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Wait for backup
		await new Promise(r => setTimeout(r, 30000));

		// Delete account2
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore account2
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="0" method="ra" replayRedo="0">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Re-auth as account2
		const acct2AuthNew = await soap.getAccountAuthToken(account2Name);

		// Verify mountpoint still exists
		const folderRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct2AuthNew
		);
		assert.notExists(folderRes2.Fault, 'GetFolderRequest should not fault');
		assert.exists(folderRes2.GetFolderResponse, 'GetFolderResponse should exist');

		// Verify shared documents still accessible
		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:briefcase/${sharedName2}</query>
			</SearchRequest>`, acct2AuthNew
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest after restore should not fault');
	});


	it.skip('Sanity | Backup (incremental) and restore an account with a Mount Point Verify the mount point value is backed up and restored', async () => {
		// Full backup of account3 first
		const fullBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account3Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(fullBackup.Fault, 'Full BackupRequest should not fault');
		assert.exists(fullBackup.BackupResponse, 'Full BackupResponse should exist');

		// Login as account3
		const acct3Auth = await soap.getAccountAuthToken(account3Name);

		// Get briefcase folder for account3
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');

		// Create mountpoint to account1's briefcase
		const mpRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateMountpointRequest xmlns="urn:zimbraMail">
				<link l="${briefcase?.id}" name="${sharedName3}"
					zid="${account1Id}" rid="${briefcaseFolder1Id}" view="document"/>
			</CreateMountpointRequest>`, acct3Auth
		);
		assert.notExists(mpRes.Fault, 'CreateMountpointRequest should not fault');

		// Verify mountpoint works
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="document">
				<query>in:briefcase/${sharedName3}</query>
			</SearchRequest>`, acct3Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		// Incremental backup
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account3Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');
		assert.exists(incrBackup.BackupResponse, 'Incremental BackupResponse should exist');

		// Wait for backup
		await new Promise(r => setTimeout(r, 90000));

		// Delete account3
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore account3 with incrementals
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="1" method="ra" replayRedo="0">
					<account name="${account3Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');
	});
});
