import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Filters > Backup Request', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	let account2Name, account2Id;
	const uid = common.getUniqueString();
	const filter1Name = `filterbackup.${uid}a`;
	const filter2Name = `filterbackup.${uid}b`;
	const subject1 = 'Subject 1';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `fil_backup.${uid}a@${config.testDomain}`;
		account2Name = `fil_backup.${uid}b@${config.testDomain}`;

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
	it.skip('Sanity | Backup (full) and restore account with filter rule - verify filter is restored', async () => {
		const acct1AuthToken = await soap.getAccountAuthToken(account1Name);

		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filter1Name}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject1}" />
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Junk" />
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, acct1AuthToken
		);
		assert.notExists(modRes.Fault, 'ModifyFilterRulesRequest should not fault');

		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');

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

		const acct1AuthToken2 = await soap.getAccountAuthToken(account1Name);
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFilterRulesRequest xmlns="urn:zimbraMail"/>', acct1AuthToken2
		);
		assert.notExists(filterRes.Fault, 'GetFilterRulesRequest should not fault');
	});


	it.skip('Sanity | Backup (incremental) and restore account with modified filter rule - verify renamed filter restored', async () => {
		const acct2AuthToken = await soap.getAccountAuthToken(account2Name);

		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filter1Name}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject1}" />
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Junk" />
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, acct2AuthToken
		);

		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');

		const acct2AuthToken2 = await soap.getAccountAuthToken(account2Name);
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyFilterRulesRequest xmlns="urn:zimbraMail">
				<filterRules>
					<filterRule name="${filter2Name}" active="1">
						<filterTests condition="anyof">
							<headerTest header="subject" stringComparison="is" value="${subject1}" />
						</filterTests>
						<filterActions>
							<actionFileInto folderPath="/Junk" />
						</filterActions>
					</filterRule>
				</filterRules>
			</ModifyFilterRulesRequest>`, acct2AuthToken2
		);

		const incrBackupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackupRes.Fault, 'Incremental BackupRequest should not fault');

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

		const acct2AuthToken3 = await soap.getAccountAuthToken(account2Name);
		const filterRes = await soap.makeSOAPEnvelopeAccount(
			'<GetFilterRulesRequest xmlns="urn:zimbraMail"/>', acct2AuthToken3
		);
		assert.notExists(filterRes.Fault, 'GetFilterRulesRequest should not fault');
	});
});
