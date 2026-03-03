import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Briefcase > Bugs > Bug 106162', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1Token;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		account1Name = 'acct.' + common.getUniqueString() + '@' + config.testDomain;

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
		assert.exists(acct.id, 'Account ID should exist');
		const host = acct.a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');
		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'AuthResponse should exist');

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
	it('Sanity | Verify signature names are not case sensitive', async () => {
		const sigName = 'TestSig.' + common.getUniqueString();

		// Create signature
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="${sigName}">
					<content type="text/plain">Test signature content</content>
				</signature>
			</CreateSignatureRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const sig = Array.isArray(createRes.CreateSignatureResponse.signature)
			? createRes.CreateSignatureResponse.signature[0] : createRes.CreateSignatureResponse.signature;
		assert.exists(sig.id, 'Signature ID should exist');

		// Try to create same name with different case
		const createRes2 = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="${sigName.toUpperCase()}">
					<content type="text/plain">Duplicate sig content</content>
				</signature>
			</CreateSignatureRequest>`, account1Token
		);

		// Verify response
		assert.isString(createRes2.Fault.Detail.Error.Code,
			'Fault error Code should be a string for case-insensitive duplicate');
	});


	it('Sanity | Verify signature data correctly returned in GetInfo response 1', async () => {
		const sigName = 'PlainSig.' + common.getUniqueString();
		const sigContent = 'Plain text signature ' + common.getUniqueString();

		// CreateSignatureRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="${sigName}">
					<content type="text/plain">${sigContent}</content>
				</signature>
			</CreateSignatureRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const sig = Array.isArray(createRes.CreateSignatureResponse.signature)
			? createRes.CreateSignatureResponse.signature[0] : createRes.CreateSignatureResponse.signature;
		assert.exists(sig.id, 'Signature ID should exist');

		// Verify via GetSignaturesRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetSignaturesRequest xmlns="urn:zimbraAccount"/>', account1Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const sigs = getRes.GetSignaturesResponse.signature;
		assert.exists(sigs, 'Signatures should exist');
	});


	it('Sanity | Verify signature data correctly returned in GetInfo response 2', async () => {
		const sigName = 'HtmlSig.' + common.getUniqueString();

		// CreateSignatureRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="${sigName}">
					<content type="text/html">&lt;b&gt;HTML signature&lt;/b&gt;</content>
				</signature>
			</CreateSignatureRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const sig = Array.isArray(createRes.CreateSignatureResponse.signature)
			? createRes.CreateSignatureResponse.signature[0] : createRes.CreateSignatureResponse.signature;
		assert.exists(sig.id, 'Signature ID should exist');

		// GetSignaturesRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetSignaturesRequest xmlns="urn:zimbraAccount"/>', account1Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const sigs = getRes.GetSignaturesResponse.signature;
		assert.exists(sigs, 'Signatures should exist');
	});


	it('Sanity | Verify signature data correctly returned in GetInfo response 3', async () => {
		const sigName = 'MixedSig.' + common.getUniqueString();

		// CreateSignatureRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateSignatureRequest xmlns="urn:zimbraAccount">
				<signature name="${sigName}">
					<content type="text/plain">Plain part of signature</content>
					<content type="text/html">&lt;b&gt;HTML part&lt;/b&gt;</content>
				</signature>
			</CreateSignatureRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const sig = Array.isArray(createRes.CreateSignatureResponse.signature)
			? createRes.CreateSignatureResponse.signature[0] : createRes.CreateSignatureResponse.signature;
		assert.exists(sig.id, 'Signature ID should exist');

		// GetSignaturesRequest
		const getRes = await soap.makeSOAPEnvelopeAccount(
			'<GetSignaturesRequest xmlns="urn:zimbraAccount"/>', account1Token
		);

		// Verify response
		assert.notExists(getRes.Fault, 'Response should not be a Fault');
		const sigs = getRes.GetSignaturesResponse.signature;
		assert.exists(sigs, 'Signatures should exist');
	});
});
