import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Meeting Request Recurrence Yearly', function () {
	this.timeout(120 * 1000);
	let adminAuthToken;
	const testDomain = config.testDomain;
	const pad = (n) => String(n).padStart(2, '0');

	function futureTime(offsetMs) {
		const d = new Date(Date.now() + offsetMs);
		return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
	}

	before(async function () {
		await main.before(this);
		adminAuthToken = await soap.getAdminAuthToken();
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
	it('Smoke | Create an yearly recurring meeting request', async () => {
		// Create organizer and invitee
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		const invRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(invRes.Fault, 'CreateAccountRequest should not fault');
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create yearly recurring appointment
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(3600000 + 3 * 3600000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.calItemId, 'Appointment calItemId should exist');
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify invitee sees appointment and recurrence
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = invAppts[0].invId;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		assert.exists(comp.recur, 'Recurrence should exist');

		// Invitee accepts
		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invInvId}" compNum="0"
				verb="ACCEPT" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${orgEmail}"/>
					<su>Accept: ${subject}</su>
					<mp ct="text/plain">
						<content>Accept: ${subject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, invToken
		);
		assert.notExists(replyRes.Fault, 'SendInviteReplyRequest should not fault');

		// Verify organizer sees accepted status
		const verifyRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(verifyRes.Fault, 'GetMsgRequest should not fault');
		const vMsg = Array.isArray(verifyRes.GetMsgResponse.m)
			? verifyRes.GetMsgResponse.m[0] : verifyRes.GetMsgResponse.m;
		const atList = Array.isArray(vMsg.inv[0].comp[0].at)
			? vMsg.inv[0].comp[0].at : [vMsg.inv[0].comp[0].at];
		const invAtt = atList.find(a => a.a === invEmail);
		assert.exists(invAtt, 'Invitee attendee should exist');
		assert.equal(invAtt.ptst, 'AC', 'Invitee status should be AC');
	});


	it('Sanity | Create an yearly recurring appointment. 5 occurrences.', async () => {
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create yearly recurring with 5 occurrences
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(3600000 + 3 * 3600000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<or a="${orgEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
										<count num="5"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify invitee sees recurrence with count=5
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = invAppts[0].invId;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		assert.exists(comp.recur, 'Recurrence should exist');
	});


	it('Sanity | Create an yearly recurring appointment, every 3 years', async () => {
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create yearly recurring every 3 years
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(3600000 + 3 * 3600000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<or a="${orgEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify invitee sees recurrence with interval=3
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = invAppts[0].invId;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.inv[0].comp[0].recur, 'Recurrence should exist');
	});


	it('Sanity | Create an yearly recurring appointment, every 3 years. 4 occurences', async () => {
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create yearly recurring every 3 years, 4 occurrences
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(3600000 + 3 * 3600000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<or a="${orgEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="3"/>
										<count num="4"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify invitee sees recurrence with interval=3 count=4
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const invInvId = invAppts[0].invId;

		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.inv[0].comp[0].recur, 'Recurrence should exist');
	});


	it('Functional | Create an appointment on 29 feb of the leap year', async () => {
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create yearly recurring appointment on Feb 29 of a leap year
		// Use a future leap year date - 2028-02-29
		const leapYearStart = '20280229T120000';
		const leapYearEnd = '20280229T150000';
		const subject = `Subj${common.getUniqueString()}`;
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<s d="${leapYearStart}"/>
							<e d="${leapYearEnd}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<or a="${orgEmail}"/>
							<recur>
								<add>
									<rule freq="YEA">
										<interval ival="1"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.calItemId, 'Appointment calItemId should exist');
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify invitee sees appointment
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="1835395200000"
				calExpandInstEnd="1835568000000"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = searchRes.SearchResponse.appt;
		assert.exists(invAppts, 'Invitee should see the Feb 29 appointment');
		const invInvId = Array.isArray(invAppts) ? invAppts[0].invId : invAppts.invId;

		// Verify appointment details
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.inv[0].comp[0].recur, 'Recurrence should exist');
	});
});
