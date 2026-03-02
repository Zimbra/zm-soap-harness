import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Mailbox > Mailbox Get', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let accountId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		accountId = acct.id;
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
	it('Sanity | GetMailboxRequest with valid account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		assert.exists(mboxRes.GetMailboxResponse, 'GetMailboxResponse should exist');
		assert.exists(mboxRes.GetMailboxResponse.mbox, 'Mbox should exist');
	});


	it('Regression | GetMailboxRequest with leading space in account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="       ${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest with leading space should not fault');
		assert.exists(mboxRes.GetMailboxResponse, 'GetMailboxResponse should exist');
		assert.exists(mboxRes.GetMailboxResponse.mbox, 'Mbox should exist');
	});


	it('Regression | GetMailboxRequest with trailing space in account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}       "/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest with trailing space should not fault');
		assert.exists(mboxRes.GetMailboxResponse, 'GetMailboxResponse should exist');
		assert.exists(mboxRes.GetMailboxResponse.mbox, 'Mbox should exist');
	});


	it('Regression | GetMailboxRequest with blank account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id=""/>
			</GetMailboxRequest>`, adminAuthToken, false
		);
		assert.exists(mboxRes.Fault, 'GetMailboxRequest with blank id should fault');
		assert.include(mboxRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | GetMailboxRequest with sometext at account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="some text that is not valid for mbx"/>
			</GetMailboxRequest>`, adminAuthToken, false
		);
		assert.exists(mboxRes.Fault, 'GetMailboxRequest with text id should fault');
		assert.include(mboxRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | GetMailboxRequest with special character at account id', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id=":'&lt;//\\\\"/>
			</GetMailboxRequest>`, adminAuthToken, false
		);
		assert.exists(mboxRes.Fault, 'GetMailboxRequest with special char id should fault');
		assert.include(mboxRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | GetMailboxRequest with deleted account-id', async () => {
		// Create and delete an account
		const tempEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const tempAcct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const tempId = tempAcct.id;

		// Delete the account
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${tempId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Try to get deleted account's mailbox
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempId}"/>
			</GetMailboxRequest>`, adminAuthToken, false
		);
		assert.exists(mboxRes.Fault, 'GetMailboxRequest for deleted account should fault');
		assert.include(mboxRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | GetMailboxRequest with no id attribute', async () => {
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox/>
			</GetMailboxRequest>`, adminAuthToken, false
		);
		assert.exists(mboxRes.Fault, 'GetMailboxRequest without id should fault');
		assert.include(mboxRes.Fault.Detail.Error.Code, 'account.NO_SUCH_ACCOUNT');
	});


	it('Regression | Get the deleted mailbox', async () => {
		// Create account
		const tempEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${tempEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const tempAcct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const tempId = tempAcct.id;

		// Login as account to create mailbox
		await soap.getAccountAuthToken(tempEmail);

		// Delete mailbox
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempId}"/>
			</DeleteMailboxRequest>`, adminAuthToken
		);

		// Get deleted mailbox — should recreate it
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${tempId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest after delete should not fault');
		assert.exists(mboxRes.GetMailboxResponse, 'GetMailboxResponse should exist');
		assert.exists(mboxRes.GetMailboxResponse.mbox, 'Mbox should exist');
	});


	it('Sanity | Verify GetAllMailboxesRequest works', async () => {
		const allRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllMailboxesRequest xmlns="urn:zimbraAdmin" limit="5"/>`, adminAuthToken
		);
		assert.notExists(allRes.Fault, 'GetAllMailboxesRequest should not fault');
		assert.exists(allRes.GetAllMailboxesResponse, 'GetAllMailboxesResponse should exist');
	});
});
