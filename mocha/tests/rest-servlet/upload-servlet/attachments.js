import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';

describe('Rest Servlet > Upload Servlet > Attachments', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1Token;
	let account2Name;
	let account2Token;
	let uploadedAid;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		account1Name = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		assert.exists(createRes1.CreateAccountResponse, 'Should create account1');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;
		assert.exists(acct1.id, 'Account1 should have an id');

		// Create account2
		account2Name = 'test' + common.getUniqueString() + '@' + config.testDomain;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		assert.exists(createRes2.CreateAccountResponse, 'Should create account2');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;
		assert.exists(acct2.id, 'Account2 should have an id');

		// Auth as account1
		const authRes1 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes1.Fault, 'Response should not be a Fault');
		assert.exists(authRes1.AuthResponse, 'AuthResponse should exist for account1');
		assert.match(String(authRes1.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes1.AuthResponse.authToken, 'authToken should exist');

		account1Token = Array.isArray(authRes1.AuthResponse.authToken)
			? authRes1.AuthResponse.authToken[0]._content || authRes1.AuthResponse.authToken[0]
			: authRes1.AuthResponse.authToken._content || authRes1.AuthResponse.authToken;

		// Upload a file as account1
		const filePath = path.resolve('data/mime/email01/msg01.txt');
		uploadedAid = await soap.uploadFile(account1Token, filePath);
		assert.exists(uploadedAid, 'Upload should return attachment id');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Send a message that includes an attachment that was uploaded using the upload servlet', async () => {
		const subject = 'subject' + common.getUniqueString();
		const content = 'content' + common.getUniqueString();

		// Send message with uploaded attachment
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account2Name}"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<attach aid="${uploadedAid}"/>
				</m>
			</SendMsgRequest>`, account1Token
		);
		assert.notExists(sendRes.Fault, 'Response should not be a Fault');
		assert.exists(sendRes.SendMsgResponse, 'SendMsgResponse should exist');
		const sentMsg = Array.isArray(sendRes.SendMsgResponse.m)
			? sendRes.SendMsgResponse.m[0]
			: sendRes.SendMsgResponse.m;
		assert.exists(sentMsg.id, 'Sent message should have an id');

		// Verify message via GetMsgRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${sentMsg.id}" read="1" html="1"/>
			</GetMsgRequest>`, account1Token
		);
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		assert.exists(getRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getRes.GetMsgResponse.m)
			? getRes.GetMsgResponse.m[0]
			: getRes.GetMsgResponse.m;
		assert.equal(msg.id, sentMsg.id, 'Message id should match');
	});


	it('Regression | Send a message that includes an attachment that was uploaded for different account', async () => {
		// Auth as account2
		const authRes2 = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account2Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes2.Fault, 'Response should not be a Fault');
		assert.exists(authRes2.AuthResponse, 'AuthResponse should exist for account2');
		assert.match(String(authRes2.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
		assert.exists(authRes2.AuthResponse.authToken, 'authToken should exist');

		account2Token = Array.isArray(authRes2.AuthResponse.authToken)
			? authRes2.AuthResponse.authToken[0]._content || authRes2.AuthResponse.authToken[0]
			: authRes2.AuthResponse.authToken._content || authRes2.AuthResponse.authToken;

		// Try to send using account1's uploaded aid — should fail
		const sendRes = await soap.makeSOAPEnvelopeAccount(
			`<SendMsgRequest xmlns="urn:zimbraMail">
				<m>
					<e t="t" a="${account1Name}"/>
					<mp ct="text/plain">
						<content>content${common.getUniqueString()}</content>
					</mp>
					<attach aid="${uploadedAid}"/>
				</m>
			</SendMsgRequest>`, account2Token
		);
		assert.exists(sendRes.Fault, 'Should return Fault for cross-account upload');
		assert.include(sendRes.Fault.Detail.Error.Code, 'mail.NO_SUCH_UPLOAD',
			'Should return NO_SUCH_UPLOAD');
	});
});
