import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > SetAppointmentRequest > New-SetAppointmentRequest-Basic', function () {
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

	async function createAppt(token, email, subject) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}"/><e d="${t2}"/>
							<or a="${email}"/>
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

	it('Sanity | SetAppointmentRequest search', async () => {
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);

		// Send set appointment request
		await soap.makeSOAPEnvelopeAccount(
			`<SetAppointmentRequest xmlns="urn:zimbraMail"
				f="f" t="">
				<default ptst="AC">
					<m>
						<inv>
							<comp name="${subject}" fb="B"
								transp="O" status="CONF">
								<s d="${t1}"/><e d="${t2}"/>
								<or a="${acct.email}"/>
							</comp>
						</inv>
						<su>${subject}</su>
						<mp ct="text/plain">
							<content>C</content>
						</mp>
					</m>
				</default>
			</SetAppointmentRequest>`, acct.token
		);
		const now = Date.now();

		// Search item
		const res = await soap.makeSOAPEnvelopeAccount(
			`<SearchRequest xmlns="urn:zimbraMail"
				types="appointment"
				calExpandInstStart="${now - 86400000}"
				calExpandInstEnd="${now + 2 * 86400000}">
				<query>${subject}</query>
			</SearchRequest>`, acct.token
		);

		// Verify response
		assert.notExists(res.Fault, 'Search should not fault');
	});


	it('Sanity | SetAppointmentRequest modify', async () => {
		const acct = await makeAcct('sa');
		const subject = `Subj${common.getUniqueString()}`;
		const appt = await createAppt(
			acct.token, acct.email, subject
		);

		// Modify the appointment
		const modRes = await soap.makeSOAPEnvelopeAccount(
			`<ModifyAppointmentRequest xmlns="urn:zimbraMail"
				id="${appt.invId}" comp="0">
				<m>
					<inv>
						<comp name="${subject} mod" fb="B"
							transp="O">
							<s d="${futureTime(3600000)}"/>
							<e d="${futureTime(7200000)}"/>
							<or a="${acct.email}"/>
						</comp>
					</inv>
					<su>${subject} mod</su>
					<mp ct="text/plain">
						<content>Mod</content>
					</mp>
				</m>
			</ModifyAppointmentRequest>`, acct.token
		);

		// Verify response
		assert.notExists(modRes.Fault, 'Modify should not fault');
	});
});
