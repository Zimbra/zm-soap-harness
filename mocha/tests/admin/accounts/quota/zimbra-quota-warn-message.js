import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Admin > Accounts > Quota > Zimbra Quota Warn Message', function () {
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
	it('Sanity | Verify the Quota Warn Message can be set', async () => {
		const warnMsg = `text${common.getUniqueString()}`;
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">500</a>
				<a n="zimbraQuotaWarnPercent">10</a>
				<a n="zimbraQuotaWarnInterval">1d</a>
				<a n="zimbraQuotaWarnMessage">From: foo@example.com
To: bar@example.com
Subject: QuotaWarn
Content-Type: text/plain
Your mailbox is nearly full
${warnMsg}
</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');

		const attrs = response.CreateAccountResponse.account[0].a || [];
		const warnAttr = attrs.find(a => a.n === 'zimbraQuotaWarnMessage');

		// Verify response
		assert.exists(warnAttr, 'zimbraQuotaWarnMessage should be set');
		assert.include(warnAttr._content, warnMsg);
	});


	it('Sanity | Verify the Quota Warn Message can be set to I18N characters', async () => {
		const warnMsg = `Администратор${common.getUniqueString()}`;
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">500</a>
				<a n="zimbraQuotaWarnPercent">10</a>
				<a n="zimbraQuotaWarnInterval">1d</a>
				<a n="zimbraQuotaWarnMessage">From: foo@example.com
To: bar@example.com
Subject: QuotaWarn
Content-Type: text/plain
Your mailbox is nearly full
${warnMsg}
</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');

		const attrs = response.CreateAccountResponse.account[0].a || [];
		const warnAttr = attrs.find(a => a.n === 'zimbraQuotaWarnMessage');

		// Verify response
		assert.exists(warnAttr, 'zimbraQuotaWarnMessage should be set');
		assert.include(warnAttr._content, warnMsg);
	});


	it('Sanity | Verify the Quota Warn Message can be triggered - lmtp', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;

		// Create account
		const response = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="givenName">作成</a>
				<a n="sn">があります</a>
				<a n="displayName">があります 作成</a>
				<a n="zimbraMailQuota">750</a>
				<a n="zimbraQuotaWarnPercent">10</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(response.Fault, 'Response should not be a Fault');
		const attrs = response.CreateAccountResponse.account[0].a || [];
		const displayAttr = attrs.find(a => a.n === 'displayName');

		// Verify response
		assert.exists(displayAttr);
		assert.equal(displayAttr._content, 'があります 作成');
	});


	it('Functional | Verify the Quota Warn Message can be received, even if the quota message will send the account over quota', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
		const warnSubject = `subject${common.getUniqueString()}`;
		const warnMsg = `text${common.getUniqueString()}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">750</a>
				<a n="zimbraQuotaWarnPercent">10</a>
				<a n="zimbraQuotaWarnInterval">1d</a>
				<a n="zimbraQuotaWarnMessage">From: foo@example.com
To: bar@example.com
Subject: ${warnSubject}
Content-Type: text/plain
Your mailbox is nearly full
${warnMsg}
</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		// Auth and search for quota warn message
		const userAuth = await soap.getAccountAuthToken(
			acctName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${warnSubject})</query>
			</SearchRequest>`, userAuth
		);
		// Warn message may not exist yet until quota
		// threshold is reached
		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.notExists(searchRes.Fault, 'SearchResponse should exist');
	});


	it('Functional | Verify I18N quota warning message can be sent', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
		const warnSubject = `subject${common.getUniqueString()}`;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">500</a>
				<a n="zimbraQuotaWarnPercent">10</a>
				<a n="zimbraQuotaWarnInterval">1d</a>
				<a n="zimbraQuotaWarnMessage">From: foo@example.com
To: bar@example.com
Subject: ${warnSubject}
Content-Type: text/plain
Your mailbox is nearly full
</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse.account[0].id, 'Account ID should exist');
		const host = createRes.CreateAccountResponse.account[0].a.find(a => a.n === 'zimbraMailHost');
		assert.exists(host, 'zimbraMailHost should exist');

		const userAuth = await soap.getAccountAuthToken(
			acctName, config.accountPassword);

		// SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="message">
				<query>subject:(${warnSubject})</query>
			</SearchRequest>`, userAuth
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		assert.notExists(searchRes.Fault, 'SearchResponse should exist');
	});


	it('Functional | Verify I18N quota warning message can be sent, with standard quota template', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
		const warnSubject = `subject${common.getUniqueString()}`;
		const encoded =
			'0JDQtNC80LjQvdC40YHRgtGA0LDRgtC+0YA=';

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraMailQuota">750</a>
				<a n="zimbraQuotaWarnPercent">10</a>
				<a n="zimbraQuotaWarnInterval">1d</a>
				<a n="zimbraQuotaWarnMessage">From: foo@example.com
To: bar@example.com
Subject: ${warnSubject}
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: base64
${encoded}
</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');

		const attrs =
			createRes.CreateAccountResponse.account[0].a || [];
		const warnAttr = attrs.find(
			a => a.n === 'zimbraQuotaWarnMessage');

		// Verify response
		assert.exists(warnAttr,
			'zimbraQuotaWarnMessage should be set');
		assert.include(warnAttr._content, encoded);
	});


	it('Functional | Verify quota warning message can be sent, with Customize quota template', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
		const displayName = 'TestHarness User';

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="givenName">TestHarness</a>
				<a n="sn">TH</a>
				<a n="displayName">${displayName}</a>
				<a n="zimbraMailQuota">2048</a>
				<a n="zimbraQuotaWarnPercent">10</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const attrs =
			createRes.CreateAccountResponse.account[0].a || [];
		const nameAttr = attrs.find(
			a => a.n === 'displayName');

		// Verify response
		assert.exists(nameAttr);
		assert.equal(nameAttr._content, displayName);
	});


	it('Functional | Verify i18n quota warning message can be sent, with Customize quota template', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
		const displayName = 'があります 作成';

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="givenName">作成</a>
				<a n="sn">があります</a>
				<a n="displayName">${displayName}</a>
				<a n="zimbraMailQuota">750</a>
				<a n="zimbraQuotaWarnPercent">10</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		const attrs =
			createRes.CreateAccountResponse.account[0].a || [];
		const nameAttr = attrs.find(
			a => a.n === 'displayName');

		// Verify response
		assert.exists(nameAttr);
		assert.equal(nameAttr._content, displayName);
	});
});
