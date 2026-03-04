import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Mailbox > Mailbox', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;

	before(async function () {
		await main.before(this);
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
	it('Sanity | Sanity test for GetMailboxRequest', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		// Get mailbox
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		assert.exists(mboxRes.GetMailboxResponse.mbox, 'Mbox should exist in response');
	});


	it('Smoke | Sanity test for PurgeMessagesRequest', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		// Auth as account and add a message
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);

		// Purge messages
		const purgeRes = await soap.makeSOAPEnvelopeAdmin(
			`<PurgeMessagesRequest xmlns="urn:zimbraAdmin" action="start">
				<mbox id="${accountId}"/>
			</PurgeMessagesRequest>`, adminAuthToken
		);
		assert.notExists(purgeRes.Fault, 'PurgeMessagesRequest should not fault');
	});


	it('Smoke | Sanity test for ReIndexRequest', async () => {
		// Create account and add a message
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);

		// ReIndex
		const reIndexRes = await soap.makeSOAPEnvelopeAdmin(
			`<ReIndexRequest xmlns="urn:zimbraAdmin" action="start">
				<mbox id="${accountId}"/>
			</ReIndexRequest>`, adminAuthToken
		);
		assert.notExists(reIndexRes.Fault, 'ReIndexRequest should not fault');
		assert.equal(reIndexRes.ReIndexResponse.status, 'started', 'Status should be started');
	});


	it('Smoke | Sanity test for RecalculateMailboxCountsRequest', async () => {
		// Create account and add a message
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);

		// Recalculate
		const recalcRes = await soap.makeSOAPEnvelopeAdmin(
			`<RecalculateMailboxCountsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</RecalculateMailboxCountsRequest>`, adminAuthToken
		);
		assert.notExists(recalcRes.Fault, 'RecalculateMailboxCountsRequest should not fault');
		assert.exists(recalcRes.RecalculateMailboxCountsResponse.mbox, 'Mbox should exist');
	});


	it('Smoke | Sanity test for DeleteMailboxRequest', async () => {
		// Create account and add a message
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);

		// Delete mailbox
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, adminAuthToken
		);
		assert.notExists(deleteRes.Fault, 'DeleteMailboxRequest should not fault');
		assert.exists(deleteRes.DeleteMailboxResponse.mbox, 'Mbox should exist in response');
	});


	it('Smoke | Sanity test for ExportAndDeleteItemsRequest', async () => {
		// Create account and add a message
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		const accountToken = await soap.getAccountAuthToken(accountEmail);
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);

		// Get mailbox ID (mbxid)
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		assert.notExists(mboxRes.Fault, 'GetMailboxRequest should not fault');
		const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
		const mbxId = mbox.mbxid;

		// Export and delete
		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${mbxId}"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken
		);
		assert.notExists(exportRes.Fault, 'ExportAndDeleteItemsRequest should not fault');
	});


	it('Smoke | Sanity test for GetAllMailboxesRequest', async () => {
		const allRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetAllMailboxesRequest xmlns="urn:zimbraAdmin" limit="5"/>`, adminAuthToken
		);
		assert.notExists(allRes.Fault, 'GetAllMailboxesRequest should not fault');
	});


	it('Smoke | Sanity test for GetMailboxStatsRequest', async () => {
		const statsRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxStatsRequest xmlns="urn:zimbraAdmin"/>`, adminAuthToken
		);
		assert.notExists(statsRes.Fault, 'GetMailboxStatsRequest should not fault');
	});
});
