import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';

describe('WebDav', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
	let account1Server;

	before(async function () {
		const adminAuthToken = await soap.getAdminAuthToken();

		const account1User = 'test' + common.getUniqueString();
		account1Name = account1User + '@' + config.testDomain;
		account1NameEncoded = account1User + '%40' + config.testDomain;

		const createRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${account1Name}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
		const acct = Array.isArray(createRes.CreateAccountResponse.account)
			? createRes.CreateAccountResponse.account[0]
			: createRes.CreateAccountResponse.account;
		assert.exists(acct.id, 'Account should have an id');

		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		const authRes = await soap.makeSOAPEnvelopeAccount(
			`<AuthRequest xmlns="urn:zimbraAccount">
				<account by="name">${account1Name}</account>
				<password>${config.accountPassword}</password>
			</AuthRequest>`, null
		);
		assert.notExists(authRes.Fault, 'Response should not be a Fault');
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
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
				</cn>
			</CreateContactRequest>`, account1Token
		);
		assert.notExists(createContactRes.Fault, 'Response should not be a Fault');
		assert.exists(createContactRes.CreateContactResponse, 'Should create contact');
	});

	// Applicable zimbra versions
	if (config.serial === true || !String(config.serverEnvironment).toUpperCase().match(/ZIMBRA101|ZIMBRAX/)) {
		return;
	}

	// Tests
	it('Sanity | Propfind operation for existing item', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '.vcf', 'Response should contain a VCF item');
	});


	it('Sanity | Propfind operation for non existing item or URL', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/NonExistent`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 404, 'PROPFIND for non-existent should return 404');
	});


	it('Sanity | Propfind operation with depth 1', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 207, 'Depth 1 PROPFIND should return 207');
		assert.include(res.text, '.vcf', 'Depth 1 should show VCF items');
	});


	it('Sanity | Propfind operation with depth 0', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 207, 'Depth 0 PROPFIND should return 207');
		assert.notInclude(res.text, '.vcf', 'Depth 0 should not show VCF items');
	});


	it('Sanity | Propfind operation with depth infinity', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: 'infinity',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(res.status, 403, 'Depth infinity PROPFIND should return 403');
	});


	it('Sanity | Simulate WebDAV copy operation', async () => {
		// Get a VCF href from Contacts
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const vcfMatch = propfindRes.text.match(/<D:href>([^<]*\.vcf)<\/D:href>/);
		assert.exists(vcfMatch, 'Should find a VCF href');
		const vcfUri = vcfMatch[1];

		// COPY to Emailed Contacts
		const port = config.clientPort || '443';
		const copyRes = await makeDavRequest({
			method: 'COPY',
			uri: vcfUri,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: {
				'Destination': `https://${account1Server}:${port}/dav/${account1NameEncoded}/Emailed%20Contacts/`,
			},
		});
		assert.equal(copyRes.status, 204, 'COPY should return 204');

		// Verify contact now in Emailed Contacts
		const verifyRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Emailed%20Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(verifyRes.status, 207, 'PROPFIND on Emailed Contacts should return 207');
		assert.include(verifyRes.text, '.vcf',
			'Emailed Contacts should contain the copied VCF');
	});


	// Windows_WebDAV_lock + lock_fail + unlock (sanity, sequential)
	it('Sanity | Simulate locking operation from OS X Finder', async () => {
		// LOCK on Briefcase
		const lockRes = await makeDavRequest({
			method: 'LOCK',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:lockinfo xmlns:D="DAV:">
				<D:lockscope><D:exclusive/></D:lockscope>
				<D:locktype><D:write/></D:locktype>
				<D:owner>
					<D:href>http://zimbra.com/tester</D:href>
				</D:owner>
			</D:lockinfo>`,
			server: account1Server,
		});
		assert.equal(lockRes.status, 200, 'LOCK should return 200');
		assert.include(lockRes.text, 'write', 'Should have write locktype');
		assert.include(lockRes.text, 'exclusive', 'Should have exclusive lockscope');
		assert.include(lockRes.text, 'http://zimbra.com/tester',
			'Owner href should match');

		// Extract lock token from locktoken/href element
		const lockTokenMatch = lockRes.text.match(/<D:locktoken>\s*<D:href>([^<]+)<\/D:href>/);
		assert.exists(lockTokenMatch, 'Should have a lock token');
		const lockToken = lockTokenMatch[1];

		// Try LOCK again - should fail with 423 Locked
		const lockFailRes = await makeDavRequest({
			method: 'LOCK',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:lockinfo xmlns:D="DAV:">
				<D:lockscope><D:exclusive/></D:lockscope>
				<D:locktype><D:write/></D:locktype>
				<D:owner>
					<D:href>http://foo.com/another</D:href>
				</D:owner>
			</D:lockinfo>`,
			server: account1Server,
		});
		assert.equal(lockFailRes.status, 423, 'Second LOCK should return 423 Locked');

		// UNLOCK
		const unlockRes = await makeDavRequest({
			method: 'UNLOCK',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: { 'Lock-Token': `<${lockToken}>` },
		});
		assert.equal(unlockRes.status, 204, 'UNLOCK should return 204');

		// Re-LOCK should now succeed
		const reLockRes = await makeDavRequest({
			method: 'LOCK',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:lockinfo xmlns:D="DAV:">
				<D:lockscope><D:exclusive/></D:lockscope>
				<D:locktype><D:write/></D:locktype>
				<D:owner>
					<D:href>http://foo.com/another</D:href>
				</D:owner>
			</D:lockinfo>`,
			server: account1Server,
		});
		assert.equal(reLockRes.status, 200, 'Re-LOCK should return 200');
		assert.include(reLockRes.text, 'write', 'Should have write locktype');
		assert.include(reLockRes.text, 'exclusive', 'Should have exclusive lockscope');
		assert.include(reLockRes.text, 'http://foo.com/another',
			'Owner href should match new owner');
	});


	it('Sanity | Simulate WebDAV move operation', async () => {
		// Create another contact to move (so we don't conflict with COPY test)
		await soap.makeSOAPEnvelopeAccount(
			`<CreateContactRequest xmlns="urn:zimbraMail">
				<cn>
					<a n="firstName">MoveTest</a>
					<a n="lastName">User</a>
					<a n="email">movetest@example.com</a>
				</cn>
			</CreateContactRequest>`, account1Token
		);

		// PROPFIND to list contacts and find a VCF href
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const vcfMatch = propfindRes.text.match(/<D:href>([^<]*\.vcf)<\/D:href>/);
		assert.exists(vcfMatch, 'Should find a VCF href');
		const vcfUri = vcfMatch[1];

		// MOVE to Emailed Contacts
		const port = config.clientPort || '443';
		const moveRes = await makeDavRequest({
			method: 'MOVE',
			uri: vcfUri,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: {
				'Destination': `https://${account1Server}:${port}/dav/${account1NameEncoded}/Emailed%20Contacts/`,
			},
		});
		assert.equal(moveRes.status, 204, 'MOVE should return 204');

		// Verify contact in Emailed Contacts
		const verifyRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Emailed%20Contacts/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<CS:getctag/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		assert.equal(verifyRes.status, 207, 'PROPFIND on Emailed Contacts should return 207');
		assert.include(verifyRes.text, '.vcf',
			'Emailed Contacts should contain the moved VCF');
	});


	it('Sanity | Simulate WebDAV mount procedure on Windows XP and Vista', async () => {
		// OPTIONS request with Microsoft User-Agent
		const optionsRes = await makeDavRequest({
			method: 'OPTIONS',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
			headers: {
				'User-Agent': 'Microsoft Data Access Internet Publishing Provider Protocol Discovery',
			},
		});
		assert.oneOf(optionsRes.status, [200, 204], 'OPTIONS should return 200 or 204');
		const msAuthorVia = optionsRes.headers.get('MS-Author-Via')
			|| optionsRes.headers.get('ms-author-via');
		assert.exists(msAuthorVia, 'MS-Author-Via header should be present');
		assert.equal(msAuthorVia, 'DAV', 'MS-Author-Via should be DAV');

		// PROPFIND on Briefcase
		const propfindRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Briefcase`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});
		assert.equal(propfindRes.status, 207, 'PROPFIND on Briefcase should return 207');
		assert.match(propfindRes.text,
			new RegExp('/dav/' + account1Name.replace('@', '(@|%40)') + '/Briefcase/'),
			'Response should contain Briefcase href');
		assert.include(propfindRes.text, 'resourcetype',
			'Response should include resourcetype');
		assert.include(propfindRes.text, 'displayname',
			'Response should include displayname');
	});
});
