import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > LDAP > Get LDAP Entries Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let accountName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountName = `account${common.getUniqueString()}`;

		// Create account so it exists in LDAP
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${accountName}@${config.testDomain}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateAccountRequest setup should not fault');
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
	it('Sanity | Send basic GetLDAPEntriesRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<GetLDAPEntriesRequest xmlns="urn:zimbraAdmin">
				<ldapSearchBase>dc=com</ldapSearchBase>
				<query>cn=${accountName}*</query>
			</GetLDAPEntriesRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'GetLDAPEntriesRequest should not fault');
		assert.exists(res.GetLDAPEntriesResponse, 'GetLDAPEntriesResponse should exist');
	});
});
