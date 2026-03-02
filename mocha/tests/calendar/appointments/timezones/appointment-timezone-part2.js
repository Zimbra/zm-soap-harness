import { assert } from 'chai';
import config from '../../../../conf/config.js';
import common from '../../../../framework/core/common.js';
import soap from '../../../../framework/backend/soap-client.js';
import { main } from '../../../../pages/main.js';

describe('Calendar > Appointments > Timezones > Appointment-Timezone-Part2', function () {
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

	async function createTzAppt(token, email, subject, tzId) {
		const t1 = futureTime(3600000);
		const t2 = futureTime(7200000);
		const res = await soap.makeSOAPEnvelopeAccount(
			`<CreateAppointmentRequest xmlns="urn:zimbraMail">
				<m>
					<inv>
						<comp name="${subject}" fb="B" transp="O">
							<s d="${t1}" tz="${tzId}"/>
							<e d="${t2}" tz="${tzId}"/>
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
		return res;
	}

	const tzIds = [
		'Europe/London', 'Europe/Paris',
		'Europe/Berlin', 'Europe/Rome',
		'Europe/Madrid', 'Europe/Amsterdam',
		'Europe/Brussels', 'Europe/Vienna',
		'Europe/Zurich', 'Europe/Stockholm',
		'Europe/Oslo', 'Europe/Copenhagen',
		'Europe/Helsinki', 'Europe/Warsaw',
		'Europe/Prague', 'Europe/Budapest',
		'Europe/Bucharest', 'Europe/Sofia',
		'Europe/Athens', 'Europe/Istanbul',
		'Europe/Moscow', 'Europe/Kiev',
		'Europe/Lisbon', 'Europe/Dublin',
		'Europe/Belgrade', 'Europe/Bratislava',
		'Europe/Ljubljana', 'Europe/Sarajevo',
		'Europe/Skopje', 'Europe/Zagreb',
		'Europe/Minsk', 'Europe/Vilnius',
		'Europe/Riga', 'Europe/Tallinn',
		'Europe/Kaliningrad', 'Europe/Simferopol',
		'Europe/Samara', 'Europe/Volgograd',
		'Europe/Chisinau', 'Europe/Luxembourg',
		'Europe/Malta', 'Europe/Monaco',
		'Europe/Tirane', 'Europe/Andorra',
		'Europe/Gibraltar', 'Europe/Guernsey',
		'Europe/Isle_of_Man', 'Europe/Jersey',
		'Europe/San_Marino', 'Europe/Vatican'
	];


	// Appointment-Timezone tests (50 of 149)
	tzIds.forEach((tz) => {
		it(`Sanity | TZ create - ${tz}`, async () => {
			const acct = await makeAcct('tz');
			const s = `Subj${common.getUniqueString()}`;
			const res = await createTzAppt(
				acct.token, acct.email, s, tz
			);

			// Verify response
			assert.notExists(res.Fault, `${tz} should not fault`);
		});
	});
});
