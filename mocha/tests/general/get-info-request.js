import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import { main } from '../../pages/main.js';

describe('General > Get Info Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken, accountEmail, accountAuthToken;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		accountEmail = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountEmail}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
			</CreateAccountRequest>`, adminAuthToken
		);
		accountAuthToken = await soap.getAccountAuthToken(accountEmail);
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
	it('Sanity | Get info of account', async () => {
		// GetInfoRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetInfoResponse.name,
			'GetInfoResponse should contain name');
		const cos = Array.isArray(res.GetInfoResponse.cos)
			? res.GetInfoResponse.cos[0] : res.GetInfoResponse.cos;

		// Verify response
		assert.equal(cos.name, 'default', 'COS name should be default');
	});


	it('Functional | Get info of account and verify the attributes', async () => {
		// GetInfoRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', accountAuthToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.equal(res.GetInfoResponse.name, accountEmail,
			'Name should match account email');
	});


	it('Functional | Verify that the used field of GetInfoRequest is the same after reloging in', async () => {
		const authToken1 = await soap.getAccountAuthToken(accountEmail);

		// GetInfoRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken1
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		const used1 = res1.GetInfoResponse.used;

		// Authenticate account
		const authToken2 = await soap.getAccountAuthToken(accountEmail);

		// GetInfoRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken2
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		assert.equal(res2.GetInfoResponse.used, used1,
			'Used field should be the same after re-login');
	});


	it('Functional | Verify that the used field of GetInfoRequest is increased by the size of the message', async () => {
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// GetInfoRequest
		const res1 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);

		// Verify response
		assert.notExists(res1.Fault, 'Response should not be a Fault');
		assert.equal(res1.GetInfoResponse.name, accountEmail,
			'Name should match account email');
		const usedBefore = parseInt(res1.GetInfoResponse.used, 10);

		// Verify response
		assert.equal(usedBefore, 0, 'Used should be 0 initially');

		// Inject the message
		const addRes = await soap.makeSOAPEnvelopeAccount(
			`<AddMsgRequest xmlns="urn:zimbraMail">
				<m l="1">
				<content>Subject: hello

Content Text
				</content></m>
			</AddMsgRequest>`, authToken
		);

		// Verify response
		assert.notExists(addRes.Fault, 'AddMsgRequest should not be a Fault');

		// GetInfoRequest
		const res2 = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);

		// Verify response
		assert.notExists(res2.Fault, 'Response should not be a Fault');
		const usedAfter = parseInt(res2.GetInfoResponse.used, 10);

		// Verify response
		assert.isTrue(usedAfter >= 30 && usedAfter <= 39,
			'Used should be around 30-39 bytes after adding message');
	});


	it('Functional | Verify that the server should export version information', async () => {
		const authToken = await soap.getAccountAuthToken(accountEmail);

		// GetInfoRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', authToken
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		const version = res.GetInfoResponse.version;

		// Verify response
		assert.exists(version, 'Version should exist');
		assert.match(version, /\d+\.\d+\.\d+/,
			'Version should contain major.minor.macro');
		assert.match(version, /FOSS|NETWORK/,
			'Version should contain FOSS or NETWORK');
	});


	it('Sanity | Validating cos attributes in getinfo', async () => {
		const cosName = `cos${common.getUniqueString()}`;

		// Send create cos request
		const createCosRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateCosRequest xmlns="urn:zimbraAdmin">
				<name>${cosName}</name>
				<a n="cn">${cosName}</a>
				<a n="zimbraFeatureEwsEnabled">FALSE</a>
			</CreateCosRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createCosRes.Fault, 'CreateCosRequest should not be a Fault');
		const cos = Array.isArray(createCosRes.CreateCosResponse.cos)
			? createCosRes.CreateCosResponse.cos[0] : createCosRes.CreateCosResponse.cos;
		const cosId = cos.id;
		const account2Email = `test2${common.getUniqueString()}@${config.testDomain}`;

		// Create an account
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureEwsEnabled">TRUE</a>
				<a n="zimbraCOSId">${cosId}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Authenticate account
		const account2Token = await soap.getAccountAuthToken(account2Email);

		// GetInfoRequest
		const res = await soap.makeSOAPEnvelopeAccount(
			'<GetInfoRequest xmlns="urn:zimbraAccount"/>', account2Token
		);

		// Verify response
		assert.notExists(res.Fault, 'Response should not be a Fault');
		assert.exists(res.GetInfoResponse.license,
			'License info should exist');
	});
});
