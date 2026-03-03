import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > LDAP > Delete LDAP Entry Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let accountName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountName = `account${common.getUniqueString()}`;

		// Create LDAP entry to delete
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${accountName}">
				<a n="objectClass">organizationalPerson</a>
				<a n="sn">${accountName}</a>
			</CreateLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'CreateLDAPEntryRequest setup should not fault');
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
	it('Sanity | Send basic DeleteLDAPEntryRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<DeleteLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${accountName}">
			</DeleteLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'DeleteLDAPEntryRequest should not fault');
	});
});
