import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail Client > Conversation > Backup Request', function () {
	this.timeout(300 * 1000);
	let adminAuthToken;
	let account1Name, account2Name, account3Name, account4Name;
	let account2Id, account4Id;
	const uid = common.getUniqueString();
	const msgSubject1 = 'message1';
	const msgSubject2 = 'message1';
	const messageContent = 'this mail is to check whether the message is read or unread';

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		const domainName = `domain${uid}.com`;

		await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);

		account1Name = `acct1${uid}a@${domainName}`;
		account2Name = `acct2${uid}b@${domainName}`;
		account3Name = `acct3${uid}c@${domainName}`;
		account4Name = `acct4${uid}d@${domainName}`;

		for (const acctName of [account1Name, account2Name, account3Name, account4Name]) {
			const res = await soap.makeSOAPEnvelopeAdmin(
				`<CreateAccountRequest xmlns="urn:zimbraAdmin">
					<name>${acctName}</name>
					<password>${config.accountPassword}</password>
				</CreateAccountRequest>`, adminAuthToken
			);
			const acct = Array.isArray(res.CreateAccountResponse?.account)
				? res.CreateAccountResponse.account[0] : res.CreateAccountResponse?.account;
			if (acctName === account2Name) account2Id = acct?.id;
			if (acctName === account4Name) account4Id = acct?.id;
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
	it.skip('Sanity | Backup and restore account with conversations - verify conversation restored with 3 messages', async () => {
		// Source: conv_backup_01 from Conversation/BackupRequest.xml
		// Step 1: Login as account1 and send 3 messages to account2
		const acct1AuthToken = await soap.getAccountAuthToken(account1Name);

		const send1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>${msgSubject1}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(send1.Fault, 'SendMsgRequest 1 should not fault');

		await new Promise(r => setTimeout(r, 5000));

		const send2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>Re:${msgSubject1}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(send2.Fault, 'SendMsgRequest 2 should not fault');

		const send3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>Fwd:${msgSubject1}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct1AuthToken
		);
		assert.notExists(send3.Fault, 'SendMsgRequest 3 should not fault');

		// Step 2: Login as account2 and verify conversation exists with 3 messages
		const acct2AuthToken = await soap.getAccountAuthToken(account2Name);
		await new Promise(r => setTimeout(r, 5000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${msgSubject1})</query>
			</SearchRequest>`, acct2AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		const conv = searchRes.SearchResponse?.c;
		const convItem = Array.isArray(conv) ? conv[0] : conv;
		assert.exists(convItem, 'Conversation should exist');
		const convId = convItem.id;

		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convId}"/>
			</GetConvRequest>`, acct2AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const convData = getConvRes.GetConvResponse?.c;
		const convObj = Array.isArray(convData) ? convData[0] : convData;
		assert.equal(String(convObj?.n), '3', 'Conversation should have 3 messages');

		// Step 3: Backup account2 (full)
		const backupRes = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account2Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(backupRes.Fault, 'BackupRequest should not fault');

		// Step 4: Delete account2
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Step 5: Restore account2
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account2Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');

		// Step 6: Re-auth and verify conversation still exists with 3 messages
		const acct2AuthToken2 = await soap.getAccountAuthToken(account2Name);

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${msgSubject1})</query>
			</SearchRequest>`, acct2AuthToken2
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest after restore should not fault');

		const conv2 = searchRes2.SearchResponse?.c;
		const convItem2 = Array.isArray(conv2) ? conv2[0] : conv2;
		assert.exists(convItem2, 'Conversation should exist after restore');

		const getConvRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convItem2.id}"/>
			</GetConvRequest>`, acct2AuthToken2
		);
		assert.notExists(getConvRes2.Fault, 'GetConvRequest after restore should not fault');
		const convObj2 = Array.isArray(getConvRes2.GetConvResponse?.c)
			? getConvRes2.GetConvResponse.c[0] : getConvRes2.GetConvResponse?.c;
		assert.equal(String(convObj2?.n), '3', 'Conversation should still have 3 messages after restore');
	});


	it.skip('Sanity | Backup (incremental) and restore account with conversations - verify conversation still intact', async () => {
		// Source: conv_backup_02 from Conversation/BackupRequest.xml
		// Step 1: Login as account3 and send 1 message to account4
		const acct3AuthToken = await soap.getAccountAuthToken(account3Name);

		const send1 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Name}"/>
					<su>${msgSubject2}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct3AuthToken
		);
		assert.notExists(send1.Fault, 'SendMsgRequest should not fault');

		// Step 2: Full backup of account4
		const fullBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="full" sync="1">
					<account name="${account4Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(fullBackup.Fault, 'Full BackupRequest should not fault');

		// Step 3: Send 2 more messages to account4
		const send2 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Name}"/>
					<su>Re:${msgSubject2}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct3AuthToken
		);
		assert.notExists(send2.Fault, 'SendMsgRequest 2 should not fault');

		const send3 = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account4Name}"/>
					<su>Fwd:${msgSubject2}</su>
					<mp ct="text/plain">
						<content>${messageContent}</content>
					</mp>
				</m>
			</SendMsgRequest>`, acct3AuthToken
		);
		assert.notExists(send3.Fault, 'SendMsgRequest 3 should not fault');

		// Step 4: Verify conversation exists in account4 before incremental backup
		const acct4AuthToken = await soap.getAccountAuthToken(account4Name);
		await new Promise(r => setTimeout(r, 5000));

		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${msgSubject2})</query>
			</SearchRequest>`, acct4AuthToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');

		const conv = searchRes.SearchResponse?.c;
		const convItem = Array.isArray(conv) ? conv[0] : conv;
		assert.exists(convItem, 'Conversation should exist');

		const getConvRes = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convItem.id}"/>
			</GetConvRequest>`, acct4AuthToken
		);
		assert.notExists(getConvRes.Fault, 'GetConvRequest should not fault');
		const convObj = Array.isArray(getConvRes.GetConvResponse?.c)
			? getConvRes.GetConvResponse.c[0] : getConvRes.GetConvResponse?.c;
		assert.equal(String(convObj?.n), '3', 'Conversation should have 3 messages');

		// Step 5: Incremental backup of account4
		const incrBackup = await soap.makeSOAPEnvelopeAdmin(
			`<BackupRequest xmlns="urn:zimbraAdmin">
				<backup method="incremental" sync="1">
					<account name="${account4Name}"/>
				</backup>
			</BackupRequest>`, adminAuthToken
		);
		assert.notExists(incrBackup.Fault, 'Incremental BackupRequest should not fault');

		// Step 6: Delete account4
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Step 7: Restore account4 with incrementals
		const restoreRes = await soap.makeSOAPEnvelopeAdmin(
			`<RestoreRequest xmlns="urn:zimbraAdmin">
				<restore method="ra" includeIncrementals="1">
					<account name="${account4Name}"/>
				</restore>
			</RestoreRequest>`, adminAuthToken
		);
		assert.notExists(restoreRes.Fault, 'RestoreRequest should not fault');

		// Step 8: Re-auth and verify conversation still exists with 3 messages
		const acct4AuthToken2 = await soap.getAccountAuthToken(account4Name);

		const searchRes2 = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" groupBy="conversation">
				<query>subject:(${msgSubject2})</query>
			</SearchRequest>`, acct4AuthToken2
		);
		assert.notExists(searchRes2.Fault, 'SearchRequest after restore should not fault');

		const conv2 = searchRes2.SearchResponse?.c;
		const convItem2 = Array.isArray(conv2) ? conv2[0] : conv2;
		assert.exists(convItem2, 'Conversation should exist after restore');

		const getConvRes2 = await soap.makeSOAPEnvelopeAccount(
			`<GetConvRequest xmlns="urn:zimbraMail">
				<c id="${convItem2.id}"/>
			</GetConvRequest>`, acct4AuthToken2
		);
		assert.notExists(getConvRes2.Fault, 'GetConvRequest after restore should not fault');
		const convObj2 = Array.isArray(getConvRes2.GetConvResponse?.c)
			? getConvRes2.GetConvResponse.c[0] : getConvRes2.GetConvResponse?.c;
		assert.equal(String(convObj2?.n), '3', 'Conversation should still have 3 messages after restore');
	});
});
