import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Folders > BackupRequest', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	let account2Name, account2Id;
	const uid = common.getUniqueString();
	const folderName = `folder${uid}`;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `folder_backup.${uid}a@${config.testDomain}`;
		account2Name = `folder_backup.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			const r = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const a = Array.isArray(r.CreateAccountResponse?.account) ? r.CreateAccountResponse.account[0] : r.CreateAccountResponse?.account;
			if (n === account1Name) account1Id = a?.id;
			if (n === account2Name) account2Id = a?.id;
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Backup (full) and restore account with custom folder - verify folder restored', async () => {
		const t = await soap.getAccountAuthToken(account1Name);

		const fr = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}"/>
			</CreateFolderRequest>`, t
		);
		assert.exists(fr.CreateFolderResponse, 'CreateFolderResponse should exist');

		const br = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(br.Fault, 'BackupRequest should not fault');
		assert.exists(br.BackupResponse, 'BackupResponse should exist');

		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		const label = br.BackupResponse?.backup?.label;
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="0" method="ra" replayRedo="0" label="${label}">
					<account name="${account1Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		const t2 = await soap.getAccountAuthToken(account1Name);
		const gfr = await soap.makeSOAPEnvelopeAccount(
			'<GetFolderRequest xmlns="urn:zimbraMail"/>', t2
		);
		assert.notExists(gfr.Fault, 'GetFolderRequest should not fault');
		assert.exists(gfr.GetFolderResponse, 'GetFolderResponse should exist after restore');
	});


	it.skip('Sanity | Backup and restore account with folder sharing and mountpoints', async () => {
		const t = await soap.getAccountAuthToken(account2Name);

		await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail">
				<folder l="1" name="${folderName}share"/>
			</CreateFolderRequest>`, t
		);

		const br = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(br.Fault, 'BackupRequest should not fault');
		assert.exists(br.BackupResponse, 'BackupResponse should exist');
	});


	it('Sanity | Verify that after backup and restore an account with a sub folder in Inbox, folder is restored', async () => {
		// Source: folder_Backup_01 from Folders/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Backup (incremental) and restore an account with a sub folder in inbox Verify that after backup and restore the folde...', async () => {
		// Source: folder_Backup_02 from Folders/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup (full) and restore an account with a Mount Point Verify the Mount Point is backed up and restored', async () => {
		// Source: Mountpoint_AccountBackup_01 from Folders/Mountpoints/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup (incremental) and restore an account with a Mount Point Verify the mount point value is backed up and restored', async () => {
		// Source: Mountpoint_AccountBackup_02 from Folders/Mountpoints/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup (full) and restore an account with sharing Verify the shared data is still viewable by grantee after restore', async () => {
		// Source: Sharing_AccountBackup_01 from Folders/Sharing/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup (incremental) and restore an account with sharing Verify the shared data is still viewable by grantee after re...', async () => {
		// Source: Sharing_AccountBackup_02 from Folders/Sharing/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
