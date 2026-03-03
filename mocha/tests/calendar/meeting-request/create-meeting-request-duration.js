import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Create Meeting Request Duration', function () {
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
	it('Smoke | Create a meeting request with a specified duration', async () => {
		// Create organizer and invitee accounts
		const orgEmail = `org${common.getUniqueString()}@${testDomain}`;
		const orgRes = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${orgEmail}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(orgRes.Fault, 'CreateAccountRequest should not fault');
		const orgId = orgRes.CreateAccountResponse.account[0].id;
		assert.exists(orgId, 'Organizer ID should exist');
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

		// Create appointment with duration of 3 hours
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
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
							<dur h="3"/>
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

		// Verify duration on organizer
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		assert.exists(comp.dur, 'Duration should exist');
		assert.equal(String(comp.dur[0].h), '3', 'Duration hours should be 3');

		// Verify invitee also sees the 3-hour duration
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
		assert.exists(invInvId, 'Invitee invId should exist');

		const getInvMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getInvMsg.Fault, 'GetMsgRequest should not fault');
		const invMsg = Array.isArray(getInvMsg.GetMsgResponse.m)
			? getInvMsg.GetMsgResponse.m[0] : getInvMsg.GetMsgResponse.m;
		assert.equal(String(invMsg.inv[0].comp[0].dur[0].h), '3', 'Invitee duration hours should be 3');
	});


	it('Functional | Create a meeting request with a specified duration (days, hours, min, sec)', async () => {
		// Create organizer and invitee accounts
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

		// Create appointment with duration 1 day, 2 hours, 3 min, 4 sec
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
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
							<dur d="1" h="2" m="3" s="4"/>
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

		// Verify duration on organizer
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const dur = msg.inv[0].comp[0].dur[0];
		assert.equal(String(dur.d), '1', 'Duration days should be 1');
		assert.equal(String(dur.h), '2', 'Duration hours should be 2');
		assert.equal(String(dur.m), '3', 'Duration minutes should be 3');
		assert.equal(String(dur.s), '4', 'Duration seconds should be 4');

		// Verify invitee sees the same duration
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

		const getInvMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getInvMsg.Fault, 'GetMsgRequest should not fault');
		const invDur = (Array.isArray(getInvMsg.GetMsgResponse.m) ? getInvMsg.GetMsgResponse.m[0] : getInvMsg.GetMsgResponse.m).inv[0].comp[0].dur[0];
		assert.equal(String(invDur.d), '1', 'Invitee duration days should be 1');
		assert.equal(String(invDur.h), '2', 'Invitee duration hours should be 2');
		assert.equal(String(invDur.m), '3', 'Invitee duration minutes should be 3');
		assert.equal(String(invDur.s), '4', 'Invitee duration seconds should be 4');
	});


	it('Functional | Create a meeting request with a specified duration (2 weeks)', async () => {
		// Create organizer and invitee accounts
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

		// Create appointment with duration of 2 weeks
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
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
							<dur w="2"/>
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

		// Verify duration on organizer
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.equal(String(msg.inv[0].comp[0].dur[0].w), '2', 'Duration weeks should be 2');

		// Verify invitee sees 2-week duration
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

		const getInvMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getInvMsg.Fault, 'GetMsgRequest should not fault');
		const invMsg = Array.isArray(getInvMsg.GetMsgResponse.m)
			? getInvMsg.GetMsgResponse.m[0] : getInvMsg.GetMsgResponse.m;
		assert.equal(String(invMsg.inv[0].comp[0].dur[0].w), '2', 'Invitee duration weeks should be 2');
	});


	it('Sanity | Create a meeting request (recurring) with a specified duration', async () => {
		// Create organizer and invitee accounts
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

		// Create weekly recurring appointment with duration of 3 hours
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
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
							<dur h="3"/>
							<recur>
								<add>
									<rule freq="WEE"/>
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

		// Verify duration and recurrence on organizer
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		const comp = msg.inv[0].comp[0];
		assert.equal(String(comp.dur[0].h), '3', 'Duration hours should be 3');

		// Verify invitee sees the appointment
		const now = Date.now();
		const searchRes = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 60 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, invToken
		);
		assert.notExists(searchRes.Fault, 'SearchRequest should not fault');
		const invAppts = Array.isArray(searchRes.SearchResponse.appt)
			? searchRes.SearchResponse.appt : [searchRes.SearchResponse.appt];
		assert.isAtLeast(invAppts.length, 1, 'Invitee should see the recurring appointment');
		const invInvId = invAppts[0].invId;

		const getInvMsg = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${invInvId}"/>
			</GetMsgRequest>`, invToken
		);
		assert.notExists(getInvMsg.Fault, 'GetMsgRequest should not fault');
		const invMsg = Array.isArray(getInvMsg.GetMsgResponse.m)
			? getInvMsg.GetMsgResponse.m[0] : getInvMsg.GetMsgResponse.m;
		assert.equal(String(invMsg.inv[0].comp[0].dur[0].h), '3', 'Invitee duration hours should be 3');
	});
});
