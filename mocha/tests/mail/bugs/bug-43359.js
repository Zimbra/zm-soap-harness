import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Mail > Bugs > Bug 43359', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;

	before(async function () {
		await main.before(this.ctx);
		adminAuthToken = await soap.getAdminAuthToken();
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

	async function waitForImportComplete(authToken, maxAttempts = 20) {
		for (let i = 0; i < maxAttempts; i++) {
			await new Promise(resolve => setTimeout(resolve, 5000));
			const statusRes = await soap.makeSOAPEnvelopeAccount(
				`<GetImportStatusRequest xmlns="urn:zimbraMail">
				</GetImportStatusRequest>`, authToken
			);
			if (statusRes.GetImportStatusResponse) {
				const imap = statusRes.GetImportStatusResponse.imap;
				const imapEntry = Array.isArray(imap) ? imap[0] : imap;
				if (imapEntry && (imapEntry.isRunning === false
					|| imapEntry.isRunning === '0'
					|| imapEntry.isRunning === 0)) {
					return true;
				}
			}
		}
		return false;
	}

	it('Sanity | ImportExternalLargeMail_01 - Verify external IMAP fetch for large emails works', async () => {
		const importAccountEmail = `import1.${common.getUniqueString()}@${testDomain}`;
		const targetAccountEmail = `target1.${common.getUniqueString()}@${testDomain}`;

		// Create the import source account and destination account
		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${importAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${targetAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		// Login to import source account and create a large-ish message
		const importAuthToken = await soap.getAccountAuthToken(importAccountEmail);
		const subject = `PDF_LARGE_ADMIN_GUIDE_${common.getUniqueString()}`;
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: ${importAccountEmail}
To: ${importAccountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
test sending a large PDF and then importing it as external acc.</content>
				</m>
			</AddMsgRequest>`, importAuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		// Login to target account
		const targetAuthToken = await soap.getAccountAuthToken(targetAccountEmail);

		// Create folder for IMAP pull
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail" requestId="0">
				<folder l="1" name="acct2" fie="1"/>
			</CreateFolderRequest>`, targetAuthToken
		);
		const folderId = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0].id
			: folderRes.CreateFolderResponse.folder.id;

		// Configure IMAP DataSource pointing to importAccountEmail
		const dsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail" requestId="0">
				<imap name="acct2" isEnabled="true"
				emailAddress="${importAccountEmail}"
				host="${config.serverHost}" port="993"
				username="${importAccountEmail}" password="${config.accountPassword}"
				l="${folderId}" connectionType="ssl" pollingInterval="0" leaveOnServer="true"
				fromAddress="${targetAccountEmail}"/>
			</CreateDataSourceRequest>`, targetAuthToken
		);
		assert.notExists(dsRes.Fault, 'CreateDataSourceRequest should not fault');
		const imapEntry = Array.isArray(dsRes.CreateDataSourceResponse.imap)
			? dsRes.CreateDataSourceResponse.imap[0]
			: dsRes.CreateDataSourceResponse.imap;
		const imapId = imapEntry.id;

		// Trigger ImportDataRequest
		await soap.makeSOAPEnvelopeAccount(
			`<ImportDataRequest xmlns="urn:zimbraMail">
				<imap id="${imapId}"/>
			</ImportDataRequest>`, targetAuthToken
		);

		// Wait for import to complete using polling
		await waitForImportComplete(targetAuthToken);

		// Search for imported message with retries (IMAP import indexing can be slow)
		let msgs = [];
		for (let retry = 0; retry < 5; retry++) {
			await new Promise(resolve => setTimeout(resolve, 5000));
			// Try folder-scoped search first, then broader
			const query = retry < 2 ? `in:"acct2/INBOX" subject:"${subject}"` : `subject:"${subject}"`;
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>${query}</query>
				</SearchRequest>`, targetAuthToken
			);
			msgs = searchRes.SearchResponse.m
				? (Array.isArray(searchRes.SearchResponse.m)
					? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
				: [];
			if (msgs.length > 0) break;
		}

		assert.exists(msgs[0], 'Imported message should exist in target account folder');
		const msgId = msgs[0].id;

		// Reply to the message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${importAccountEmail}"/>
					<e t="f" a="${targetAccountEmail}"/>
					<su>Re: ${subject}</su>
					<mp ct="text/plain">
						<content>Test reply.</content>
					</mp>
					<orig id="${msgId}"/>
				</m>
			</SendMsgRequest>`, targetAuthToken
		);
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse.m, 'SendMsgResponse should exist');
	});


	it('Sanity | ImportExternalLargeMail_02 - Verify IMAP fetch with attachments', async () => {
		const importAccountEmail = `import2.${common.getUniqueString()}@${testDomain}`;
		const targetAccountEmail = `target2.${common.getUniqueString()}@${testDomain}`;

		const createAcctRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${importAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes.Fault, 'CreateAccountRequest should not fault');
		const acctInfo = Array.isArray(createAcctRes.CreateAccountResponse.account)
			? createAcctRes.CreateAccountResponse.account[0]
			: createAcctRes.CreateAccountResponse.account;
		assert.exists(acctInfo.id, 'Account ID should exist');
		const host = acctInfo.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const createAcctRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${targetAccountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createAcctRes2.Fault, 'CreateAccountRequest should not fault');
		const acctInfo2 = Array.isArray(createAcctRes2.CreateAccountResponse.account)
			? createAcctRes2.CreateAccountResponse.account[0]
			: createAcctRes2.CreateAccountResponse.account;
		assert.exists(acctInfo2.id, 'Account ID should exist');
		const host2 = acctInfo2.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host2, 'zimbraMailHost should exist');

		const importAuthToken = await soap.getAccountAuthToken(importAccountEmail);
		const subject = `Subject_${common.getUniqueString()}`;

		// Use AddMsgRequest to simulate an email with attachment
		const addMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: ${importAccountEmail}
To: ${importAccountEmail}
Subject: ${subject}
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="BOUNDARY"
--BOUNDARY
Content-Type: text/plain; charset=utf-8
This is important. This will be read by the target account.
--BOUNDARY
Content-Type: application/pdf; name="dummy.pdf"
Content-Disposition: attachment; filename="dummy.pdf"
Content-Transfer-Encoding: base64
JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURl
Y29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJzFcoSi1NzUotS88qLVXyKkyp9kxJLUnVT81KB
KowVigB9zQ2NCmVuZHN0cmVhbQplbmRvYmoKICAgICAgICAgICAgICAgICAgICAg
--BOUNDARY--</content>
				</m>
			</AddMsgRequest>`, importAuthToken
		);
		assert.notExists(addMsgRes.Fault, 'AddMsgRequest should not fault');

		const targetAuthToken = await soap.getAccountAuthToken(targetAccountEmail);
		const folderRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateFolderRequest xmlns="urn:zimbraMail" requestId="0">
				<folder l="1" name="acct3" fie="1"/>
			</CreateFolderRequest>`, targetAuthToken
		);
		const folderId = Array.isArray(folderRes.CreateFolderResponse.folder)
			? folderRes.CreateFolderResponse.folder[0].id
			: folderRes.CreateFolderResponse.folder.id;

		const dsRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateDataSourceRequest xmlns="urn:zimbraMail" requestId="0">
				<imap name="acct3" isEnabled="true"
				emailAddress="${importAccountEmail}"
				host="${config.serverHost}" port="993"
				username="${importAccountEmail}" password="${config.accountPassword}"
				l="${folderId}" connectionType="ssl" pollingInterval="0" leaveOnServer="true"
				fromAddress="${targetAccountEmail}"/>
			</CreateDataSourceRequest>`, targetAuthToken
		);
		assert.notExists(dsRes.Fault, 'CreateDataSourceRequest should not fault');
		const imapEntry = Array.isArray(dsRes.CreateDataSourceResponse.imap)
			? dsRes.CreateDataSourceResponse.imap[0]
			: dsRes.CreateDataSourceResponse.imap;
		const imapId = imapEntry.id;

		await soap.makeSOAPEnvelopeAccount(
			`<ImportDataRequest xmlns="urn:zimbraMail">
				<imap id="${imapId}"/>
			</ImportDataRequest>`, targetAuthToken
		);

		// Wait for import to complete using polling
		await waitForImportComplete(targetAuthToken);

		// Search for imported message with retries (IMAP import indexing can be slow)
		let msgs = [];
		for (let retry = 0; retry < 5; retry++) {
			await new Promise(resolve => setTimeout(resolve, 5000));
			const query = retry < 2 ? `in:"acct3/INBOX" subject:"${subject}"` : `subject:"${subject}"`;
			const searchRes = await soap.makeSOAPEnvelopeAccount(
				`<SearchRequest xmlns="urn:zimbraMail" types="message">
					<query>${query}</query>
				</SearchRequest>`, targetAuthToken
			);
			msgs = searchRes.SearchResponse.m
				? (Array.isArray(searchRes.SearchResponse.m)
					? searchRes.SearchResponse.m : [searchRes.SearchResponse.m])
				: [];
			if (msgs.length > 0) break;
		}

		assert.exists(msgs[0], 'Imported message should exist in target account folder');
		const msgId = msgs[0].id;

		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1"/>
			</GetMsgRequest>`, targetAuthToken
		);
		assert.notExists(getRes.Fault, 'GetMsgRequest should not fault');
	});
});
