import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('CalDav > Misc (Lightning, Properties, Features)', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Server;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;
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
	it('Sanity | Options query should return calendar-access and calendar-schedule', async () => {
		const res = await makeDavRequest({
			method: 'OPTIONS',
			uri: `/dav/${account1NameEncoded}`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});

		// Verify response
		assert.oneOf(res.status, [200, 204], 'OPTIONS should return 200 or 204');
		const davHeader = res.headers.get('DAV') || res.headers.get('dav') || '';

		// Verify response
		assert.include(davHeader, 'calendar-access',
			'DAV header should include calendar-access');
		assert.include(davHeader, 'calendar-auto-schedule',
			'DAV header should include calendar-auto-schedule');
	});


	it('Functional | Test if the server can handle PROPATCH of dead properties', async () => {
		// PROPPATCH to set calendar-order
		const patchRes = await makeDavRequest({
			method: 'PROPPATCH',
			uri: `/dav/${account1NameEncoded}/Calendar`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propertyupdate xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical">
				<D:set>
					<D:prop>
						<D:calendar-order>1</D:calendar-order>
					</D:prop>
				</D:set>
			</D:propertyupdate>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(patchRes.status, 207, 'PROPPATCH should return 207');
		assert.include(patchRes.text, 'HTTP/1.1 200 OK',
			'PROPPATCH should have 200 OK propstat');

		// PROPFIND to verify the value
		const findRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propfind xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical">
				<D:prop>
					<D:calendar-order/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(findRes.status, 207, 'PROPFIND should return 207');
		assert.include(findRes.text, '>1<',
			'calendar-order should return value of 1');
	});


	it('Functional | Verify calendar folder is not returned when the Calendar feature is disabled', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account with Calendar feature disabled
		const acctUser = 'test' + common.getUniqueString();
		const acctName = acctUser + '@' + config.testDomain;
		const acctEncoded = acctUser + '%40' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureCalendarEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		const server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// PROPFIND on Calendar folder
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${acctEncoded}/Calendar/`,
			user: acctName,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:displayname/>
					<D:resourcetype/>
				</D:prop>
			</D:propfind>`,
			server: server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		// When Calendar feature disabled, resourcetype should NOT contain calendar element
		assert.notMatch(res.text, /<C:calendar\s*\/>/,
			'Calendar resourcetype should not appear when feature is disabled');
	});


	it('Functional | Verify tasks folder is not returned when the Tasks feature is disabled', async () => {
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account with Tasks feature disabled
		const acctUser = 'test' + common.getUniqueString();
		const acctName = acctUser + '@' + config.testDomain;
		const acctEncoded = acctUser + '%40' + config.testDomain;

		// Create account
		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${acctName}</name>
				<password>${config.accountPassword}</password>
				<a n="zimbraFeatureTasksEnabled">FALSE</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		const server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// PROPFIND on Tasks folder
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${acctEncoded}/Tasks/`,
			user: acctName,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:displayname/>
					<D:resourcetype/>
				</D:prop>
			</D:propfind>`,
			server: server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		// When Tasks feature disabled, resourcetype should NOT contain calendar element
		assert.notMatch(res.text, /<C:calendar\s*\/>/,
			'Calendar resourcetype should not appear when Tasks feature is disabled');
	});
});
