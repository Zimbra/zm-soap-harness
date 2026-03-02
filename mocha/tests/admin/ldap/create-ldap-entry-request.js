import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Admin > LDAP > Create LDAP Entry Request', function () {
	this.timeout(60 * 1000);
	let adminAuthToken;
	let accountName;

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
		accountName = `account${common.getUniqueString()}`;
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
	it('Sanity | Send basic CreateLDAPEntryRequest', async () => {
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateLDAPEntryRequest xmlns="urn:zimbraAdmin" dn="cn=${accountName}">
				<a n="objectClass">organizationalPerson</a>
				<a n="sn">${accountName}</a>
			</CreateLDAPEntryRequest>`, adminAuthToken
		);
		assert.notExists(res.Fault, 'CreateLDAPEntryRequest should not fault');
		assert.exists(res.CreateLDAPEntryResponse, 'CreateLDAPEntryResponse should exist');
	});
});
