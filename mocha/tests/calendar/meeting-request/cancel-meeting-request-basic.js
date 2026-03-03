import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Cancel Meeting Request Basic', function () {
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
	it('Smoke | Cancel a meeting request to an invitee', async () => {
		// Create organizer account
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		const orgId = orgRes.CreateAccountResponse.account[0].id;
		assert.exists(orgId, 'Organizer account ID should exist');
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
		const invId = invRes.CreateAccountResponse.account[0].id;
		assert.exists(invId, 'Invitee account ID should exist');
		const invToken = await soap.getAccountAuthToken(invEmail);

		// Create appointment
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
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

		// Search for the appointment on invitee's calendar
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

		// Get invitee appointment details
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		assert.isAtLeast(invAppts.length, 1, 'Invitee should have the appointment');
		const invInvId = invAppts[0].invId;
		const invOr = invAppts[0].or.a;

		// Verify appointment details on invitee side (start/end time)
		const invMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(invMsgRes.Fault, 'GetMsgRequest should not fault');
		const invMsg = Array.isArray(invMsgRes.GetMsgResponse.m)
			? invMsgRes.GetMsgResponse.m[0] : invMsgRes.GetMsgResponse.m;
		assert.equal(invMsg.id, invInvId, 'Message ID should match');
		const invComp = invMsg.inv[0].comp[0];
		assert.exists(invComp.s, 'Start time should exist on invitee appointment');
		assert.exists(invComp.e, 'End time should exist on invitee appointment');
		const startArr = Array.isArray(invComp.s) ? invComp.s : [invComp.s];
		const endArr = Array.isArray(invComp.e) ? invComp.e : [invComp.e];
		assert.equal(startArr[0].d, t1, 'Start date should match');
		assert.equal(endArr[0].d, t2, 'End date should match');

		// Invitee accepts the meeting
		const replyRes = await soap.makeSOAPEnvelopeAccount(
			`<SendInviteReplyRequest xmlns="urn:zimbraMail"
				id="${invInvId}" compNum="0"
				verb="ACCEPT" updateOrganizer="TRUE">
				<m rt="r">
					<e t="t" a="${invOr}"/>
					<su>Accept: ${subject}</su>
					<mp ct="text/plain">
						<content>Accept: ${subject}</content>
					</mp>
				</m>
			</SendInviteReplyRequest>`, invToken
		);
		assert.notExists(replyRes.Fault, 'SendInviteReplyRequest should not fault');
		assert.exists(replyRes.SendInviteReplyResponse, 'SendInviteReplyResponse should exist');

		// Verify organizer sees accepted status (ptst=AC)
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		const compNum = comp.compNum || 0;
		const atArr = Array.isArray(comp.at) ? comp.at : [comp.at];
		const invAt = atArr.find(a => a.a === invEmail);
		assert.exists(invAt, 'Invitee should be in attendees');
		assert.equal(invAt.ptst, 'AC', 'Invitee ptst should be AC (accepted)');
		const replyArr = Array.isArray(msg.inv[0].replies.reply)
			? msg.inv[0].replies.reply : [msg.inv[0].replies.reply];
		const invReply = replyArr.find(r => r.at === invEmail);
		assert.exists(invReply, 'Invitee reply should exist');
		assert.equal(invReply.ptst, 'AC', 'Invitee reply ptst should be AC');

		// Cancel the meeting
		const cancelRes = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="${compNum}">
				<m>
					<e a="${invEmail}" t="t"/>
					<su>CANCELED: ${subject}</su>
					<mp ct="text/plain">
						<content>Content</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, orgToken
		);
		assert.notExists(cancelRes.Fault, 'CancelAppointmentRequest should not fault');
		assert.exists(cancelRes.CancelAppointmentResponse, 'CancelAppointmentResponse should exist');

		// Verify appointment is removed from organizer's calendar
		const searchOrgRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, orgToken
		);
		assert.notExists(searchOrgRes.Fault, 'SearchRequest should not fault');
		const orgApptAfterCancel = searchOrgRes.SearchResponse.appt;
		assert.notExists(orgApptAfterCancel, 'Appointment should not exist on organizer calendar after cancel');

		// Verify appointment is removed from invitee's calendar
		const searchInvRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchInvRes.Fault, 'SearchRequest should not fault');
		const invApptAfterCancel = searchInvRes.SearchResponse.appt;
		assert.notExists(invApptAfterCancel, 'Appointment should not exist on invitee calendar after cancel');
	});
});
