import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Carddav', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
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
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;

		// Verify response
		assert.exists(acct.id, 'Account should have an id');

		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// Auth request
		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);

		// Verify response
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse.authToken, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Create a contact via SOAP (replaces VCF upload via REST)
		const createContactRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">James</a>
					<a n="lastName">Bond</a>
					<a n="email">james.bond@example.com</a>
					<a n="company">MI6</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createContactRes.Fault, 'Response should not be a Fault');
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
	it('Sanity | Check addressbook-home-set property', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/principals/users/${account1Name}/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
				<D:prop>
					<C:addressbook-home-set/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'HTTP/1.1 200 OK', 'Should have 200 OK propstat');
		assert.match(res.text,
			new RegExp('/dav/' + account1Name.replace('@', '(@|%40)') + '/'),
			'addressbook-home-set href should contain dav path');
	});


	it('Sanity | Verify addressbook-multiget report', async () => {
		// PROPFIND to list contacts and find a VCF href
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<D:resourcetype/>
					<D:displayname/>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(propfindRes.status, 207, 'PROPFIND should return 207');
		assert.include(propfindRes.text, 'HTTP/1.1 200 OK', 'Should have 200 OK propstat');

		// Extract a VCF href from response
		const vcfMatch = propfindRes.text.match(/<D:href>([^<]*\.vcf)<\/D:href>/);

		// Verify response
		assert.exists(vcfMatch, 'Should find a VCF href in Contacts');
		const vcfUri = vcfMatch[1];

		// addressbook-multiget REPORT
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<C:addressbook-multiget xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
				<D:prop>
					<D:getetag/>
					<C:address-data/>
				</D:prop>
				<D:href>${vcfUri}</D:href>
			</C:addressbook-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.include(reportRes.text, 'HTTP/1.1 200 OK', 'Should have 200 OK propstat');
		assert.include(reportRes.text, 'getetag', 'Should contain getetag');
		assert.match(reportRes.text, /VERSION|UID/,
			'address-data should contain VERSION or UID');
	});


	it('Sanity | Verify addressbook-query report', async () => {
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:addressbook-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:carddav">
				<D:prop>
					<D:getetag/>
					<C:address-data>
						<C:prop name="VERSION"/>
						<C:prop name="UID"/>
						<C:prop name="NICKNAME"/>
						<C:prop name="EMAIL"/>
					</C:address-data>
				</D:prop>
				<C:filter>
					<C:prop-filter name="EMAIL">
						<C:text-match collation="i;unicode-casemap" match-type="prefix">James</C:text-match>
					</C:prop-filter>
				</C:filter>
			</C:addressbook-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.include(reportRes.text, 'HTTP/1.1 200 OK', 'Should have 200 OK propstat');
	});
});
