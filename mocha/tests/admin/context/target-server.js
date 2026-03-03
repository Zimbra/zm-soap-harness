import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > Context > Target Server', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let domainName;
	let account1Email;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();

		// Create test domain
		domainName = `${common.getUniqueString()}.${config.testDomain}`;
		const domainRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateDomainRequest xmlns="urn:zimbraAdmin">
				<name>${domainName}</name>
			</CreateDomainRequest>`, adminAuthToken
		);
		assert.notExists(domainRes.Fault, 'CreateDomainRequest should not fault');

		// Create test account 1
		account1Email = `test1.${common.getUniqueString()}@${domainName}`;
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes1.Fault, 'Account 1 creation should not fault');

		// Create test account 2
		const account2Email = `test2.${common.getUniqueString()}@${domainName}`;
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes2.Fault, 'Account 2 creation should not fault');
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
	it('Functional | Send an admin request using targetServer', async () => {
		// GetQuotaUsageRequest for the test domain
		const quotaRes = await soap.makeSOAPEnvelopeAdmin(
			`<GetQuotaUsageRequest xmlns="urn:zimbraAdmin" domain="${domainName}" offset="0" limit="25"/>`,
			adminAuthToken
		);

		// Verify response contains the account
		assert.notExists(quotaRes.Fault, 'GetQuotaUsageRequest should not fault');
		const accounts = Array.isArray(quotaRes.GetQuotaUsageResponse.account)
			? quotaRes.GetQuotaUsageResponse.account
			: [quotaRes.GetQuotaUsageResponse.account];
		const found = accounts.find(a => a.name === account1Email);
		assert.exists(found, `Account ${account1Email} should be in quota usage results`);
	});
});
