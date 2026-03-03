import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > Meeting Request > Create Meeting Request Basic', function () {
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
	it('Smoke | Send a meeting request to an invitee 1', async () => {
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

		// Verify invitee sees the meeting
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
		assert.isAtLeast(invAppts.length, 1, 'Invitee should see the appointment');
		assert.exists(invAppts[0].invId, 'Appointment invId should exist on invitee');
	});


	it('Sanity | Send a meeting request to an invitee 2', async () => {
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

		// Invitee accepts the meeting
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
		assert.isAtLeast(invAppts.length, 1, 'Invitee should see the appointment');
		const invInvId = invAppts[0].invId;

		// Send accept reply
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
		const getMsgRes = await soap.makeSOAPEnvelopeAccount(
			`<GetMsgRequest xmlns="urn:zimbraMail">
				<m id="${appt.invId}"/>
			</GetMsgRequest>`, orgToken
		);
		assert.notExists(getMsgRes.Fault, 'GetMsgRequest should not fault');
		const msg = Array.isArray(getMsgRes.GetMsgResponse.m)
			? getMsgRes.GetMsgResponse.m[0] : getMsgRes.GetMsgResponse.m;
		assert.exists(msg.inv[0].comp[0], 'Component should exist');
	});


	it('Sanity | Send a meeting request to two invitees', async () => {
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

		// Create invitee 1
		const inv1Email = `inv1${common.getUniqueString()}@${testDomain}`;
		const inv1Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${inv1Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(inv1Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(inv1Res.CreateAccountResponse.account[0].id, 'Invitee 1 ID should exist');
		const inv1Token = await soap.getAccountAuthToken(inv1Email);

		// Create invitee 2
		const inv2Email = `inv2${common.getUniqueString()}@${testDomain}`;
		const inv2Res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${inv2Email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		assert.notExists(inv2Res.Fault, 'CreateAccountRequest should not fault');
		assert.exists(inv2Res.CreateAccountResponse.account[0].id, 'Invitee 2 ID should exist');
		const inv2Token = await soap.getAccountAuthToken(inv2Email);

		// Create appointment with two invitees
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
							<at a="${inv1Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<at a="${inv2Email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${inv1Email}" t="t"/>
					<e a="${inv2Email}" t="t"/>
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

		// Verify invitee 1 sees the meeting
		const now = Date.now();
		const search1Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, inv1Token
		);
		assert.notExists(search1Res.Fault, 'SearchRequest should not fault');
		const inv1Appts = Array.isArray(search1Res.SearchResponse.appt)
			? search1Res.SearchResponse.appt : [search1Res.SearchResponse.appt];
		assert.isAtLeast(inv1Appts.length, 1, 'Invitee 1 should see the appointment');

		// Verify invitee 2 sees the meeting
		const search2Res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}"
				types="appointment">
				<query>${subject}</query>
			</SearchRequest>`, inv2Token
		);
		assert.notExists(search2Res.Fault, 'SearchRequest should not fault');
		const inv2Appts = Array.isArray(search2Res.SearchResponse.appt)
			? search2Res.SearchResponse.appt : [search2Res.SearchResponse.appt];
		assert.isAtLeast(inv2Appts.length, 1, 'Invitee 2 should see the appointment');
	});
});
