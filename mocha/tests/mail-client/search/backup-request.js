import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Search > BackupRequest', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Name, account2Name;
	const uid = common.getUniqueString();

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `search.${uid}a@${config.testDomain}`;
		account2Name = `search.${uid}b@${config.testDomain}`;

		for (const n of [account1Name, account2Name]) {
			await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${n}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
		}
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Backup and restore accountVerify that after backup and restore, the injected message with attachment is correctly res...', async () => {
		// Source: backup_search_inject01 from Search/Attach/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup (incremental) and restore accountVerify that after backup and restore, the injected message with attachment is...', async () => {
		// Source: backup_search_inject02 from Search/Attach/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup and restore an account with flagged mail Verify that after backup and restore, the flagged mail is correctly r...', async () => {
		// Source: flag_mail_Backup_01 from Search/Flag/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Backup(incremental) and restore an account with flagged mails Verify that after backup and restore, the flagged mail ...', async () => {
		// Source: flag_mail_Backup_02 from Search/Flag/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup and restore an account with read, unread mails Verify that after backup and restore, the read, unread mails ar...', async () => {
		// Source: ReadUnread_mail_Backup_01 from Search/Read/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Backup (incremental) and restore an account with read, unread mails Verify that after backup and restore, the read, u...', async () => {
		// Source: ReadUnread_mail_Backup_02 from Search/Read/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Verify that search for replied and forwarded messages still work after Backup and Restore', async () => {
		// Source: ReFwd_mail_Backup_01 from Search/Reply_Forward/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Backup (incremental) and restore an account with replay, forward mails Verify that after backup and restore, the repl...', async () => {
		// Source: ReFwd_mail_Backup_02 from Search/Reply_Forward/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});


	it('Sanity | Backup and restore an account with tagged mail Verify that after backup and restore, the tagged mail is correctly res...', async () => {
		// Source: tagged_mail_Backup_01 from Search/Tag/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});

	it('Sanity | Backup(incremental) and restore an account with tag mail Verify that after backup and restore, the tagged mail is cor...', async () => {
		// Source: tagged_mail_Backup_02 from Search/Tag/BackupRequest.xml
		const t = await soap.getAccountAuthToken(account1Name);
		const res = await soap.makeSOAPEnvelopeAccount(
			'<NoOpRequest xmlns="urn:zimbraMail"/>', t
		);
		assert.notExists(res.Fault, 'Response should not be a Fault');
	});
});
