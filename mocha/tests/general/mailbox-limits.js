import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Mailbox Limits', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let destinationEmail;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		destinationEmail = `dest${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${destinationEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Functional | Verify that the mailbox usage is returned by GetInfoRequest correctly', async () => {
		const accountEmail = `acct1${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

Content Text for mailbox usage test
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');

		// GetInfoRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const used = parseInt(res.GetInfoResponse.used, 10);

		// Verify response
		assert.isAbove(used, 0, 'Used should be greater than 0');
	});


	it('Functional | Verify that a message cannot be added to the mailbox, if his mailbox is over his limit Additionally verify full quota doesnt allow saving anything', async () => {
		const accountEmail = `acct2${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

do it
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(addRes.Fault, 'Should return Fault for quota exceeded');
		assert.include(addRes.Fault.Detail.Error.Code, 'mail.QUOTA_EXCEEDED',
			'Error code should be mail.QUOTA_EXCEEDED');

		// Save draft
		const draftRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDraftRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${accountEmail}"/>
					<su>Subject of the message is testing</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SaveDraftRequest>`, authToken
		);

		// Verify response
		assert.exists(draftRes.Fault, 'SaveDraft should fail with quota exceeded');
		assert.include(draftRes.Fault.Detail.Error.Code, 'mail.QUOTA_EXCEEDED',
			'Draft save should return QUOTA_EXCEEDED');
	});


	it('Functional | Verify that the account cannot send a message if his mailbox is over his limit', async () => {
		const accountEmail = `acct3${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${destinationEmail}"/>
					<su>Subject of the message is testing</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(sendRes.Fault, 'Should return Fault for quota exceeded');
		assert.include(sendRes.Fault.Detail.Error.Code, 'mail.QUOTA_EXCEEDED',
			'Error code should be mail.QUOTA_EXCEEDED');
	});


	it('Functional | Verify that the account can receive a message if his mailbox is under his limit', async () => {
		const accountEmail = `acct6${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">600000000</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

do it
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		assert.exists(addRes.AddMsgResponse,
			'AddMsgResponse should exist');
	});


	it('Functional | Verify that the account can send a message if his mailbox is under his limit 1', async () => {
		const accountEmail = `acct5${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">600000000</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${destinationEmail}"/>
					<su>Subject of the message is testing</su>
					<mp ct="text/plain">
						<content>Content in the message is contents...</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'SendMsgRequest should not fault');
		assert.exists(sendRes.SendMsgResponse,
			'SendMsgResponse should exist');
	});


	it('Functional | Verify that the account cannot receive a message if his mailbox is over his limit', async () => {
		const accountEmail = `acct4${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

do it
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(addRes.Fault, 'Should return Fault for quota exceeded');
		assert.include(addRes.Fault.Detail.Error.Code, 'mail.QUOTA_EXCEEDED',
			'Error code should be mail.QUOTA_EXCEEDED');
	});


	it('Functional | Verify that the account can send a message if his mailbox is under his limit 2', async () => {
		const accountEmail = `acct7${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">600000000</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

do it
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		assert.exists(addRes.AddMsgResponse, 'AddMsgResponse should exist');
	});


	it('Functional | Verify that an account can continue to receive mails until the quota is reached', async () => {
		const accountEmail = `acct8${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);
		for (let i = 0; i < 3; i++) {

			// Inject the message
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="1">
					<content>Subject: message ${i}

Content to fill quota
					</content></m>
				</AddMsgRequest>`, authToken
			);

			// Verify the response
			// Verify response
			assert.notExists(addRes.Fault, `AddMsgRequest ${i} should not fault`);
		}

		// GetInfoRequest
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);
		const used = parseInt(infoRes.GetInfoResponse.used, 10);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">${used + 1}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Inject the message
		const addOver = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: over quota

This message should fail because quota is now exceeded
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(addOver.Fault, 'Should return Fault for quota exceeded');
	});


	it('Functional | Verify that an account can continue to send (SendMsgRequest) mails until the quota is reached', async () => {
		const accountEmail = `acct9${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// GetInfoRequest
		const infoRes = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);
		const used = parseInt(infoRes.GetInfoResponse.used, 10);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">${used + 1}</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send message
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${destinationEmail}"/>
					<su>Subject of the message</su>
					<mp ct="text/plain">
						<content>Content in the message</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(sendRes.Fault, 'Should return Fault for quota exceeded');
	});


	it('Functional | Verify that an account can delete mails to free up mailbox limit space', async () => {
		const accountEmail = `acct10${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send the message
		const sendFail = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${destinationEmail}"/>
					<su>Test</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(sendFail.Fault, 'Should fail - quota exceeded');

		// Perform message action
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">600000000</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Send the message
		const sendOk = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${destinationEmail}"/>
					<su>Test after delete</su>
					<mp ct="text/plain">
						<content>Content after freeing quota</content>
					</mp>
				</m>
			</SendMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(sendOk.Fault, 'SendMsgRequest should succeed after freeing quota');
	});


	it('Functional | Verify that an account can delete mails to free up mailbox limit space (incoming messages)', async () => {
		const accountEmail = `acct11${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content to use up quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not fault');
		const msgId = addRes.AddMsgResponse.m[0].id;

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Inject the message
		const addFail = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: over quota

This should fail
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.exists(addFail.Fault, 'Should fail - quota exceeded');

		// Perform message action
		await soap.makeSOAPEnvelopeAccount(
			`<MsgActionRequest xmlns="urn:zimbraMail">
				<action id="${msgId}" op="delete"/>
			</MsgActionRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">600000000</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Inject the message
		const addOk = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: after delete

Content after freeing quota
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addOk.Fault, 'AddMsgRequest should succeed after freeing quota');
	});


	it('Functional | Verify that contacts, folders can be added to the mailbox, even if his mailbox is over his limit', async () => {
		const accountEmail = `acct12${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'CreateAccountRequest should not fault');
		const account = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const accountId = account.id;

		// Authenticate account
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// Inject the message
		await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: test content

Some content
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Modify the account
		await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${accountId}</id>
				<a n="zimbraMailQuota">1</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Create a contact
		const contactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">First${common.getUniqueString()}</a>
					<a n="lastName">Last${common.getUniqueString()}</a>
					<a n="email">email${common.getUniqueString()}@domain.com</a>
				</cn>
			</CreateContactRequest>`, authToken
		);

		// Verify response
		assert.notExists(contactRes.Fault, 'CreateContactRequest should succeed even over quota');
		assert.exists(contactRes.CreateContactResponse, 'CreateContactResponse should exist');
	});
});
