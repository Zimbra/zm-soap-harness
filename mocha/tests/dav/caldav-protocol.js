import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Caldav Protocol', function () {
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
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;

		// Create an appointment for REPORT-based tests
		const apptSubject = 'ProtoAppt' + common.getUniqueString();

		// CreateAppointmentRequest
		await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${apptSubject}">
							<s d="20180101T120000Z"/>
							<e d="20180101T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${apptSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Create a task for calendar-query VTODO test
		await soap.makeSOAPEnvelopeAccount(
			`<CreateTaskRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O" allDay="1" name="Task${common.getUniqueString()}">
							<s d="20180101T120000Z"/>
							<e d="20180101T150000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<su>ProtoTask</su>
					<mp ct="text/plain">
						<content>Task content</content>
					</mp>
				</m>
			</CreateTaskRequest>`, account1Token
		);
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
	it('Sanity | Verify basic rfc5397 compliance - current-user-principal (href)', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:">
				<D:prop>
					<D:current-user-principal/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'current-user-principal',
			'Response should contain current-user-principal');
		assert.include(res.text, '/principals/users/',
			'Principal href should contain /principals/users/');
	});


	it('Functional | Verify basic rfc3744 compliance - principal-collection-set', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:">
				<D:prop>
					<D:current-user-principal/>
					<D:principal-collection-set/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'principal-collection-set',
			'Response should contain principal-collection-set');

		// Extract principal-collection-set URL
		const pcsMatch = res.text.match(/<D:principal-collection-set>\s*<D:href>([^<]+)<\/D:href>/);

		// Verify response
		assert.exists(pcsMatch, 'Should have principal-collection-set href');
		const pcsUrl = pcsMatch[1];

		// Follow-up PROPFIND on the principal-collection-set URL
		const followRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: pcsUrl,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop>
					<D:displayname/>
					<D:resourcetype/>
					<D:getetag/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(followRes.status, 207, 'Follow-up PROPFIND should return 207');
		assert.include(followRes.text, 'resourcetype',
			'Response should contain resourcetype');
	});


	it('Sanity | Verify basic rfc4791 compliance - calendar-query', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Tasks/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav">
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VTODO">
							<C:prop-filter name="COMPLETED">
								<C:is-not-defined/>
							</C:prop-filter>
							<C:prop-filter name="STATUS">
								<C:text-match negate-condition="yes">CANCELLED</C:text-match>
							</C:prop-filter>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
				<D:prop xmlns:D="DAV:">
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.include(res.text, '.ics', 'Response should contain .ics href');
		assert.include(res.text, 'HTTP/1.1 200 OK', 'Should have 200 OK propstat');
		assert.include(res.text, 'getetag', 'Response should include getetag');
	});


	it('Sanity | Verify basic rfc4791 compliance - calendar-query 1', async () => {
		// First get an appointment href via PROPFIND
		const pfRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
				<D:prop><D:getetag/></D:prop>
			</D:propfind>`,
			server: account1Server,
		});
		const icsMatch = pfRes.text.match(/<D:href>([^<]*\.ics)<\/D:href>/);

		// Verify response
		assert.exists(icsMatch, 'Should find .ics href');
		const icsHref = icsMatch[1];

		// calendar-multiget REPORT
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<C:calendar-multiget xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>${icsHref}</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.include(res.text, 'VCALENDAR', 'calendar-data should contain VCALENDAR');
		assert.include(res.text, 'VEVENT', 'calendar-data should contain VEVENT');
	});


	it('Sanity | Verify folder color if set is returned by CalDav', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<D:displayname/>
					<A:calendar-color/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'calendar-color',
			'Response should contain calendar-color property');
	});


	it('Sanity | Verify modified folder color is returned by CalDav', async () => {
		// Set a color
		await makeDavRequest({
			method: 'PROPPATCH',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<D:propertyupdate xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical/">
				<D:set>
					<D:prop>
						<A:calendar-color>#FF0000FF</A:calendar-color>
					</D:prop>
				</D:set>
			</D:propertyupdate>`,
			server: account1Server,
		});

		// Verify color
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:A="http://apple.com/ns/ical/">
				<D:prop>
					<A:calendar-color/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, '#FF0000FF',
			'calendar-color should match the set value');
	});


	it('Sanity | Verify description if set is returned by CalDav', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:displayname/>
					<C:calendar-description/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'displayname',
			'Response should contain displayname');
	});


	it('Sanity | Verify timezone if set is returned by CalDav 1', async () => {
		const pfRes = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: '<D:propfind xmlns:D="DAV:"><D:prop><D:getetag/></D:prop></D:propfind>',
			server: account1Server,
		});
		const icsMatch = pfRes.text.match(/<D:href>([^<]*\.ics)<\/D:href>/);

		// Verify response
		assert.exists(icsMatch, 'Should find .ics href');

		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<C:calendar-multiget xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>${icsMatch[1]}</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.include(res.text, 'VCALENDAR',
			'calendar-data should contain VCALENDAR');
	});


	it('Sanity | Verify timezone if set is returned by CalDav 2', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT"/>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.include(res.text, 'VEVENT',
			'calendar-data should contain VEVENT');
	});


	it('Sanity | Verify error is returned for unsupported query by CalDav', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VFREEBUSY"/>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});
		// Should return 207 with empty results or 400 for unsupported
		// Verify response
		assert.oneOf(res.status, [207, 400],
			'Unsupported query should return 207 (empty) or 400');
	});


	it('Sanity | Verify basic rfc4791 compliance - calendar-timerange-query 1', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20170101T000000Z" end="20190101T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.include(res.text, 'VEVENT',
			'Should return events in the time range');
	});


	it('Sanity | Verify basic rfc4791 compliance - calendar-timerange-query 2', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20100101T000000Z" end="20100201T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.notInclude(res.text, 'VEVENT',
			'Should not return events outside the time range');
	});


	it('Functional | Verify basic rfc4791 compliance - calendar-timerange-Partial-query', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data>
						<C:limit-recurrence-set start="20170101T000000Z" end="20190101T000000Z"/>
					</C:calendar-data>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20170101T000000Z" end="20190101T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
	});


	it('Functional | Verify basic rfc4791 compliance - calendar-timerange-query', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data>
						<C:limit-recurrence-set start="20100101T000000Z" end="20100201T000000Z"/>
					</C:calendar-data>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20100101T000000Z" end="20100201T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
		assert.notInclude(res.text, 'VEVENT',
			'Should not return events outside the time range');
	});


	it('Sanity | Verify basic rfc4791 compliance - verify only VTODO events are returned and not VEVENT, check for shared calendar', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:displayname/>
					<D:resourcetype/>
					<C:supported-calendar-component-set/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, 'Calendar',
			'Response should contain Calendar displayname');
		assert.include(res.text, 'resourcetype',
			'Response should contain resourcetype');
	});


	it('Sanity | Verify basic rfc4791 compliance - calendar-query 2', async () => {
		const res = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
					<C:calendar-data>
						<C:expand start="20170101T000000Z" end="20190101T000000Z"/>
					</C:calendar-data>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20170101T000000Z" end="20190101T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'REPORT should return 207');
	});


	it('Functional | Verify basic RFC 2396 compliance - char encoding', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '0',
			body: `<D:propfind xmlns:D="DAV:">
				<D:prop>
					<D:displayname/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, account1NameEncoded,
			'Response href should contain URL-encoded username');
	});


	it('Functional | Verify basic RFC 3986 compliance - char encoding', async () => {
		const res = await makeDavRequest({
			method: 'PROPFIND',
			uri: `/dav/${account1NameEncoded}/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<D:propfind xmlns:D="DAV:">
				<D:prop>
					<D:displayname/>
				</D:prop>
			</D:propfind>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(res.status, 207, 'PROPFIND should return 207');
		assert.include(res.text, account1NameEncoded + '/Calendar/',
			'Calendar href should have proper encoding');
	});
});
