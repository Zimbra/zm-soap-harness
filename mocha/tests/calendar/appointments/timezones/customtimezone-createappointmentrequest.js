import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > CustomTimezone-CreateAppointmentRequest', function () {
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

	// CustomTimezone-CreateAppointmentRequest (4 tests)
	it('Smoke | Custom TZ create appt', async () => {
		const acct = await makeAcct('tz');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"
								tz="America/Los_Angeles"/>
							<e d="${t2}"
								tz="America/Los_Angeles"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Custom create not fault');
	});


	it('Sanity | Custom TZ modify appt', async () => {
		const acct = await makeAcct('tz');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}" tz="Europe/Berlin"/>
							<e d="${t2}" tz="Europe/Berlin"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);
		const invId = create.CreateAppointmentResponse.invId;

		// Modify the appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${invId}" comp="0">
				<m>
					<inv>
						<comp name="${s} mod" fb="B" transp="O">
							<s d="${futureTime(7200000)}"
								tz="Europe/Berlin"/>
							<e d="${futureTime(10800000)}"
								tz="Europe/Berlin"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Custom modify not fault');
	});


	it('Sanity | Custom TZ delete appt', async () => {
		const acct = await makeAcct('tz');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const create = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}" tz="Asia/Tokyo"/>
							<e d="${t2}" tz="Asia/Tokyo"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);
		const calId = create.CreateAppointmentResponse.calItemId;

		// Perform item action
		const res = await soap.makeSOAPEnvelopeAccount(
			`<ItemActionRequest xmlns="urn:zimbraMail">
				<action op="delete" id="${calId}"/>
			</ItemActionRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Custom delete not fault');
	});


	it('Sanity | Custom TZ recurring appt', async () => {
		const acct = await makeAcct('tz');
		const s = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Create an appointment
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${s}" fb="B" transp="O">
							<s d="${t1}"
								tz="Australia/Sydney"/>
							<e d="${t2}"
								tz="Australia/Sydney"/>
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
					<su>${s}</su>
					<mp ct="text/plain">
						<content>C</content>
					</mp>
				</m>
			</CreateAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Custom recurring not fault');
	});
