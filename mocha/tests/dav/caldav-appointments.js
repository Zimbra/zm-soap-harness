import { assert } from 'chai';
import config from '../../conf/config.js';
import common from '../../framework/core/common.js';
import soap from '../../framework/backend/soap-client.js';
import makeDavRequest from '../../framework/backend/dav-client.js';
import { main } from '../../pages/main.js';

describe('DAV > Caldav Appointments', function () {
	this.timeout(60 * 1000);
	let account1Name;
	let account1NameEncoded;
	let account1Token;
	let account1Server;

	before(async function () {
		await main.before(this);
		const adminAuthToken = await soap.getAdminAuthToken();

		// Create account1
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

		// Extract zimbraMailHost
		const attrs = Array.isArray(acct.a) ? acct.a : [acct.a];
		const mailHost = attrs.find(a => a.n === 'zimbraMailHost');
		account1Server = mailHost ? (mailHost._content || mailHost) : config.serverHost;

		// Auth as account1
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
	it('Sanity | Create an appointment using CalDav', async () => {
		const appointmentSubject = 'subject' + common.getUniqueString();
		const appointmentUid = common.getUniqueString();

		// PUT iCal via CalDAV
		const putRes = await makeDavRequest({
			method: 'PUT',
			uri: `/dav/${account1NameEncoded}/Calendar/${appointmentUid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			body: `BEGIN:VCALENDAR
PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN
VERSION:2.0
BEGIN:VEVENT
CREATED:20090508T191255Z
LAST-MODIFIED:20090508T191308Z
DTSTAMP:20090508T191308Z
UID:${appointmentUid}
SUMMARY:${appointmentSubject}
DTSTART:20090511T130000Z
DTEND:20090511T140000Z
LOCATION:ApptLocation
DESCRIPTION:ApptDescription
END:VEVENT
END:VCALENDAR`,
			server: account1Server,
			headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
		});

		// Verify response
		assert.equal(putRes.status, 201, 'PUT should return 201 Created');

		// Verify via SOAP SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="message, appointment">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');

		// Verify via CalDAV REPORT (calendar-multiget)
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-multiget xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>/dav/${account1Name}/Calendar/${appointmentUid}.ics</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207 Multi-Status');
		assert.include(reportRes.text, appointmentUid,
			'REPORT response should contain the appointment UID');
	});


	it('Sanity | Delete an appointment using CalDav', async () => {
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const appointmentContent = 'Content' + common.getUniqueString();

		// Create appointment via SOAP
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${appointmentContent}</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Verify response
		assert.exists(invId, 'Appointment should have invId');

		// Get the appointment UID via GetMsgRequest
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);

		// Verify response
		assert.notExists(getMsgRes.Fault, 'Response should not be a Fault');
		assert.exists(getMsgRes.GetMsgResponse, 'GetMsgResponse should exist');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const appointmentUid = comp.uid;

		// Verify response
		assert.exists(appointmentUid, 'Appointment should have a UID');

		// Verify via CalDAV REPORT
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-multiget xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>/dav/${account1Name}/Calendar/${appointmentUid}.ics</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.include(reportRes.text, appointmentUid,
			'REPORT should contain the appointment');

		// DELETE via CalDAV
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/Calendar/${appointmentUid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});

		// Verify response
		assert.equal(deleteRes.status, 204, 'DELETE should return 204 No Content');

		// Verify appointment no longer appears via SOAP SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const appt = searchRes.SearchResponse.appt;

		// Verify response
		assert.isNotOk(appt, 'Appointment should not appear in search results');
	});


	it('Sanity | Delete an appointment using CalDav - verify appointment is moved to trash', async () => {
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const appointmentContent = 'Content' + common.getUniqueString();

		// Create appointment via SOAP
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${appointmentContent}</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Get the appointment UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const appointmentUid = comp.uid;

		// Verify response
		assert.exists(appointmentUid, 'Appointment should have a UID');

		// DELETE via CalDAV
		const deleteRes = await makeDavRequest({
			method: 'DELETE',
			uri: `/dav/${account1NameEncoded}/Calendar/${appointmentUid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			server: account1Server,
		});

		// Verify response
		assert.equal(deleteRes.status, 204, 'DELETE should return 204 No Content');

		// Verify appointment not in Calendar
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${appointmentSubject}</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const appt = searchRes.SearchResponse.appt;

		// Verify response
		assert.isNotOk(appt, 'Appointment should not appear in calendar');

		// Verify appointment is in Trash
		const trashRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${appointmentSubject} in:Trash</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(trashRes.Fault, 'Response should not be a Fault');
		assert.exists(trashRes.SearchResponse, 'SearchResponse for Trash should exist');
		const trashAppt = Array.isArray(trashRes.SearchResponse.appt)
			? trashRes.SearchResponse.appt[0]
			: trashRes.SearchResponse.appt;

		// Verify response
		assert.exists(trashAppt, 'Appointment should be in Trash');
		assert.equal(trashAppt.uid, appointmentUid,
			'Trash appointment UID should match');
	});


	it('Sanity | Get an appointment using CalDav', async () => {
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const appointmentContent = 'Content' + common.getUniqueString();

		// Create appointment via SOAP
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${appointmentContent}</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Get the appointment UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const appointmentUid = comp.uid;

		// Verify response
		assert.exists(appointmentUid, 'Appointment should have a UID');

		// Get via CalDAV REPORT (calendar-multiget)
		const reportRes = await makeDavRequest({
			method: 'REPORT',
			uri: `/dav/${account1NameEncoded}/Calendar/`,
			user: account1Name,
			password: config.accountPassword,
			depth: '1',
			body: `<C:calendar-multiget xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
				<D:prop>
					<D:getetag/>
					<C:calendar-data/>
				</D:prop>
				<D:href>/dav/${account1Name}/Calendar/${appointmentUid}.ics</D:href>
			</C:calendar-multiget>`,
			server: account1Server,
		});

		// Verify response
		assert.equal(reportRes.status, 207, 'REPORT should return 207');
		assert.include(reportRes.text, appointmentUid,
			'Response should contain appointment UID in href');
		assert.include(reportRes.text, `SUMMARY:${appointmentSubject}`,
			'calendar-data should contain the appointment SUMMARY');
	});


	it('Sanity | Modify an appointment using CalDav', async () => {
		const appointmentSubject = 'Subject' + common.getUniqueString();
		const appointmentContent = 'Content' + common.getUniqueString();

		// Create appointment via SOAP
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B" transp="O" allDay="0" name="${appointmentSubject}">
							<s d="20071201T120000Z"/>
							<e d="20071201T130000Z"/>
							<or a="${account1Name}"/>
						</comp>
					</inv>
					<mp content-type="text/plain">
						<content>${appointmentContent}</content>
					</mp>
					<su>${appointmentSubject}</su>
				</m>
			</CreateAppointmentRequest>`, account1Token
		);

		// Verify response
		assert.notExists(createRes.Fault, 'Response should not be a Fault');
		assert.exists(createRes.CreateAppointmentResponse, 'Should create appointment');
		const invId = createRes.CreateAppointmentResponse.invId
			|| createRes.CreateAppointmentResponse.$.invId;

		// Get the appointment UID
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invId}"/>
			</GetMsgRequest>`, account1Token
		);
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0]
			: getMsgRes.GetMsgResponse.m;
		const inv = Array.isArray(msg.inv) ? msg.inv[0] : msg.inv;
		const comp = Array.isArray(inv.comp) ? inv.comp[0] : inv.comp;
		const appointmentUid = comp.uid;

		// Verify response
		assert.exists(appointmentUid, 'Appointment should have a UID');

		// Modify appointment - change times by PUT with new iCal
		const modifiedSubject = appointmentSubject + '-modified';
		const putRes = await makeDavRequest({
			method: 'PUT',
			uri: `/dav/${account1NameEncoded}/Calendar/${appointmentUid}.ics`,
			user: account1Name,
			password: config.accountPassword,
			body: `BEGIN:VCALENDAR
PRODID:-//Mozilla.org/NONSGML Mozilla Calendar V1.1//EN
VERSION:2.0
BEGIN:VEVENT
DTSTAMP:20090508T191308Z
UID:${appointmentUid}
SUMMARY:${modifiedSubject}
DTSTART:20071201T130000Z
DTEND:20071201T140000Z
LOCATION:ModifiedLocation
DESCRIPTION:ModifiedDescription
END:VEVENT
END:VCALENDAR`,
			server: account1Server,
			headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
		});

		// Verify response
		assert.oneOf(putRes.status, [201, 204],
			'PUT should return 201 Created or 204 No Content');

		// Verify modification via SOAP SearchRequest
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail" types="appointment">
				<query>${modifiedSubject}</query>
			</SearchRequest>`, account1Token
		);

		// Verify response
		assert.notExists(searchRes.Fault, 'Response should not be a Fault');
		assert.exists(searchRes.SearchResponse, 'SearchResponse should exist');
		const appt = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt[0]
			: searchRes.SearchResponse.appt;

		// Verify response
		assert.exists(appt, 'Modified appointment should appear in search');
		assert.equal(appt.uid, appointmentUid,
			'Appointment UID should match');
	});
});
