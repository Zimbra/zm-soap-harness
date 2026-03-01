import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Briefcase > BackupRequest SharedBriefcase', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name, account3Name, account4Name;
	let account1Id, account3Id;
	const uid = common.getUniqueString();

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `account1.${uid}a@${config.testDomain}`;
		account2Name = `account2.${uid}b@${config.testDomain}`;
		account3Name = `account3.${uid}c@${config.testDomain}`;
		account4Name = `account4.${uid}d@${config.testDomain}`;

		// Create all accounts
		for (const name of [account1Name, account2Name, account3Name, account4Name]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (name === account1Name) account1Id = acct?.id;
			if (name === account3Name) account3Id = acct?.id;
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Backup (full) and restore an account with a briefcase folder sharing Verify the shared data is still viewable by grantee after restore', async () => {
		// Login as account1
		const acct1Auth = await soap.getAccountAuthToken(account1Name);

		// Get briefcase folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct1Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');

		// Upload file and save to briefcase
		const uploadAid = await soap.uploadFile(
			acct1Auth, `${config.data}/contact/contact1.txt`
		);
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase?.id}">
					<upload id="${uploadAid}"/>
				</doc>
			</SaveDocumentRequest>`, acct1Auth
		);
		assert.notExists(saveRes.Fault, 'SaveDocumentRequest should not fault');
		const doc = Array.isArray(saveRes.SaveDocumentResponse?.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse?.doc;
		const docId = doc?.id;

		// Grant read access to account2
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcase?.id}">
					<grant gt="usr" d="${account2Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct1Auth
		);

		// Verify account2 can access the shared item
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const getItemRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${account1Id}:${docId}"/>
			</GetItemRequest>`, acct2Auth
		);
		assert.notExists(getItemRes.Fault, 'GetItemRequest should not fault');

		// Backup account1 (full)
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Wait and delete account1
		await new Promise(r => setTimeout(r, 30000));
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore account1
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account1Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');
		await new Promise(r => setTimeout(r, 30000));

		// Verify account2 can still access shared item after restore
		const acct2Auth2 = await soap.getAccountAuthToken(account2Name);
		const getItemRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${account1Id}:${docId}"/>
			</GetItemRequest>`, acct2Auth2
		);
		assert.notExists(getItemRes2.Fault, 'GetItemRequest after restore should not fault');
	});


	it('Sanity | Backup (incremental) and restore an account with briefcase folders sharing Verify the shared data is still viewable by grantee after restore', async () => {
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

		// Get briefcase folder
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<GetFolderRequest xmlns="urn:zimbraMail"/>`, acct3Auth
		);
		const rootFolder = folderRes.GetFolderResponse?.folder;
		const folders = Array.isArray(rootFolder?.folder) ? rootFolder.folder : [rootFolder?.folder];
		const briefcase = folders.find(f => f?.name === 'Briefcase');

		// Upload file and save to briefcase
		const uploadAid = await soap.uploadFile(
			acct3Auth, `${config.data}/contact/contact1.txt`
		);
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="${briefcase?.id}">
					<upload id="${uploadAid}"/>
				</doc>
			</SaveDocumentRequest>`, acct3Auth
		);
		assert.notExists(saveRes.Fault, 'SaveDocumentRequest should not fault');
		const doc = Array.isArray(saveRes.SaveDocumentResponse?.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse?.doc;
		const docId = doc?.id;

		// Grant read access to account4
		await soap.makeSOAPEnvelopeAccount(
			`<FolderActionRequest xmlns="urn:zimbraMail">
				<action op="grant" id="${briefcase?.id}">
					<grant gt="usr" d="${account4Name}" perm="r"/>
				</action>
			</FolderActionRequest>`, acct3Auth
		);

		// Verify account4 can access
		const acct4Auth = await soap.getAccountAuthToken(account4Name);
		const getItemRes = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${account3Id}:${docId}"/>
			</GetItemRequest>`, acct4Auth
		);
		assert.notExists(getItemRes.Fault, 'GetItemRequest should not fault');

		// Incremental backup of account3
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account3Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');
		assert.exists(incrBackup.BackupResponse, 'Incremental BackupResponse should exist');

		// Wait, delete, and restore
		await new Promise(r => setTimeout(r, 30000));
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="1" method="ra" replayRedo="0">
					<account name="${account3Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');
		await new Promise(r => setTimeout(r, 30000));

		// Verify account4 can still access after restore
		const acct4Auth2 = await soap.getAccountAuthToken(account4Name);
		const getItemRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetItemRequest xmlns="urn:zimbraMail">
				<item id="${account3Id}:${docId}"/>
			</GetItemRequest>`, acct4Auth2
		);
		assert.notExists(getItemRes2.Fault, 'GetItemRequest after restore should not fault');
	});
});
