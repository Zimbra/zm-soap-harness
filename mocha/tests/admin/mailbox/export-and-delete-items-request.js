import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Mailbox > Export And Delete Items Request', function () {
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

	// Helper to create account-add-message-get-mbxid
	async function setupAccountWithMessage() {
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		const accountId = acct.id;

		// Auth as account and add message
		const accountToken = await soap.getAccountAuthToken(accountEmail);
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
					<content>Subject: hello do it </content>
				</m>
			</AddMsgRequest>`, accountToken
		);
		const msgId = addRes.AddMsgResponse.m[0] ? addRes.AddMsgResponse.m[0].id : addRes.AddMsgResponse.m.id;

		// Get mailbox ID (mbxid)
		const mboxRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</GetMailboxRequest>`, adminAuthToken
		);
		const mbox = Array.isArray(mboxRes.GetMailboxResponse.mbox)
			? mboxRes.GetMailboxResponse.mbox[0] : mboxRes.GetMailboxResponse.mbox;
		const mbxId = mbox.mbxid;

		return { accountEmail, accountId, accountToken, msgId, mbxId };
	}

	// Tests
	it('Sanity | Send ExportAndDeleteItemsRequest with valid mbox id', async () => {
		const { mbxId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${mbxId}"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken
		);
		assert.notExists(exportRes.Fault, 'ExportAndDeleteItemsRequest should not fault');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with valid mbox id and item id', async () => {
		const { mbxId, msgId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${mbxId}"/>
				<item id="${msgId}"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken
		);
		assert.notExists(exportRes.Fault, 'ExportAndDeleteItemsRequest with item id should not fault');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with invalid item id', async () => {
		const { mbxId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${mbxId}"/>
				<item id="invalid.item"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken
		);
		assert.notExists(exportRes.Fault, 'ExportAndDeleteItemsRequest with invalid item should not fault');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with item id as alphabets - serviceINVALIDREQUEST', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="aaaaa"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with alphabetic mbox should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'service.FAILURE');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with invalid mbox id - mailNOSUCHMBOX', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="-111111111111111"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with invalid mbox should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_MBOX');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest leading space in mbox id - serviceINVALIDREQUEST', async () => {
		const { accountId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="                   ${accountId}"/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with leading space should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'service.FAILURE');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest trailing Spaces in mbox id - serviceINVALIDREQUEST', async () => {
		const { accountId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}              "/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with trailing space should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'service.FAILURE');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with space before and after mbox id - serviceFAILURE', async () => {
		const { accountId } = await setupAccountWithMessage();

		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id="             ${accountId}              "/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with spaces should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'service.FAILURE');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest with blank mbox id - serviceFAILURE', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
				<mbox id=" "/>
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest with blank mbox should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_MBOX');
	});


	it('Sanity | Send ExportAndDeleteItemsRequest without mbox id - serviceINVALIDREQUEST', async () => {
		const exportRes = await soap.makeSOAPEnvelopeAdmin(
			`<ExportAndDeleteItemsRequest xmlns="urn:zimbraAdmin">
			</ExportAndDeleteItemsRequest>`, adminAuthToken, false
		);
		assert.isString(exportRes.Fault.Detail.Error.Code, 'ExportAndDeleteItemsRequest without mbox should fault');
		assert.include(exportRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});
});
