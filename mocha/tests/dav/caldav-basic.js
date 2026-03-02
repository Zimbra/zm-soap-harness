import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Caldav Basic', function () {
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

		// Verify response
		assert.exists(acct.id, 'Account should have an id');

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

	// Helper: PROPFIND on root DAV folder
	async function propfindRoot() {
		return makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<CS:getctag/>
					<D:displayname/>
					<C:calendar-description/>
					<A:calendar-color/>
					<A:calendar-order/>
					<D:resourcetype/>
					<C:calendar-free-busy-set/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
	}


	// Tests
	it('Sanity | Verify basic Calendar folder', async () => {
		const res = await propfindRoot();

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '/Calendar/',
			'Response should contain Calendar href');
		assert.include(res.text, 'Calendar',
			'Response should include Calendar displayname');
	});


	it('Sanity | Verify basic Inbox folder', async () => {
		const res = await propfindRoot();

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '/Inbox/',
			'Response should contain Inbox href');
		assert.include(res.text, 'Inbox',
			'Response should include Inbox displayname');
	});


	it('Sanity | Verify basic Sent folder', async () => {
		const res = await propfindRoot();

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '/Sent/',
			'Response should contain Sent href');
	});


	it('Sanity | Verify basic Tasks folder', async () => {
		const res = await propfindRoot();

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '/Tasks/',
			'Response should contain Tasks href');
		assert.include(res.text, 'Tasks',
			'Response should include Tasks displayname');
	});
});
