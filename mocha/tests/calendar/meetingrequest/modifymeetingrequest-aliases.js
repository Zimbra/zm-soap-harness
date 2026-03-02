import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > ModifyMeetingRequest-Aliases', function () {
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

	async function makeAcct(prefix) {
		const email = `${prefix}${common.getUniqueString()}@${testDomain}`;
		const res = await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const id = res.CreateAccountResponse.account[0].id;
		const token = await soap.getAccountAuthToken(email);
		return { email, id, token };
	}

	async function createMeeting(orgToken, orgEmail, inviteeEmail, subject) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject}">
							<or a="${orgEmail}"/>
							<at a="${inviteeEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${inviteeEmail}" t="t"/>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>Meeting content</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res.CreateAppointmentResponse;
	}

	it('Sanity | Modify meeting request with alias', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		const newSubject = `Mod${common.getUniqueString()}`;
		const t1 = futureTime(7200000);
		const t2 = futureTime(10800000);

		// Modify the appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${newSubject}">
							<or a="${org.email}"/>
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/>
							<e d="${t2}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${newSubject}</su>
					<mp ct="text/plain">
						<content>Modified</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not fault');
	});


	it('Sanity | Modify another meeting request', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createMeeting(
			org.token, org.email, inv.email, subject
		);

		// Modify the appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp status="CONF" fb="B" transp="O"
							allDay="0" name="${subject} updated">
							<or a="${org.email}"/>
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(10800000)}"/>
							<e d="${futureTime(14400000)}"/>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${subject} updated</su>
					<mp ct="text/plain">
						<content>Updated</content>
					</mp>
				</m>