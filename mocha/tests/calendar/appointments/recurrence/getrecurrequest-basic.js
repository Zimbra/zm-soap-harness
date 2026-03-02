import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Recurrence > GetRecurRequest-Basic', function () {
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

	async function createRecurAppt(token, email, subject, freq, count) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
							<recur>
								<add>
									<rule freq="${freq}">
										<interval ival="1"/>
										<count num="${count}"/>
									</rule>
								</add>
							</recur>
						</comp>
					</inv>
					<su>${subject}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, token
		);
		return res.CreateAppointmentResponse;
	}

	it('Smoke | Verify user can retrieve the recurrence definition of an appointment', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Send get recur request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetRecur not fault');
	});


	it('Sanity | Send GetMailboxVolumesRequest with blank account ID - service.INVALID_REQUEST', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'WEE', 4
		);

		// Send get recur request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetRecur weekly not fault');
	});


	it('Sanity | Send GetMailboxVolumesRequest with invalid account ID - service.INVALID_REQUEST', async () => {
		// Create account
		const acct = await makeAcct('rec');
		const s = `Subj${common.getUniqueString()}`;
		const appt = await createRecurAppt(
			acct.token, acct.email, s, 'DAI', 5
		);

		// Modify the appointment
		await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
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
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Send get recur request
		const res = await soap.makeSOAPEnvelopeAccount(
			`<GetRecurRequest xmlns="urn:zimbraMail"
				id="${appt.calItemId}"/>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'GetRecur modified not fault');
	});
});
