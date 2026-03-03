import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Purge Messages > Purge Messages', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Email;
	let account1Id;
	let account1MbxId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account1
		account1Email = `test1.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		account1Id = acct.id;

		// Get mailbox ID
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${account1Id}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
		account1MbxId = mbox.mbxid;
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
	it('Smoke | Send PurgeMessagesRequest for a particular account', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${account1Id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
		const mbox = Array.isArray(res.PurgeMessagesResponse.mbox)
			? res.PurgeMessagesResponse.mbox[0] : res.PurgeMessagesResponse.mbox;
		assert.equal(mbox.mbxid, account1MbxId, 'Returned mbxid should match');
	});


	it('Regression | PurgeMessagesRequest with leading space in account id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="       ${account1Id}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
	});


	it('Regression | PurgeMessagesRequest with trailing space at account id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${account1Id}       "/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'PurgeMessagesRequest should not fault');
	});


	it('Regression | PurgeMessagesRequest with blank account id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id=""/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for blank id');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | PurgeMessagesRequest with sometext in account id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="some text abcdss"/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for invalid id');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | PurgeMessagesRequest with special character in account id', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id=":'&lt;//\\"/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for special char id');
		assert.include(res.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | PurgeMessagesRequest with deleted account-id', async () => {
		// Create and delete an account
		const tempEmail = `test2.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const tempId = acct.id;

		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${tempId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteAccountRequest should not fault');

		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempId}"/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(purgeRes.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for deleted account');
		assert.include(purgeRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | PurgeMessagesRequest with no id attribute', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(res.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for missing id');
		assert.include(res.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | PurgeMessagesRequest with deleted account having emails', async () => {
		// Create account
		const tempEmail = `test3.${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const tempId = acct.id;

		// Inject a message via AddMsgRequest
		const tempToken = await soap.getAccountAuthToken(tempEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="2">
					<content>From: sender@example.com
To: ${tempEmail}
Subject: test injecting of a mail at desired time
MIME-Version: 1.0
Content-Type: text/plain

simple text string in the body</content>
				</m>
			</AddMsgRequest>`, tempToken
		);

		// Get mailbox ID
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
		const tempMbxId = mbox.mbxid;

		// Delete account
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${tempId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteAccountRequest should not fault');

		// Purge with mbxid of deleted account
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempMbxId}"/>
			</PurgeMessagesRequest>`, adminAuthToken, null, false
		);
		assert.isString(purgeRes.Fault.Detail.Error.Code, 'PurgeMessagesRequest should fault for deleted account');
		assert.include(purgeRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});
});
