import { assert } from 'chai';
import config from '../../../conf/config.js';
import common from '../../../framework/core/common.js';
import soap from '../../../framework/backend/soap-client.js';
import { main } from '../../../pages/main.js';

describe('Calendar > MeetingRequest > Replies > Recurring > SendInviteReplyRequest-RecurrenceWeekly-Exception', function () {
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
		await soap.makeSOAPEnvelopeAdmin(
			`<CreateAccountRequest xmlns="urn:zimbraAdmin">
				<name>${email}</name>
				<password>${config.accountPassword}</password>
			</CreateAccountRequest>`, adminAuthToken
		);
		const token = await soap.getAccountAuthToken(email);
		return { email, token };
	}

	async function createMeeting(orgToken, orgEmail, invEmail, subj) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subj}" fb="B" transp="O"
							status="CONF">
							<at a="${invEmail}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${orgEmail}"/>
						</comp>
					</inv>
					<e a="${invEmail}" t="t"/>
					<su>${subj}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, orgToken
		);
		return res.CreateAppointmentResponse;
	}


	it('Sanity | Recurring reply cancel', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);
		const invId = create.CreateAppointmentResponse.invId;

		// Send cancel appointment request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CancelAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<e a="${inv.email}" t="t"/>
					<su>Cancelled: ${s}</su>
					<mp ct="text/plain">
						<content>Cancelled</content>
					</mp>
				</m>
			</CancelAppointmentRequest>`, org.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Recur cancel not fault');
	});


	it('Sanity | Recurring reply modify', async () => {
		const org = await makeAcct('org');
		const inv = await makeAcct('inv');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<e a="${inv.email}" t="t"/>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, org.token
		);
		const invId = create.CreateAppointmentResponse.invId;

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<at a="${inv.email}" role="REQ"
								ptst="NE" rsvp="1"/>
							<s d="${futureTime(7200000)}"/>
							<e d="${futureTime(10800000)}"/>
							<or a="${org.email}"/>
							<recur>
								<add>
									<rule freq="DAI">
										<interval ival="1"/>
										<count num="3"/>