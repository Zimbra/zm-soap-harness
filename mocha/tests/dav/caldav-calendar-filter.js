import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('CalDav > Calendar > Filter', function () {
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
		assert.exists(createRes.CreateAccountResponse, 'Should create account');
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
		assert.exists(authRes.AuthResponse, 'AuthResponse should exist');
		assert.exists(authRes.AuthResponse.authToken, 'authToken should exist');
		account1Token = Array.isArray(authRes.AuthResponse.authToken)
			? authRes.AuthResponse.authToken[0]._content || authRes.AuthResponse.authToken[0]
			: authRes.AuthResponse.authToken._content || authRes.AuthResponse.authToken;
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

	/**
	 * Helper: Create appointment and get its UID
	 */
	async function createAppointmentAndGetUid(subject, startDate, endDate, allDay) {

		// CreateAppointmentRequest
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="${allDay || '0'}" name="${subject}">
							<s d="${startDate}"/>
							<e d="${endDate}"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>Content</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// GetMsgRequest
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		return comp.uid;
	}


	it('Sanity | Verify filter by time works', async () => {
		// Create appointment on 12/1/2011
		const subject1 = 'Subject' + common.getUniqueString();
		const uid1 = await createAppointmentAndGetUid(subject1, '20111201T120000Z', '20111201T130000Z');

		// Create appointment on 12/31/2011
		const subject2 = 'Subject' + common.getUniqueString();
		const uid2 = await createAppointmentAndGetUid(subject2, '20111231T120000Z', '20111231T130000Z');

		// REPORT with time-range filter after 12/15 - only appt2 should appear
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:time-range start="20111215T120000Z"/>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.notInclude(reportRes.text, uid1,
			'Appointment before 12/15 should not appear');
		assert.include(reportRes.text, uid2,
			'Appointment after 12/15 should appear');
	});


	it('Sanity | Verify filter by time works, for VEVENT', async () => {
		// Create appointment on 12/1/2011
		const subject1 = 'Subject' + common.getUniqueString();
		const uid1 = await createAppointmentAndGetUid(subject1, '20111201T120000Z', '20111201T130000Z');

		// Create appointment on 12/31/2011
		const subject2 = 'Subject' + common.getUniqueString();
		const uid2 = await createAppointmentAndGetUid(subject2, '20111231T120000Z', '20111231T130000Z');

		// REPORT with VEVENT time-range filter after 12/15
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<D:getetag/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20111215T120000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.notInclude(reportRes.text, uid1,
			'Appointment before 12/15 should not appear');
		assert.include(reportRes.text, uid2,
			'Appointment after 12/15 should appear');
	});


	it('Sanity | Calendar-query should return events containing the given time-range', async () => {
		// Create a multi-day appointment: 11/1/2012 spanning 4 days
		const subject1 = 'Subject' + common.getUniqueString();
		const uid1 = await createAppointmentAndGetUid(
			subject1, '20121101T120000Z', '20121105T120000Z', '1'
		);

		// REPORT within 11/2 to 11/3 - appointment should appear (it spans that range)
		const reportRes1 = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<C:calendar-data>
						<C:expand start="20121102T000000Z" end="20121103T000000Z"/>
					</C:calendar-data>
					<D:getetag/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20121102T000000Z" end="20121103T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes1.status, 207, 'REPORT for 11/2-11/3 should return 207');
		assert.include(reportRes1.text, uid1,
			'Multi-day appointment should appear in 11/2-11/3 range');

		// REPORT within 12/2 to 12/3 - appointment should NOT appear
		const reportRes2 = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
				<D:prop>
					<C:calendar-data>
						<C:expand start="20121202T000000Z" end="20121203T000000Z"/>
					</C:calendar-data>
					<D:getetag/>
				</D:prop>
				<C:filter>
					<C:comp-filter name="VCALENDAR">
						<C:comp-filter name="VEVENT">
							<C:time-range start="20121202T000000Z" end="20121203T000000Z"/>
						</C:comp-filter>
					</C:comp-filter>
				</C:filter>
			</C:calendar-query>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes2.status, 207, 'REPORT for 12/2-12/3 should return 207');
		assert.notInclude(reportRes2.text, uid1,
			'Multi-day appointment should NOT appear in 12/2-12/3 range');
	});
});
