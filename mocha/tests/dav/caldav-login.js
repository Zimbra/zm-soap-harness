import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Caldav Login', function () {
	this.timeout(30 * 1000);
	let account1Name;
	let account2Name;
	let account1Server;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;

		// Create account
		const createRes1 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes1.Fault, 'Response should not be a Fault');
		const acct1 = Array.isArray(createRes1.CreateAccountResponse.account)
			? createRes1.CreateAccountResponse.account[0]
			: createRes1.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct1.id, 'Account1 should have an id');

		// Extract zimbraMailHost
		const attrs1 = Array.isArray(acct1.a) ? acct1.a : [acct1.a];
		const mailHost = attrs1.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// Create account2 with displayName
		const account2User = 'test' + common.getUniqueString();
		account2Name = account2User + '@' + config.testDomain;

		// Create account
		const createRes2 = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account2Name}</name>
				<password>${config.accountPassword}</password>
				<a n="displayName">${account2User}</a>
			</CreateAccountRequest>`, adminAuthToken
		);

		// Verify response
		assert.notExists(createRes2.Fault, 'Response should not be a Fault');
		const acct2 = Array.isArray(createRes2.CreateAccountResponse.account)
			? createRes2.CreateAccountResponse.account[0]
			: createRes2.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct2.id, 'Account2 should have an id');
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
	it('Sanity | Basic Test - CalDav login', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${account1Name}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:calendar-user-address-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
					<x2:dropbox-home-URL/>
					<x2:notifications-URL/>
					<x0:displayname/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'Should return 207 Multi-Status');
		assert.match(res.text, new RegExp('/principals/users/' + account1Name.replace('@', '(@|%40)') + '/'),
			'Response should contain principals href');
	});


	it('Sanity | CalDav login - verify calendar, address, inbox, sent', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${account1Name}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:calendar-user-address-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
					<x2:dropbox-home-URL/>
					<x2:notifications-URL/>
					<x0:displayname/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'Should return 207 Multi-Status');
		const namePattern = account1Name.replace('@', '(@|%40)');

		// Verify response
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/'),
			'calendar-home-set should contain dav path');
		assert.include(res.text, `mailto:${account1Name}`,
			'calendar-user-address-set should contain mailto');
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/Inbox/'),
			'schedule-inbox-URL should contain Inbox path');
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/Sent/'),
			'schedule-outbox-URL should contain Sent path');
	});


	it('Sanity | CalDav login - verify display name', async () => {
		const account2User = account2Name.split('@')[0];
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${account2Name}/`,
			user: account2Name,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:calendar-user-address-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
					<x2:dropbox-home-URL/>
					<x2:notifications-URL/>
					<x0:displayname/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'Should return 207 Multi-Status');
		assert.include(res.text, `<D:displayname>${account2User}</D:displayname>`,
			'displayname should match account2 user');
	});


	it('Sanity | Login to a non-existent account', async () => {
		const nonExistentName = 'nonexistent' + common.getUniqueString() + '@' + config.testDomain;
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${nonExistentName}/`,
			user: nonExistentName,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:calendar-user-address-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
					<x2:dropbox-home-URL/>
					<x2:notifications-URL/>
					<x0:displayname/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 401, 'Should return 401 Unauthorized for non-existent account');
	});


	it('Sanity | Simulate the Sunbird login trace', async () => {
		// PROPFIND on Calendar
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1Name}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<D:resourcetype/>
					<D:owner/>
					<CS:getctag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(propfindRes.status, 207, 'PROPFIND should return 207 Multi-Status');
		assert.match(propfindRes.text,
			new RegExp('/dav/' + account1Name.replace('@', '(@|%40)') + '/Calendar/'),
			'Response should contain Calendar href');

		// REPORT on Calendar
		const account1Encoded = account1Name.replace('@', '%40');
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1Encoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:getetag/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VTODO"/>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207 Multi-Status');
		assert.include(reportRes.text, 'multistatus',
			'Response should contain multistatus');
	});


	it('Sanity | Login to a non-existent account 1', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${encodeURIComponent(account1Name)}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});
		// Should get a response (not error)
		// Verify response
		assert.isAtLeast(res.status, 200, 'Should return a successful status code');
		assert.isBelow(res.status, 500, 'Should not return server error');
	});


	it('Sanity | Verify calendar-home-set, schedule-inbox-url, and schedule-outbox-url are not encoded', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${account1Name}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<x0:propfind xmlns:x2="http://calendarserver.org/ns/" xmlns:x1="urn:ietf:params:xml:ns:caldav" xmlns:x0="DAV:">
				<x0:prop>
					<x1:calendar-home-set/>
					<x1:schedule-inbox-URL/>
					<x1:schedule-outbox-URL/>
				</x0:prop>
			</x0:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'Should return 207 Multi-Status');
		const namePattern = account1Name.replace('@', '(@|%40)');

		// Verify response
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/'),
			'calendar-home-set href should contain dav path');
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/Inbox/'),
			'schedule-inbox-URL href should contain Inbox path');
		assert.match(res.text, new RegExp('/dav/' + namePattern + '/Sent/'),
			'schedule-outbox-URL href should contain Sent path');
	});
});
