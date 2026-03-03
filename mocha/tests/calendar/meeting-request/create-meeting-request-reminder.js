import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Create Meeting Request Reminder', function () {
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
	it('Smoke | Send a meeting request with reminder to an invitee', async () => {
		// Create organizer account
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(orgRes.CreateAccountResponse.account[0].id, 'Organizer ID should exist');
		const orgToken = await soap.getAccountAuthToken(orgEmail);

		// Create invitee account
		const invEmail = `inv${common.getUniqueString()}@${testDomain}`;
		const invRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${invEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(invRes.Fault, 'CreateAccountRequest should not fault');
		assert.exists(invRes.CreateAccountResponse.account[0].id, 'Invitee ID should exist');
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create appointment with reminder
		const subject = `Subj${common.getUniqueString()}`;
		const content = `Content${common.getUniqueString()}`;
		const reminderText = 'Reminder 1';
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const createRes = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp method="REQUEST" type="event" fb="B"
							transp="O" allDay="0" name="${subject}">
							<s d="${t1}"/>
							<e d="${t2}"/>
							<or a="${orgEmail}"/>
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<alarm action="DISPLAY">
								<trigger>
									<rel related="START" neg="1" m="30"/>
								</trigger>
								<desc>${reminderText}</desc>
								<repeat count="2" m="10"/>
							</alarm>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<mp ct="text/plain">
						<content>${content}</content>
					</mp>
					<su>${subject}</su>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		assert.notExists(createRes.Fault, 'CreateAppointmentRequest should not fault');
		const appt = createRes.CreateAppointmentResponse;
		assert.exists(appt.calItemId, 'Appointment calItemId should exist');
		assert.exists(appt.invId, 'Appointment invId should exist');

		// Verify appointment details via GetMsg
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.inv[0].comp[0].s, 'Start time should exist');

		// Search appointment and verify alarm data
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, orgToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const appts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		const foundAppt = appts.find(a => a.invId === appt.invId);
		assert.exists(foundAppt, 'Appointment should be found in search');

		// Verify invitee sees the appointment
		const searchInvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchInvRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchInvRes.SearchResponse.appt)
			? searchInvRes.SearchResponse.appt : [searchInvRes.SearchResponse.appt];
		assert.isAtLeast(invAppts.length, 1, 'Invitee should see the appointment');
		const invInvId = invAppts[0].invId;

		// Invitee accepts the meeting
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
		const verifyMsg = Array.isArray(verifyRes.GetMsgResponse.m)
			? verifyRes.GetMsgResponse.m[0] : verifyRes.GetMsgResponse.m;
		const atList = Array.isArray(verifyMsg.inv[0].comp[0].at)
			? verifyMsg.inv[0].comp[0].at : [verifyMsg.inv[0].comp[0].at];
		const invAttendee = atList.find(a => a.a === invEmail);
		assert.exists(invAttendee, 'Invitee attendee should exist');
		assert.equal(invAttendee.ptst, 'AC', 'Invitee participation status should be AC');
	});
});
