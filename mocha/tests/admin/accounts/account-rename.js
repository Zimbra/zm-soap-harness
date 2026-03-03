import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Accounts > Account Rename', function () {
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
	it('Smoke | Rename an account with valid new-name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
			</RenameAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');
	});


	it('Regression | Rename an account with in-valid(blank) new-name but correct domain name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// Rename account
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>@${config.testDomain}</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with valid name and invalid domain name 1', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>invaliddomain</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with valid name and invalid domain name 2', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>invaliddomain</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		assert.include(renameRes.Fault.Detail.Error.Code, 'service.INVALID_REQUEST');
	});


	it('Regression | Rename an account with blank name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName></newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with spaces in name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>             </newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with spchar in name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>:'&lt;//\\</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with sometext in name 1', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>some text</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with sometext in name 2', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>some text</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with negative name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>-1</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with zero in name', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>0</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Regression | Rename an account with largenumber', async () => {
		const acctName = `test.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acctId = createRes.CreateAccountResponse.account[0].id;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>12345678901234567890</newName>
			</RenameAccountRequest>`, adminAuthToken, false
		);

		// Verify response
		assert.isString(renameRes.Fault.Detail.Error.Code, 'Should have a Fault');
		const code = renameRes.Fault.Detail.Error.Code;

		// Verify response
		assert.isTrue(code.includes('service.INVALID_REQUEST') ||
			code.includes('service.PARSE_ERROR'));
	});


	it('Sanity | Rename an account along with zimbraMailHost, zimbraMailTransport', async () => {
		const acctName = `test14.${common.getUniqueString()}@${config.testDomain}`;
		const newName = `new14.${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const acct = createRes.CreateAccountResponse.account[0];
		const acctId = acct.id;
		const mailHost = acct.a.find(a => a.n === 'zimbraMailHost')._content;

		// RenameAccountRequest
		const renameRes = await soap.makeSOAPEnvelopeAdmin(
			`<RenameAccountRequest xmlns="urn:zimbraAdmin">
				<id>${acctId}</id>
				<newName>${newName}</newName>
				<a n="zimbraMailHost">${mailHost}</a>
				<a n="zimbraMailTransport">${mailHost}</a>
			</RenameAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(renameRes.Fault, 'Response should not be a Fault');
	});
});
