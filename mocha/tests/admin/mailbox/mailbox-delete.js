import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Mailbox > Mailbox Delete', function () {
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
	it('Sanity | Delete the mailbox of any account', async () => {
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
		const accountId = acct.id;

		// Auth as account and add message
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
		assert.exists(deleteRes.DeleteMailboxResponse, 'DeleteMailboxResponse should exist');
		assert.exists(deleteRes.DeleteMailboxResponse.mbox, 'Mbox should exist in response');
	});


	it('Regression | Delete the mailbox of deleted account', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Delete the account first
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
			</DeleteAccountRequest>`, adminAuthToken
		);

		// Try to delete mailbox of deleted account
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, adminAuthToken, false
		);
		// XML expects emptyset — deleted account's mailbox deletion returns empty
		assert.notExists(deleteRes.Fault, 'DeleteMailboxRequest for deleted account should not fault');
	});


	it('Regression | Delete the mailbox with invalid values for account-id (blankspacesspecial characters)', async () => {
		// Blank id
		const blankRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id=""/>
			</DeleteMailboxRequest>`, adminAuthToken, false
		);
		assert.notExists(blankRes.Fault, 'DeleteMailboxRequest with blank id should handle gracefully');

		// Spaces id
		const spaceRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="             "/>
			</DeleteMailboxRequest>`, adminAuthToken, false
		);
		assert.notExists(spaceRes.Fault, 'DeleteMailboxRequest with space id should handle gracefully');

		// Special character id
		const spcharRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id=":'&lt;//\\\\"/>
			</DeleteMailboxRequest>`, adminAuthToken, false
		);
		assert.notExists(spcharRes.Fault, 'DeleteMailboxRequest with special char id should handle gracefully');
	});


	it('Regression | Search for a mail after deleting the mailbox', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
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

		// Verify message exists
		const getMsg1 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1" html="1"/>
			</GetMsgRequest>`, accountToken
		);
		assert.notExists(getMsg1.Fault, 'GetMsgRequest before delete should not fault');

		// Delete mailbox
		await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, adminAuthToken
		);

		// Re-auth and try to get the message — should fail
		const accountToken2 = await soap.getAccountAuthToken(accountEmail);
		const getMsg2 = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${msgId}" read="1" html="1"/>
			</GetMsgRequest>`, accountToken2, false
		);
		assert.exists(getMsg2.Fault, 'GetMsgRequest after mailbox delete should fault');
		assert.include(getMsg2.Fault.Detail.Error.Code, 'mail.NO_SUCH_MSG');
	});


	it('Regression | Verify sending DeleteMailboxRequest with users authtoken', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Auth as user (not admin)
		const accountToken = await soap.getAccountAuthToken(accountEmail);

		// Try to delete mailbox with user token — should be denied
		const deleteRes = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, accountToken, false
		);
		assert.exists(deleteRes.Fault, 'DeleteMailboxRequest with user token should fault');
		assert.include(deleteRes.Fault.Detail.Error.Code, 'service.PERM_DENIED');
	});


	it('Regression | Verify deleting the deleted mailbox', async () => {
		// Create account
		const accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0] : createRes.CreateAccountResponse.account;
		const accountId = acct.id;

		// Delete mailbox first time
		const delete1 = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, adminAuthToken
		);
		assert.notExists(delete1.Fault, 'First DeleteMailboxRequest should not fault');
		assert.exists(delete1.DeleteMailboxResponse, 'DeleteMailboxResponse should exist');

		// Delete mailbox second time — should handle gracefully (emptyset)
		const delete2 = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteMailboxRequest xmlns="urn:zimbraAdmin">
				<mbox id="${accountId}"/>
			</DeleteMailboxRequest>`, adminAuthToken, false
		);
		assert.notExists(delete2.Fault, 'Second DeleteMailboxRequest should not fault');
	});
});
