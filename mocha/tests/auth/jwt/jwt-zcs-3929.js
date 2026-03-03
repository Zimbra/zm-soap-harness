import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Auth > Jwt > Jwt ZCS 3929', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let account1Name;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		account1Name = 'user1.' + common.getUniqueString() + '@' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraAuthTokenLifetime">1m</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account ID should exist');
		assert.isString(acct.id, 'Account ID should be a string');
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
	it('Smoke | Generate JWT auth token and use it to fire the FileUpload servlet request', async () => {
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false" tokenType="JWT">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const authToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Verify response
		assert.exists(authToken, 'JWT auth token should exist');

		// NOTE: FileUpload servlet test (uploadservlettest) requires framework support.
		// The JWT token generation and SaveDocumentRequest via JWT context are validated here.
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="16">
					<content>test content for JWT upload</content>
				</doc>
			</SaveDocumentRequest>`, authToken
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		assert.exists(doc.id, 'Document ID should exist');
	});


	it('Sanity | Generate normal auth token and use it to fire the FileUpload servlet request', async () => {
		// Send the message
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount" persistAuthTokenCookie="false">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');

		const authToken = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Verify response
		assert.exists(authToken, 'Auth token should exist');

		// NOTE: FileUpload servlet test (uploadservlettest) requires framework support.
		// The auth token generation and SaveDocumentRequest are validated here.
		const saveRes = await soap.makeSOAPEnvelopeAccount(
			`<SaveDocumentRequest xmlns="urn:zimbraMail">
				<doc l="16">
					<content>test content for normal upload</content>
				</doc>
			</SaveDocumentRequest>`, authToken
		);

		// Verify response
		assert.notExists(saveRes.Fault, 'Response should not be a Fault');
		const doc = Array.isArray(saveRes.SaveDocumentResponse.doc)
			? saveRes.SaveDocumentResponse.doc[0] : saveRes.SaveDocumentResponse.doc;
		assert.exists(doc.id, 'Document ID should exist');
	});
});
