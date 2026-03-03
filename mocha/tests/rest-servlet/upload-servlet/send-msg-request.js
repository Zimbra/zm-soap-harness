import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Upload Servlet > Send Msg Request', function () {
	this.timeout(30 * 1000);
	let account1Name;
	let account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Name = 'test' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct.id, 'Account should have an id');

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
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
	it('Sanity | Add a message that was uploaded using the upload servlet', async () => {
		// Upload file
		const filePath = path.resolve('data/email01/msg01.txt');
		const attachmentId = await soap.uploadFile(account1Token, filePath);

		// Verify response
		assert.exists(attachmentId, 'Upload should return attachment id');

		// Send message using uploaded aid
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m aid="${attachmentId}">
					<e t="t" a="${account1Name}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0] : sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'sent msg id should exist');
		assert.isString(sentMsg.id, 'Sent message should have an id');

		// Verify response
		assert.exists(sentMsg.id, 'Sent message should have an id');

		// Verify via GetMsgRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}"/>
			</GetMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const getMsg = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0] : getRes.GetMsgResponse.m;
		assert.exists(getMsg.id, 'message id should exist');
		const msg = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0]
			: getRes.GetMsgResponse.m;

		// Verify sender (from)
		const emails = Array.isArray(msg.e) ? msg.e : [msg.e];
		const fromEmail = emails.find(e => e.t === 'f');

		// Verify response
		assert.exists(fromEmail, 'From email should exist');
		assert.equal(fromEmail.a, account1Name, 'From address should match account1');

		// Verify recipient (to)
		const toEmail = emails.find(e => e.t === 't');

		// Verify response
		assert.exists(toEmail, 'To email should exist');

		// Verify subject
		assert.equal(msg.su, 'email01A', 'Subject should match uploaded message subject');

		// Verify content type - text/plain part exists
		const mp = Array.isArray(msg.mp) ? msg.mp[0] : msg.mp;

		// Verify response
		assert.exists(mp.ct, 'Message part content type should exist');
	});
});
