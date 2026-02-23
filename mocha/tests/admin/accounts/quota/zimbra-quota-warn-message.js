import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';

describe('Admin > Accounts > Quota > Zimbra Quota Warn Message', function () {
	let adminAuthToken;

	before(async function () {
		adminAuthToken = await soap.getAdminAuthToken();
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Smoke | Verify zimbraQuotaWarnMessage can be set on account', async () => {
		const warnMsg = `text${common.getUniqueString()}`;
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
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
		assert.exists(response.CreateAccountResponse, 'Account should be created');

		const attrs = response.CreateAccountResponse.account[0].a || [];
		const warnAttr = attrs.find(a => a.n === 'zimbraQuotaWarnMessage');
		assert.exists(warnAttr, 'zimbraQuotaWarnMessage should be set');
		assert.include(warnAttr._content, warnMsg);
	});


	it('Smoke | Verify zimbraQuotaWarnMessage can be set with I18N characters', async () => {
		const warnMsg = `Администратор${common.getUniqueString()}`;
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
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
		assert.exists(response.CreateAccountResponse, 'Account should be created');

		const attrs = response.CreateAccountResponse.account[0].a || [];
		const warnAttr = attrs.find(a => a.n === 'zimbraQuotaWarnMessage');
		assert.exists(warnAttr, 'zimbraQuotaWarnMessage should be set');
		assert.include(warnAttr._content, warnMsg);
	});


	it('Functional | Verify zimbraQuotaWarnMessage with I18N display name', async () => {
		const acctName = `test${common.getUniqueString()}@${config.testDomain}`;
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
		assert.exists(response.CreateAccountResponse,
			'Account should be created with I18N display name');
		const attrs = response.CreateAccountResponse.account[0].a || [];
		const displayAttr = attrs.find(a => a.n === 'displayName');
		assert.exists(displayAttr);
		assert.equal(displayAttr._content, 'があります 作成');
	});

});
