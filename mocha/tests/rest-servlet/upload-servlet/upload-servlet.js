import { assert } from 'chai';
import path from 'path';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Rest Servlet > Upload Servlet > Upload Servlet', function () {
	this.timeout(120 * 1000);
	let account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1Name = 'test' + common.getUniqueString() + '@' + config.testDomain;

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
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

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
		assert.match(String(authRes.AuthResponse.lifetime), /^\d+$/,
			'lifetime should be numeric');
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
	it('Sanity | Basic Upload Servlet Test - upload a file, receive status code 200 OK', async () => {
		const filePath = path.resolve('data/email01/msg01.txt');
		const attachmentId = await soap.uploadFile(account1Token, filePath);

		// Verify response
		assert.exists(attachmentId, 'Upload should return attachment id');
		assert.isString(attachmentId, 'Attachment id should be a string');
	});


	it('Sanity | Basic Upload Servlet Test - upload a file with har extension, receive status code 200 OK', async () => {
		const filePath = path.resolve('data/ZBUG711/Archive.har');
		const attachmentId = await soap.uploadFile(account1Token, filePath);

		// Verify response
		assert.exists(attachmentId, 'Upload should return attachment id');
		assert.isString(attachmentId, 'Attachment id should be a string');
	});
});
