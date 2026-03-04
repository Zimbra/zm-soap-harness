import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mail > Backup Request', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name, account3Name;
	let account2Id, account3Id;
	const uid = common.getUniqueString();
	const msg01Subject = `message${uid}a`;
	const msg02Subject = `message${uid}b`;
	const messageContent = 'this mail is to check whether the message is read or unread';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const domainName = `domain${uid}.com`;
		account1Name = `acct1${uid}@${domainName}`;
		account2Name = `acct2${uid}@${domainName}`;
		account3Name = `acct3${uid}@${domainName}`;

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts
		for (const name of [account1Name, account2Name, account3Name]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (acct && acct.a) {
				const host = acct.a.find(a => a.n === 'zimbraMailHost');
				assert.exists(host, 'zimbraMailHost should exist');
			}
			if (name === account2Name) account2Id = acct?.id;
			if (name === account3Name) account3Id = acct?.id;
		}
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
	it.skip('Sanity | Backup and restore an account with a simple message Verify that after backup and restore, the message remains', async () => {
		// Login as account1 and send mail to account2
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>${msg01Subject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Backup account2 (full)
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');

		// Delete account2
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore account2
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');

		// Re-auth and verify message exists
		const acct2Auth = await soap.getAccountAuthToken(account2Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="message">
				<query>subject:(${msg01Subject})</query>
			</SearchRequest>`, acct2Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});


	it.skip('Sanity | Backup (incremental) and restore an account with a message Verify that after backup and restore, the message remains', async () => {
		// Login to account3
		const acct3Auth = await soap.getAccountAuthToken(account3Name);

		// Full backup of account3 first
		const fullBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account3Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(fullBackup.Fault, 'Full BackupRequest should not fault');

		// Send mail to account3
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account3Name}"/>
					<su>${msg02Subject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Incremental backup
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account3Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');

		// Delete account3
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore with incrementals
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account3Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');

		// Re-auth and verify message exists
		const acct3AuthNew = await soap.getAccountAuthToken(account3Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="message">
				<query>subject:(${msg02Subject})</query>
			</SearchRequest>`, acct3AuthNew
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
	});
});
