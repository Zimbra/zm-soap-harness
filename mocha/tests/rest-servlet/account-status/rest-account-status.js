import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import rest from '../../../framework/backend/rest-servlet.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Account Status', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	let account1Email, account1Token, account1Id;
	let account2Email, account2Token, account2Id;
	let account3Email, account3Token, account3Id;
	let account4Email, account4Token, account4Id;
	let account1MsgId, account2MsgId, account3MsgId, account4MsgId;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create1Res.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(create1Res.CreateAccountResponse.account)
			? create1Res.CreateAccountResponse.account[0]
			: create1Res.CreateAccountResponse.account;
		account1Id = acct1.id;

		// Create account2
		account2Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create2Res.Fault, 'Response should not be a Fault');
		const acct2 = Array.isArray(create2Res.CreateAccountResponse.account)
			? create2Res.CreateAccountResponse.account[0]
			: create2Res.CreateAccountResponse.account;
		account2Id = acct2.id;

		// Create account3
		account3Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create3Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account3Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create3Res.Fault, 'Response should not be a Fault');
		const acct3 = Array.isArray(create3Res.CreateAccountResponse.account)
			? create3Res.CreateAccountResponse.account[0]
			: create3Res.CreateAccountResponse.account;
		account3Id = acct3.id;

		// Create account4
		account4Email = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const create4Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account4Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(create4Res.Fault, 'Response should not be a Fault');
		const acct4 = Array.isArray(create4Res.CreateAccountResponse.account)
			? create4Res.CreateAccountResponse.account[0]
			: create4Res.CreateAccountResponse.account;
		account4Id = acct4.id;

		// Get auth tokens for all accounts
		account1Token = await soap.getAccountAuthToken(account1Email);
		account2Token = await soap.getAccountAuthToken(account2Email);
		account3Token = await soap.getAccountAuthToken(account3Email);
		account4Token = await soap.getAccountAuthToken(account4Email);

		// Get inbox folder IDs and add messages for each account
		const addMsg = async (token) => {

			// GetFolderRequest
			const folderRes = await soap.makeSOAPEnvelopeAccount(
				'<GetFolderRequest xmlns="urn:zimbraMail"/>', token
			);

			// Verify response
			assert.notExists(folderRes.Fault, 'Response should not be a Fault');
			const folder = folderRes.GetFolderResponse.folder;
			const folderObj = Array.isArray(folder) ? folder[0] : folder;
			const folders = Array.isArray(folderObj.folder) ? folderObj.folder : [folderObj.folder];
			const inbox = folders.find(f => f.name === 'Inbox');
			const inboxId = inbox.id;

			// AddMsgRequest
			const addRes = await soap.makeSOAPEnvelopeAccount(
				`<AddMsgRequest xmlns="urn:zimbraMail">
					<m l="${inboxId}">
						<content>From: foo@foo.com
To: foo@foo.com
Subject: email01A
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: 7bit

simple text string in the body
</content>
					</m>
				</AddMsgRequest>`, token
			);

			// Verify response
			assert.notExists(addRes.Fault, 'Response should not be a Fault');
			const msg = Array.isArray(addRes.AddMsgResponse.m)
				? addRes.AddMsgResponse.m[0] : addRes.AddMsgResponse.m;
			return msg.id;
		};

		account1MsgId = await addMsg(account1Token);
		account2MsgId = await addMsg(account2Token);
		account3MsgId = await addMsg(account3Token);
		account4MsgId = await addMsg(account4Token);
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
	it('Functional | Verify if account status active, that the rest servlet is active for the account', async () => {
		// Verify REST works before status change
		const restRes1 = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: account1MsgId
		});

		// Verify response
		assert.equal(restRes1.status, 200, 'REST should return 200 for active account');

		// Set account status to active (already active, but explicitly)
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account1Id}</id>
				<a n="zimbraAccountStatus">active</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		const attrs = Array.isArray(modifyRes.ModifyAccountResponse.account)
			? modifyRes.ModifyAccountResponse.account[0]
			: modifyRes.ModifyAccountResponse.account;
		const attrList = Array.isArray(attrs.a) ? attrs.a : [attrs.a];
		const statusAttr = attrList.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content || statusAttr, 'active',
			'Account status should be active');

		// Verify REST still works after confirming active
		const restRes2 = await rest.makeRestRequest(account1Token, {
			user: account1Email,
			id: account1MsgId
		});

		// Verify response
		assert.equal(restRes2.status, 200, 'REST should return 200 for active account');
	});


	it('Functional | Verify if account status maintenance, that the rest servlet is not active for the account', async () => {
		// Verify REST works before status change
		const restRes1 = await rest.makeRestRequest(account2Token, {
			user: account2Email,
			id: account2MsgId
		});

		// Verify response
		assert.equal(restRes1.status, 200, 'REST should return 200 before maintenance');

		// Set account status to maintenance
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account2Id}</id>
				<a n="zimbraAccountStatus">maintenance</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		const attrs = Array.isArray(modifyRes.ModifyAccountResponse.account)
			? modifyRes.ModifyAccountResponse.account[0]
			: modifyRes.ModifyAccountResponse.account;
		const attrList = Array.isArray(attrs.a) ? attrs.a : [attrs.a];
		const statusAttr = attrList.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content || statusAttr, 'maintenance',
			'Account status should be maintenance');

		// Verify REST returns 401 for maintenance account
		const restRes2 = await rest.makeRestRequest(account2Token, {
			user: account2Email,
			id: account2MsgId
		});

		// Verify response
		assert.equal(restRes2.status, 401,
			'REST should return 401 for maintenance account');
	});


	it('Functional | Verify if account status locked, that the rest servlet is not active for the account', async () => {
		// Verify REST works before status change
		const restRes1 = await rest.makeRestRequest(account3Token, {
			user: account3Email,
			id: account3MsgId
		});

		// Verify response
		assert.equal(restRes1.status, 200, 'REST should return 200 before locked');

		// Set account status to locked
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account3Id}</id>
				<a n="zimbraAccountStatus">locked</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		const attrs = Array.isArray(modifyRes.ModifyAccountResponse.account)
			? modifyRes.ModifyAccountResponse.account[0]
			: modifyRes.ModifyAccountResponse.account;
		const attrList = Array.isArray(attrs.a) ? attrs.a : [attrs.a];
		const statusAttr = attrList.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content || statusAttr, 'locked',
			'Account status should be locked');

		// Verify REST returns 401 for locked account
		const restRes2 = await rest.makeRestRequest(account3Token, {
			user: account3Email,
			id: account3MsgId
		});

		// Verify response
		assert.equal(restRes2.status, 401,
			'REST should return 401 for locked account');
	});


	it('Functional | Verify if account status closed, that the rest servlet is not active for the account', async () => {
		// Verify REST works before status change
		const restRes1 = await rest.makeRestRequest(account4Token, {
			user: account4Email,
			id: account4MsgId
		});

		// Verify response
		assert.equal(restRes1.status, 200, 'REST should return 200 before closed');

		// Set account status to closed
		const modifyRes = await soap.makeSOAPEnvelopeAdmin(
			`<ModifyAccountRequest xmlns="urn:zimbraAdmin">
				<id>${account4Id}</id>
				<a n="zimbraAccountStatus">closed</a>
			</ModifyAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(modifyRes.Fault, 'Response should not be a Fault');
		const attrs = Array.isArray(modifyRes.ModifyAccountResponse.account)
			? modifyRes.ModifyAccountResponse.account[0]
			: modifyRes.ModifyAccountResponse.account;
		const attrList = Array.isArray(attrs.a) ? attrs.a : [attrs.a];
		const statusAttr = attrList.find(a => a.n === 'zimbraAccountStatus');

		// Verify response
		assert.equal(statusAttr._content || statusAttr, 'closed',
			'Account status should be closed');

		// Verify REST returns 401 for closed account
		const restRes2 = await rest.makeRestRequest(account4Token, {
			user: account4Email,
			id: account4MsgId
		});

		// Verify response
		assert.equal(restRes2.status, 401,
			'REST should return 401 for closed account');
	});
});
