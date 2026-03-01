import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Mail Client > Tags > BackupRequest', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account1Id;
	let account2Name, account2Id;
	const uid = common.getUniqueString();
	const tagName = `tag${uid}`;
	const tagColorValid = '4';
	const tagColorNew = '6';

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
		account1Name = `tag_backup.${uid}a@${config.testDomain}`;
		account2Name = `tag_backup.${uid}b@${config.testDomain}`;

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
	it.skip('Sanity | Backup (full) and restore account with tag - verify tag is restored', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account1Name);

		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="${tagColorValid}" />
			</CreateTagRequest>`, acctAuthToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		assert.exists(tagRes.CreateTagResponse, 'CreateTagResponse should exist');
		const tagId = tagRes.CreateTagResponse?.tag?.id;

		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account1Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

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

		const acctAuthToken2 = await soap.getAccountAuthToken(account1Name);
		const getTagRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', acctAuthToken2
		);
		assert.notExists(getTagRes.Fault, 'GetTagRequest should not fault');
		assert.exists(getTagRes.GetTagResponse, 'GetTagResponse should exist after restore');
	});


	it.skip('Sanity | Backup (incremental) and restore account with modified tag - verify tag color change restored', async () => {
		const acctAuthToken = await soap.getAccountAuthToken(account2Name);

		const tagRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateTagRequest xmlns="urn:zimbraMail">
				<tag name="${tagName}" color="${tagColorValid}" />
			</CreateTagRequest>`, acctAuthToken
		);
		assert.notExists(tagRes.Fault, 'CreateTagRequest should not fault');
		assert.exists(tagRes.CreateTagResponse, 'CreateTagResponse should exist');
		const tagId = tagRes.CreateTagResponse?.tag?.id;

		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');
		assert.exists(backupRes.BackupResponse, 'BackupResponse should exist');

		const acctAuthToken2 = await soap.getAccountAuthToken(account2Name);
		await soap.makeSOAPEnvelopeAccount(
			`<TagActionRequest xmlns="urn:zimbraMail">
				<action op="color" id="${tagId}" color="${tagColorNew}"/>
			</TagActionRequest>`, acctAuthToken2
		);

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

		const acctAuthToken3 = await soap.getAccountAuthToken(account2Name);
		const getTagRes = await soap.makeSOAPEnvelopeAccount(
			'<GetTagRequest xmlns="urn:zimbraMail"/>', acctAuthToken3
		);
		assert.notExists(getTagRes.Fault, 'GetTagRequest should not fault');
		assert.exists(getTagRes.GetTagResponse, 'GetTagResponse should exist after restore');
	});
});
