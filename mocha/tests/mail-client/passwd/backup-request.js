import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Passwd > BackupRequest', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	let account2Name, account2Id;
	const uid = common.getUniqueString();
	const newPassword = `new${config.accountPassword}`;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `passwd.${uid}a@${config.testDomain}`;
		account2Name = `passwd.${uid}b@${config.testDomain}`;

		for (const acctName of [account1Name, account2Name]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (acctName === account1Name) account1Id = acct?.id;
			if (acctName === account2Name) account2Id = acct?.id;
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it.skip('Sanity | Backup (full) and restore account with changed password - verify new password is backed up and restored', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		// Change password
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${newPassword}</password>
			</ChangePasswordRequest>`, acctAuthToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');

		// Backup
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Delete + restore
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		const backupLabel = backupRes.BackupResponse?.backup?.label;
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="0" method="ra" replayRedo="0" label="${backupLabel}">
					<account name="${account1Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Verify old password fails
		const oldAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.exists(oldAuthRes.Fault, 'Old password should fail after restore');

		// Verify new password works
		const newAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${newPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(newAuthRes.Fault, 'New password should work after restore');
		assert.exists(newAuthRes.AuthResponse, 'AuthResponse should exist for new password');
	});


	it.skip('Sanity | Backup (incremental) and restore account with new password - verify new password restored', async () => {
		// Full backup first
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Change password
		const acctAuthToken = await soap.getAccountAuthToken(account2Name);
		const changeRes = await soap.makeSOAPEnvelopeAccount(
			`<ChangePasswordRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<oldPassword>${config.accountPassword}</oldPassword>
				<password>${newPassword}</password>
			</ChangePasswordRequest>`, acctAuthToken
		);
		assert.notExists(changeRes.Fault, 'ChangePasswordRequest should not fault');
		assert.exists(changeRes.ChangePasswordResponse, 'ChangePasswordResponse should exist');

		// Incremental backup + delete + restore
		const incrRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrRes.Fault, 'Incremental BackupRequest should not fault');
		assert.exists(incrRes.BackupResponse, 'Incremental BackupResponse should exist');

		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="1" method="ra" replayRedo="0">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Verify old password fails
		const oldAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.exists(oldAuthRes.Fault, 'Old password should fail');

		// Verify new password works
		const newAuthRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${newPassword}</password>
			</AuthRequest>`, null, false
		);
		assert.notExists(newAuthRes.Fault, 'New password should work after restore');
		assert.exists(newAuthRes.AuthResponse, 'AuthResponse should exist for new password');
	});
});
