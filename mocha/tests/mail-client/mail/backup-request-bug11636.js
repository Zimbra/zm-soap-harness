import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Mail > BackupRequest bug11636', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	const uid = common.getUniqueString();
	const domainName = `domain${uid}.com`;
	let account1Name, account2Name, account3Name;
	let account4Name, account5Name, account6Name;
	let account2Id, account5Id;
	const msg01Subject = `message${uid}a`;
	const msg02Subject = `message${uid}b`;
	const messageContent = 'this mail is to check whether the message is read or unread';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `acct1${uid}a@${domainName}`;
		account2Name = `acct2${uid}a@${domainName}`;
		account3Name = `acct3${uid}a@${domainName}`;
		account4Name = `acct1${uid}b@${domainName}`;
		account5Name = `acct2${uid}b@${domainName}`;
		account6Name = `acct3${uid}b@${domainName}`;

		// Create domain
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		// Create accounts
		const accounts = [
			account1Name, account2Name, account3Name,
			account4Name, account5Name, account6Name
		];
		for (const name of accounts) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${name}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (name === account2Name) account2Id = acct?.id;
			if (name === account5Name) account5Id = acct?.id;
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
	it.skip('Sanity | Restore a message sent to multiple recipients 1', async () => {
		// Full backup account2
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		// Send message from account1 to account2 and account3
		const acct1Auth = await soap.getAccountAuthToken(account1Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<e t="t" a="${account3Name}"/>
					<su>${msg01Subject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Restore account2 - verify no errors
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore includeIncrementals="1" method="ra" replayRedo="0">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');
	});


	it.skip('Sanity | Restore a message sent to multiple recipients 2', async () => {
		// Full backup account5
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account5Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'Full BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'Full BackupResponse should exist');

		// Send message from account4 to account5 and account6
		const acct4Auth = await soap.getAccountAuthToken(account4Name);
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account5Name}"/>
					<e t="t" a="${account6Name}"/>
					<su>${msg02Subject}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct4Auth
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');

		// Incremental backup
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account5Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');
		assert.exists(incrBackup.BackupResponse, 'Incremental BackupResponse should exist');

		// Delete account5
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account5Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Restore account5
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account5Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');
		assert.exists(restoreRes.RestoreResponse, 'RestoreResponse should exist');

		// Verify message exists
		const acct5Auth = await soap.getAccountAuthToken(account5Name);
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="message">
				<query>subject:(${msg02Subject})</query>
			</SearchRequest>`, acct5Auth
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
	});
});
